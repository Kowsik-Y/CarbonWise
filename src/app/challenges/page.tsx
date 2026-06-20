"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { Trophy, Zap, Check } from "lucide-react";
import { Challenge } from "@/types";
import { useApi } from "@/hooks/use-api";
import { ChallengeCard } from "@/features/challenges/challenge-card";

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
  const [processingCode, setProcessingCode] = useState<string | null>(null);

  const { loading: fetching, request: getChallenges } = useApi<{ challenges: Challenge[]; userChallenges: UserChallenge[] }>();
  const { request: joinChallengeRequest } = useApi<unknown>();
  const { request: completeChallengeRequest } = useApi<{ pointsAwarded: number }>();

  useEffect(() => {
    document.title = "Weekly Challenges | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    const fetchChallenges = async () => {
      try {
        const data = await getChallenges("/api/challenges");
        setChallenges(data.challenges || []);
        setUserChallenges(data.userChallenges || []);
      } catch {
        // useApi handles state logging
      }
    };

    if (user) {
      fetchChallenges();
    }
  }, [user, loading, router, getChallenges]);

  const handleJoinChallenge = async (code: string) => {
    setProcessingCode(code);
    try {
      await joinChallengeRequest("/api/challenges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challengeCode: code }),
      });

      showToast("Joined the challenge! Let's start making progress. 🌿", "success");
      
      // Refresh the challenges list
      const data = await getChallenges("/api/challenges");
      setChallenges(data.challenges || []);
      setUserChallenges(data.userChallenges || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to join challenge";
      showToast(msg, "error");
    } finally {
      setProcessingCode(null);
    }
  };

  const handleCompleteChallenge = async (enrollmentId: string, title: string) => {
    setProcessingCode(enrollmentId);
    try {
      const data = await completeChallengeRequest("/api/challenges", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: enrollmentId }),
      });

      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#34d399", "#fbbf24", "#60a5fa"],
      });

      showToast(`Challenge "${title}" completed! Unlocked +${data.pointsAwarded} XP points! 🏆`, "success");
      
      await refreshSession();
      
      // Refresh the challenges list
      const freshData = await getChallenges("/api/challenges");
      setChallenges(freshData.challenges || []);
      setUserChallenges(freshData.userChallenges || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to complete challenge";
      showToast(msg, "error");
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

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {challenges.map((challenge) => {
          // Determine status
          const enrollment = userChallenges.find((uc) => uc.challengeCode === challenge.code);
          const isJoined = enrollment?.status === "JOINED";
          const isCompleted = enrollment?.status === "COMPLETED";

          return (
            <ChallengeCard
              key={challenge.code}
              challenge={challenge}
              isJoined={isJoined}
              isCompleted={isCompleted}
              processing={processingCode === challenge.code || processingCode === enrollment?.id}
              onJoin={handleJoinChallenge}
              onComplete={handleCompleteChallenge}
              enrollmentId={enrollment?.id}
            />
          );
        })}
      </div>
    </div>
  );
}
