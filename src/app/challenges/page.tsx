"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Trophy, Leaf, Zap, Shield, Check, Plus, AlertCircle, Sparkles } from "lucide-react";
import { Challenge } from "@/types";

interface UserChallenge {
  id: string;
  challengeCode: string;
  status: "JOINED" | "COMPLETED";
}

export default function ChallengesPage() {
  const { user, refreshSession, loading, showToast } = useAuth();
  const router = useRouter();

  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [userChallenges, setUserChallenges] = useState<UserChallenge[]>([]);
  const [fetching, setFetching] = useState(true);

  const [processingCode, setProcessingCode] = useState<string | null>(null);

  useEffect(() => {
    document.title = "Weekly Challenges | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    if (user) {
      fetchChallenges();
    }
  }, [user, loading, router]);

  const fetchChallenges = async () => {
    try {
      const res = await fetch("/api/challenges");
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges || []);
        setUserChallenges(data.userChallenges || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const handleJoinChallenge = async (code: string) => {
    setProcessingCode(code);
    try {
      const res = await fetch("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeCode: code }),
      });

      if (res.ok) {
        showToast("Joined the challenge! Let's start making progress. 🌿", "success");
        await fetchChallenges();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to join challenge", "error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingCode(null);
    }
  };

  const handleCompleteChallenge = async (enrollmentId: string, title: string) => {
    setProcessingCode(enrollmentId);
    try {
      const res = await fetch("/api/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enrollmentId }),
      });

      if (res.ok) {
        const data = await res.json();
        
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#34d399", "#fbbf24", "#60a5fa"],
        });

        showToast(`Challenge "${title}" completed! Unlocked +${data.pointsAwarded} XP points! 🏆`, "success");
        
        await refreshSession();
        await fetchChallenges();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to complete challenge", "error");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setProcessingCode(null);
    }
  };

  if (loading || fetching || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  // Calculate stats
  const completedCount = userChallenges.filter((uc) => uc.status === "COMPLETED").length;
  const activeCount = userChallenges.filter((uc) => uc.status === "JOINED").length;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8 animate-fade-in">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Weekly AI Challenges</h1>
            <p className="text-sm text-gray-400">Join weekly community eco-challenges to push your reduction goals and earn XP.</p>
          </div>
        </div>

        <div className="flex gap-2 text-xs font-semibold text-gray-300">
          <div className="rounded-xl bg-white/5 border border-white/10 px-3.5 py-1.5 flex items-center gap-1.5">
            <Zap className="h-3.5 w-3.5 text-brand" />
            Joined: {activeCount}
          </div>
          <div className="rounded-xl bg-brand/10 border border-brand/20 px-3.5 py-1.5 text-brand-light flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5" />
            Completed: {completedCount}
          </div>
        </div>
      </div>

      {/* Grid: Challenges Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => {
          // Determine status
          const enrollment = userChallenges.find((uc) => uc.challengeCode === challenge.code);
          const isJoined = enrollment?.status === "JOINED";
          const isCompleted = enrollment?.status === "COMPLETED";

          return (
            <GlassCard
              key={challenge.code}
              premium={isJoined}
              className={`flex flex-col justify-between min-h-[220px] transition-all duration-300 ${
                isCompleted ? "opacity-60 border-white/5" : "border-white/10"
              }`}
            >
              <div>
                <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-widest mb-3">
                  <span className="capitalize">{challenge.category}</span>
                  <div className="flex items-center gap-1.5">
                    {challenge.code.startsWith("ai-") && (
                      <span className="flex items-center gap-0.5 text-brand font-bold uppercase tracking-wider bg-brand/10 border border-brand/20 rounded px-1.5 py-0.5 text-[9px]">
                        <Sparkles className="h-2.5 w-2.5 animate-pulse" /> AI Recommended
                      </span>
                    )}
                    <span className="capitalize text-[10px] text-gray-400 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">{challenge.difficulty} • {challenge.duration}</span>
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                  {challenge.title}
                  {isCompleted && <Check className="h-4 w-4 text-brand" />}
                </h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  {challenge.description}
                </p>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-white/5 mt-4">
                <span className="text-sm font-extrabold text-brand-light">
                  +{challenge.points} XP Points
                </span>

                {isCompleted ? (
                  <span className="text-xs text-brand font-semibold uppercase tracking-wider bg-brand/10 rounded-lg px-2.5 py-1 border border-brand/20">
                    Completed
                  </span>
                ) : isJoined ? (
                  <Button
                    size="sm"
                    disabled={processingCode === enrollment?.id}
                    onClick={() => handleCompleteChallenge(enrollment!.id, challenge.title)}
                    className="bg-brand text-background hover:bg-brand-light font-bold text-sm"
                  >
                    I Did This!
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={processingCode === challenge.code}
                    onClick={() => handleJoinChallenge(challenge.code)}
                    className="border-white/10 hover:border-brand/35 text-sm flex gap-1 items-center"
                  >
                    <Plus className="h-3.5 w-3.5" /> Join Challenge
                  </Button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}
