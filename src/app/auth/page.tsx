"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Leaf, Lock, Mail, User } from "lucide-react";
import { isFirebaseConfigured } from "@/lib/firebase";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, loginWithGoogle, user, loading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Sync mount state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync mode with search param
  useEffect(() => {
    const mode = searchParams.get("mode");
    if (mode === "signup") {
      setIsLogin(false);
      document.title = "Sign Up | CarbonWise";
    } else {
      setIsLogin(true);
      document.title = "Login | CarbonWise";
    }
  }, [searchParams]);

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFormLoading(true);

    if (!email || !password) {
      setError("Please fill in all fields.");
      setFormLoading(false);
      return;
    }

    if (!isLogin && !name) {
      setError("Name is required for signup.");
      setFormLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const res = await login(email, password);
        if (res.success) {
          // Fetch user's assessment status to see where to redirect
          const assessmentCheck = await fetch("/api/carbon/assessment");
          const assessData = await assessmentCheck.json();
          if (assessData.assessment) {
            router.push("/dashboard");
          } else {
            router.push("/assessment");
          }
        } else {
          setError(res.error || "Invalid email or password");
        }
      } else {
        const res = await signup(name, email, password);
        if (res.success) {
          router.push("/assessment");
        } else {
          setError(res.error || "Registration failed. Try a different email.");
        }
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
    } finally {
      setFormLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError("");
    setFormLoading(true);
    try {
      const res = await loginWithGoogle();
      if (res.success) {
        // Fetch user's assessment status to see where to redirect
        const assessmentCheck = await fetch("/api/carbon/assessment");
        const assessData = await assessmentCheck.json();
        if (assessData.assessment) {
          router.push("/dashboard");
        } else {
          router.push("/assessment");
        }
      } else {
        setError(res.error || "Google Sign-In failed");
      }
    } catch (err) {
      setError("An unexpected error occurred during Google Sign-In.");
    } finally {
      setFormLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      {/* Decorative Blur Backgrounds */}
      <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl -z-10" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl -z-10" />

      <GlassCard premium className="w-full max-w-md animate-fade-in relative overflow-hidden">
        {/* Glow corner */}
        <div className="absolute -top-12 -right-12 w-24 h-24 bg-brand/20 rounded-full blur-xl" />

        <div className="flex flex-col items-center mb-8">
          <div className="rounded-2xl bg-brand/10 p-3.5 text-brand mb-4 ring-1 ring-brand/20">
            <Leaf className="h-8 w-8 animate-float" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            {isLogin ? "Welcome back" : "Create an account"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            {isLogin
              ? "Sign in to track your carbon reduction"
              : "Start your journey to zero footprint"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold rounded-xl text-center">
              {error}
            </div>
          )}

          {!isLogin && (
            <Input
              label="Full Name"
              placeholder="John Doe"
              icon={<User className="h-5 w-5" />}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={formLoading}
            />
          )}

          <Input
            label="Email Address"
            type="email"
            placeholder="name@example.com"
            icon={<Mail className="h-5 w-5" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={formLoading}
          />

          <Input
            label="Password"
            type="password"
            placeholder="••••••••"
            icon={<Lock className="h-5 w-5" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={formLoading}
          />

          <Button type="submit" className="w-full mt-2" isLoading={formLoading}>
            {isLogin ? "Sign In" : "Register"}
          </Button>
        </form>

        {mounted && isFirebaseConfigured && (
          <>
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#0b0f13] px-3.5 text-gray-400 font-medium">Or continue with</span>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              disabled={formLoading}
              className="w-full flex items-center justify-center gap-3 border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-[0.98] transition-all py-3 rounded-xl font-semibold"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              Google
            </Button>
          </>
        )}

        <div className="mt-6 text-center text-sm text-gray-400">
          {isLogin ? "New to CarbonWise?" : "Already have an account?"}{" "}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError("");
            }}
            className="text-brand hover:underline font-semibold"
          >
            {isLogin ? "Create account" : "Sign in"}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    }>
      <AuthForm />
    </Suspense>
  );
}
