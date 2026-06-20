"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Target, Check, CheckCircle2, Sparkles } from "lucide-react";
import { PageLoader } from "@/components/ui/page-loader";
import { Goal, AIRecommendation } from "@/types";
import { useApi } from "@/hooks/use-api";
import { RecommendationCard } from "@/features/goals/recommendation-card";

export default function GoalsPage() {
  const { user, refreshSession, loading, showToast } = useAuth();
  const router = useRouter();

  const [activeGoals, setActiveGoals] = useState<Goal[]>([]);
  const [completedGoals, setCompletedGoals] = useState<Goal[]>([]);
  const [recommendedActions, setRecommendedActions] = useState<AIRecommendation[]>([]);

  const [addingId, setAddingId] = useState<string | null>(null);
  const [completingId, setCompletingId] = useState<string | null>(null);

  const { loading: fetching, request: getGoals } = useApi<{ goals: Goal[] }>();
  const { loading: loadingRecommendations, request: getRecommendations } = useApi<{ recommendations: AIRecommendation[] }>();
  const { request: postGoal } = useApi<unknown>();
  const { request: patchGoal } = useApi<{ pointsAwarded: number }>();

  useEffect(() => {
    document.title = "Action Planner | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    const fetchGoals = async () => {
      try {
        const data = await getGoals("/api/goals");
        const list: Goal[] = data.goals || [];
        setActiveGoals(list.filter((g) => g.status === "ACTIVE"));
        setCompletedGoals(list.filter((g) => g.status === "COMPLETED"));
      } catch {
        // useApi handles state logging
      }
    };

    const fetchRecommendations = async () => {
      try {
        const data = await getRecommendations("/api/goals/recommend");
        setRecommendedActions(data.recommendations || []);
      } catch {
        // useApi handles state logging
      }
    };

    if (user) {
      fetchGoals();
      fetchRecommendations();
    }
  }, [user, loading, router, getGoals, getRecommendations]);

  const handleAddGoal = async (title: string, category: string, co2Reduction: number, difficulty: string) => {
    setAddingId(title);
    try {
      await postGoal("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, category, co2Reduction, difficulty }),
      });

      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 30,
        spread: 30,
        colors: ["#10b981", "#3b82f6"],
      });

      // Refresh goals list
      const data = await getGoals("/api/goals");
      const list: Goal[] = data.goals || [];
      setActiveGoals(list.filter((g) => g.status === "ACTIVE"));
      setCompletedGoals(list.filter((g) => g.status === "COMPLETED"));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add goal";
      showToast(msg, "error");
    } finally {
      setAddingId(null);
    }
  };

  const handleCompleteGoal = async (id: string) => {
    setCompletingId(id);
    try {
      const data = await patchGoal("/api/goals", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "COMPLETED" }),
      });

      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 100,
        spread: 60,
        origin: { y: 0.7 },
        colors: ["#10b981", "#fbbf24", "#60a5fa"],
      });

      showToast(`Goal completed! +${data.pointsAwarded} XP points awarded! 🌟`, "success");

      await refreshSession();

      // Refresh goals list
      const freshData = await getGoals("/api/goals");
      const list: Goal[] = freshData.goals || [];
      setActiveGoals(list.filter((g) => g.status === "ACTIVE"));
      setCompletedGoals(list.filter((g) => g.status === "COMPLETED"));
    } catch {
      // useApi handles state logging
    } finally {
      setCompletingId(null);
    }
  };

  // Compute total carbon reduced
  const totalCarbonReduced = completedGoals.reduce((sum, g) => sum + g.co2Reduction, 0);

  if (loading || fetching || !user) {
    return <PageLoader />;
  }

  // Filter recommendations to avoid showing already active ones
  const filteredRecommendations = recommendedActions.filter(
    (rec) => !activeGoals.some((g) => g.title === rec.title) && !completedGoals.some((g) => g.title === rec.title)
  );

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8 animate-fade-in">
      {/* Top title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
            <Target className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white font-sans">Action Planner</h1>
            <p className="text-xs text-gray-400">Commit to carbon reduction tasks and track your accomplishments.</p>
          </div>
        </div>

        {totalCarbonReduced > 0 && (
          <div className="flex items-center gap-2 rounded-xl bg-brand/10 border border-brand/20 px-3.5 py-1.5 text-xs font-semibold text-brand-light">
            <Sparkles className="h-3.5 w-3.5" />
            Emissions Reduced: {totalCarbonReduced.toLocaleString()} kg CO₂/yr
          </div>
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Active Goals & History */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Goals Checklist */}
          <GlassCard className="space-y-6">
            <h2 className="text-base font-bold text-white border-b border-white/5 pb-3">Active Commitments</h2>

            {activeGoals.length > 0 ? (
              <div className="space-y-3">
                {activeGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex justify-between items-center rounded-xl bg-white/3 border border-white/5 p-4 hover:border-white/10 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-brand uppercase tracking-wider">
                          {goal.category}
                        </span>
                        <span className="text-gray-600 text-xs">•</span>
                        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          {goal.difficulty}
                        </span>
                      </div>
                      <span className="text-sm font-semibold text-white mt-1.5 block">
                        {goal.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className="text-xs font-bold text-brand block">
                        -{goal.co2Reduction} kg CO₂
                      </span>
                      <button
                        onClick={() => handleCompleteGoal(goal.id)}
                        disabled={completingId === goal.id}
                        className="rounded-lg p-2 bg-brand text-background hover:bg-brand-light font-bold active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                        title="Mark as Completed"
                      >
                        <Check className="h-4.5 w-4.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-gray-500 font-medium leading-relaxed">
                You have no active goals in your planner.
                <br />
                Browse the recommended actions on the right to commit to some!
              </div>
            )}
          </GlassCard>

          {/* Completed Goals History */}
          {completedGoals.length > 0 && (
            <GlassCard className="space-y-4">
              <h2 className="text-sm font-bold text-white border-b border-white/5 pb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-brand" /> Completed Actions
              </h2>

              <div className="space-y-2">
                {completedGoals.map((goal) => (
                  <div
                    key={goal.id}
                    className="flex justify-between items-center rounded-xl bg-white/2 border border-white/5 px-4 py-3 opacity-60 hover:opacity-100 transition-opacity"
                  >
                    <div>
                      <span className="text-xs text-gray-500 tracking-wider font-semibold capitalize">
                        {goal.category}
                      </span>
                      <span className="text-xs text-gray-300 font-medium block mt-0.5 line-through">
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-gray-400">
                      -{goal.co2Reduction} kg CO₂/yr
                    </span>
                  </div>
                ))}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right 1 Column: Recommendations Catalog */}
        <div className="space-y-6">
          <GlassCard premium className="space-y-4">
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider border-b border-white/10 pb-2">
              <Sparkles className="h-4.5 w-4.5 animate-pulse" />
              <span>AI Recommended Actions</span>
            </div>

            {loadingRecommendations ? (
              <div className="space-y-3">
                <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
                <div className="h-16 bg-white/5 rounded-xl animate-pulse" />
              </div>
            ) : filteredRecommendations.length > 0 ? (
              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1 no-scrollbar">
                {filteredRecommendations.map((action, index) => (
                  <RecommendationCard
                    key={index}
                    action={action}
                    adding={addingId === action.title}
                    onAdd={handleAddGoal}
                  />
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-medium">
                You have activated all recommended actions! What a champion!
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
