"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Leaf, Lock, Mail, User } from "lucide-react";

function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup, user, loading } = useAuth();

  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [formLoading, setFormLoading] = useState(false);

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
