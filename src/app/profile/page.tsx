"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { User as UserIcon, Award, RotateCcw, ShieldCheck, Mail, Settings } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

import { useApi } from "@/hooks/use-api";
import { PageLoader } from "@/components/ui/page-loader";

export default function ProfilePage() {
  const { user, logout, refreshSession, loading, showToast } = useAuth();
  const router = useRouter();

  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [showResetDialog, setShowResetDialog] = useState(false);

  const { loading: fetching, request: getDashboard } = useApi<{ achievements: Achievement[] }>();
  const { loading: resetting, request: deleteAssessment } = useApi<unknown>();

  useEffect(() => {
    document.title = "Your Profile | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    const fetchProfileData = async () => {
      try {
        const data = await getDashboard("/api/dashboard");
        setAchievements(data.achievements || []);
      } catch {
        // useApi handles state logging
      }
    };

    if (user) {
      fetchProfileData();
    }
  }, [user, loading, router, getDashboard]);

  const handleResetAssessment = async () => {
    setShowResetDialog(false);
    try {
      await deleteAssessment("/api/carbon/assessment", {
        method: "DELETE",
      });
      showToast("Assessment history reset successfully. Let's recalculate your footprint!", "success");
      await refreshSession();
      router.push("/assessment");
    } catch {
      router.push("/assessment");
    }
  };

  if (loading || fetching || !user) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="flex items-center gap-3">
        <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
          <UserIcon className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">Your Profile</h1>
          <p className="text-xs text-gray-400">View your level progression, unlocked badges, and settings.</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left Column: Stats Details */}
        <div className="md:col-span-1 space-y-6">
          <GlassCard premium className="text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-20 h-20 bg-brand/10 rounded-full blur-xl" />

            <div className="rounded-full bg-brand/10 border border-brand/20 p-5 inline-flex mb-4 text-brand">
              <UserIcon className="h-12 w-12" />
            </div>

            <h2 className="text-lg font-bold text-white">{user.name}</h2>
            <p className="text-xs text-gray-400 flex items-center justify-center gap-1.5 mt-1">
              <Mail className="h-3.5 w-3.5" /> {user.email}
            </p>

            <div className="grid grid-cols-2 gap-4 mt-6 pt-6 border-t border-white/5">
              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Rank Level</span>
                <span className="text-2xl font-black text-white mt-1 block">Lvl {user.level}</span>
              </div>
              <div>
                <span className="text-xs text-gray-500 block uppercase font-medium">Total XP</span>
                <span className="text-2xl font-black text-brand mt-1 block">{user.points} XP</span>
              </div>
            </div>

            <button
              onClick={logout}
              className="mt-8 w-full text-center py-2.5 rounded-xl border border-white/10 hover:border-red-500/20 text-xs text-gray-300 hover:text-red-400 hover:bg-red-500/5 transition-all font-semibold cursor-pointer"
            >
              Sign Out Account
            </button>
          </GlassCard>

          {/* Quick Settings Panel */}
          <GlassCard className="space-y-4">
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider border-b border-white/5 pb-2">
              <Settings className="h-4.5 w-4.5" />
              <span>Options</span>
            </div>

            <div className="space-y-3">
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowResetDialog(true)}
                disabled={resetting}
                className="w-full flex gap-2 items-center justify-center text-xs transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> Reset Assessment
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Right Columns: Achievements Badges */}
        <div className="md:col-span-2 space-y-6">
          <GlassCard className="space-y-6 min-h-[400px] flex flex-col justify-between">
            <div>
              <h2 className="text-base font-bold text-white border-b border-white/5 pb-3 flex items-center gap-2">
                <Award className="h-5 w-5 text-brand" /> Unlocked Achievements
              </h2>

              {achievements.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 mt-4">
                  {achievements.map((badge) => (
                    <div
                      key={badge.id}
                      className="rounded-xl border border-white/5 bg-white/2 p-4 flex gap-4 items-start"
                    >
                      <div className="rounded-xl bg-brand/10 p-2.5 text-brand border border-brand/20">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white">{badge.title}</h3>
                        <p className="text-xs text-gray-400 mt-0.5 leading-normal">{badge.description}</p>
                        <span className="text-xs text-gray-500 mt-2 block font-medium">
                          Unlocked: {new Date(badge.unlockedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-20 text-center text-xs text-gray-500 font-medium">
                  No achievement trophies unlocked yet. Keep reducing your emissions!
                </div>
              )}
            </div>

            <div className="rounded-xl bg-brand/5 border border-brand/15 p-4 flex gap-3 text-xs leading-relaxed text-gray-300">
              <ShieldCheck className="h-5 w-5 text-brand shrink-0" />
              <span>
                Earn XP points by completing weekly challenges or goals. Levels unlock automatically at **200 XP** (Level 2), **500 XP** (Level 3), and **1000 XP** (Level 4).
              </span>
            </div>
          </GlassCard>
        </div>
      </div>

      <Dialog
        isOpen={showResetDialog}
        onClose={() => setShowResetDialog(false)}
        title="Reset Footprint History"
        description="Are you sure you want to reset your footprint history? This will delete your current carbon assessment record and cannot be undone."
        confirmText="Yes, Reset"
        cancelText="Cancel"
        onConfirm={handleResetAssessment}
        variant="warning"
      />
    </div>
  );
}
