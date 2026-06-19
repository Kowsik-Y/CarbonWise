"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { User } from "@/types";
import { auth, isFirebaseConfigured } from "@/lib/firebase";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from "firebase/auth";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  loginWithGoogle: () => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState<Array<{ id: string; message: string; type: "success" | "error" | "info" }>>([]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  };

  const refreshSession = async () => {
    try {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch (err) {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFirebaseConfigured && auth) {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser) {
          // Trigger session refresh to sync HttpOnly cookie if auth status changed
          await refreshSession();
        } else {
          setUser(null);
          setLoading(false);
        }
      });
      return () => unsubscribe();
    } else {
      refreshSession();
    }

    // Register Service Worker for Progressive Web App (PWA) support
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("Service Worker registered with scope:", reg.scope))
          .catch((err) => console.error("Service Worker registration failed:", err));
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        const idToken = await firebaseUser.getIdToken();

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, email }),
        });

        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          return { success: true };
        }
        return { success: false, error: data.error || "Login validation failed" };
      } catch (err: any) {
        return { success: false, error: err.message || "Firebase Login failed" };
      }
    }

    // Fallback to local custom Auth route
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || "Login failed" };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const signup = async (name: string, email: string, password: string) => {
    if (isFirebaseConfigured && auth) {
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const firebaseUser = userCredential.user;
        await updateProfile(firebaseUser, { displayName: name });
        const idToken = await firebaseUser.getIdToken();

        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, name, email }),
        });

        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          return { success: true };
        }
        return { success: false, error: data.error || "Signup validation failed" };
      } catch (err: any) {
        return { success: false, error: err.message || "Firebase Signup failed" };
      }
    }

    // Fallback to local custom Auth route
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        return { success: true };
      }
      return { success: false, error: data.error || "Signup failed" };
    } catch (err) {
      return { success: false, error: "An unexpected error occurred" };
    }
  };

  const logout = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        await signOut(auth);
      } catch (err) {
        console.error("Firebase signOut failed", err);
      }
    }
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
    } catch (err) {
      console.error("Logout failed", err);
    }
  };

  const loginWithGoogle = async () => {
    if (isFirebaseConfigured && auth) {
      try {
        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({ prompt: "select_account" });
        const userCredential = await signInWithPopup(auth, provider);
        const firebaseUser = userCredential.user;
        const idToken = await firebaseUser.getIdToken();

        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken, email: firebaseUser.email }),
        });

        const data = await res.json();
        if (res.ok) {
          setUser(data.user);
          return { success: true };
        }
        return { success: false, error: data.error || "Login validation failed" };
      } catch (err: any) {
        if (err.code === "auth/popup-closed-by-user") {
          return { success: false, error: "Sign-in cancelled by user." };
        }
        return { success: false, error: err.message || "Google Sign-In failed" };
      }
    }
    return { success: false, error: "Firebase is not configured." };
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        loginWithGoogle,
        logout,
        refreshSession,
        showToast,
      }}
    >
      {children}

      {/* Floating Toast Notification Stack */}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`p-4 rounded-xl shadow-lg border backdrop-blur-md flex items-center justify-between gap-3 transition-all duration-300 pointer-events-auto animate-[slide-in_0.3s_ease-out] ${
              toast.type === "success"
                ? "bg-brand/10 border-brand/20 text-brand-light"
                : toast.type === "error"
                ? "bg-red-500/10 border-red-500/20 text-red-400"
                : "bg-blue-500/10 border-blue-500/20 text-blue-400"
            }`}
          >
            <span className="flex-1 text-sm font-semibold">{toast.message}</span>
            <button
              onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
              className="text-xs opacity-50 hover:opacity-100 font-bold px-1.5 py-0.5 cursor-pointer"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
