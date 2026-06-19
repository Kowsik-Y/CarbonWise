"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { DashboardCharts } from "@/features/dashboard/dashboard-charts";
import { getCarbonEquivalents } from "@/utils/carbon-calculator";
import { BarChart2, Leaf, Target, Award, ArrowRight, Activity, Calendar, Zap, Sparkles } from "lucide-react";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [dashboardData, setDashboardData] = useState<any>(null);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    document.title = "Dashboard | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    if (user) {
      fetchDashboardData();
    }
  }, [user, loading, router]);

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/dashboard");
      if (res.ok) {
        const data = await res.json();
        if (!data.latestAssessment) {
          router.push("/assessment"); // redirect to assess if new user
          return;
        }
        setDashboardData(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  if (loading || fetching || !dashboardData || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  const { latestAssessment, assessmentsHistory, goals, challenges, achievements } = dashboardData;
  const eq = getCarbonEquivalents(latestAssessment.annualFootprint);

  // Generate Score AI Explanation
  const total = latestAssessment.annualFootprint || 1;
  const pTrans = Math.round((latestAssessment.transportEmissions / total) * 100);
  const pEnergy = Math.round((latestAssessment.energyEmissions / total) * 100);
  const pFood = Math.round((latestAssessment.foodEmissions / total) * 100);
  const pShop = Math.round((latestAssessment.shoppingEmissions / total) * 100);
  const pWaste = Math.round((latestAssessment.wasteEmissions / total) * 100);

  const categories = [
    { name: "transportation", pct: pTrans, label: "Transportation" },
    { name: "home energy", pct: pEnergy, label: "Home Energy" },
    { name: "dietary intake", pct: pFood, label: "Diet & Food" },
    { name: "goods purchasing", pct: pShop, label: "Shopping" },
    { name: "waste disposal", pct: pWaste, label: "Waste Sorting" },
  ];
  categories.sort((a, b) => b.pct - a.pct);
  const topEmitter = categories[0];

  // Dynamic suggestion
  let suggestion = "";
  if (topEmitter.name === "transportation") {
    suggestion = `Your transportation habits account for ${pTrans}% of your emissions. Reducing car usage or commuting via public transit just 2 days a week would increase your sustainability score to ${Math.min(98, latestAssessment.carbonScore + 9)}.`;
  } else if (topEmitter.name === "home energy") {
    suggestion = `Home utility energy accounts for ${pEnergy}% of your emissions. Turning off idle appliances and lowering your thermostat by 2°F (1°C) would increase your sustainability score to ${Math.min(98, latestAssessment.carbonScore + 8)}.`;
  } else if (topEmitter.name === "dietary intake") {
    suggestion = `Dietary choices contribute ${pFood}% of your emissions. Swapping beef meals for poultry or going meatless on Mondays would increase your sustainability score to ${Math.min(98, latestAssessment.carbonScore + 7)}.`;
  } else {
    suggestion = `Product consumption and waste contribute ${pShop + pWaste}% of your emissions. Composting organic waste and opting for secondhand goods would increase your sustainability score to ${Math.min(98, latestAssessment.carbonScore + 6)}.`;
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <span className="text-xs font-semibold text-brand tracking-widest uppercase">Overview</span>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Hello, {user.name}!</h1>
          <p className="text-xs text-gray-400 mt-0.5">Welcome back to your sustainability coaching center.</p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/assessment")}
            className="flex items-center gap-2 text-xs"
          >
            <Calendar className="h-4 w-4 text-brand" /> Recalculate Footprint
          </Button>
          <Button
            size="sm"
            onClick={() => router.push("/coach")}
            className="flex items-center gap-2 text-xs"
          >
            <Sparkles className="h-4 w-4" /> Ask Coach
          </Button>
        </div>
      </div>

      {/* Top Row: Metrics Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Score Card */}
        <GlassCard premium className="relative overflow-hidden flex flex-col justify-between min-h-[170px]">
          <div className="absolute -top-12 -right-12 w-20 h-20 bg-brand/20 rounded-full blur-xl" />
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-brand-light uppercase tracking-wider">Sustainability Score</span>
            <Leaf className="h-4 w-4 text-brand" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-5xl font-black text-white">{latestAssessment.carbonScore}</span>
            <span className="text-sm text-gray-400 font-semibold">/ 100</span>
          </div>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-2 block">
            Rank: {latestAssessment.carbonScore >= 80 ? "Eco Advocate" : latestAssessment.carbonScore >= 50 ? "Sustainer" : "Carbon Collector"}
          </span>
        </GlassCard>

        {/* Total Emissions Card */}
        <GlassCard className="flex flex-col justify-between min-h-[170px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Annual Footprint</span>
            <Activity className="h-4 w-4 text-red-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-white">
              {(latestAssessment.annualFootprint / 1000).toFixed(1)}
            </span>
            <span className="text-sm text-gray-400 font-bold">tonnes CO₂e</span>
          </div>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-2 block">
            {latestAssessment.monthlyFootprint.toLocaleString()} kg CO₂e / month
          </span>
        </GlassCard>

        {/* Goals Progress Card */}
        <GlassCard className="flex flex-col justify-between min-h-[170px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Action Tracker</span>
            <Target className="h-4 w-4 text-blue-400" />
          </div>
          <div className="mt-4">
            <span className="text-4xl font-extrabold text-white">{goals.active.length}</span>
            <span className="text-xs text-gray-400 ml-2 font-medium">Active Goals</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2 relative overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full"
              style={{
                width: `${goals.completedCount + goals.active.length > 0
                  ? (goals.completedCount / (goals.completedCount + goals.active.length)) * 100
                  : 0
                  }%`,
              }}
            />
          </div>
          <span className="text-xs text-gray-500 font-semibold uppercase tracking-wide mt-2 block">
            {goals.completedCount} goals completed
          </span>
        </GlassCard>

        {/* Level & Gamification Card */}
        <GlassCard className="flex flex-col justify-between min-h-[170px]">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Eco Status</span>
            <Award className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-4xl font-extrabold text-white">Lvl {user.level}</span>
          </div>
          <div className="w-full bg-white/5 h-1 rounded-full mt-2 relative overflow-hidden">
            {/* Simple leveling bar: max 1000 XP */}
            <div
              className="h-full bg-amber-500 rounded-full"
              style={{ width: `${Math.min(100, (user.points / 1000) * 100)}%` }}
            />
          </div>
          <span className="text-xs text-brand-light font-semibold uppercase tracking-wide mt-2 block">
            {user.points} total XP points
          </span>
        </GlassCard>
      </div>

      {/* AI Score Explanation Card */}
      <GlassCard premium className="border border-brand/20 bg-brand/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-24 h-24 bg-brand/10 rounded-full blur-xl -z-10" />
        <div className="flex gap-4 items-start">
          <div className="rounded-xl bg-brand/20 p-2.5 text-brand hidden sm:block">
            <Zap className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">AI Impact Analysis</h2>
            <p className="text-sm text-gray-200 leading-relaxed mt-2 font-medium">
              {suggestion}
            </p>
          </div>
        </div>
      </GlassCard>

      {/* Visualizations (Recharts Area) */}
      <DashboardCharts assessment={latestAssessment} history={assessmentsHistory} />

      {/* Lower Grid: Goals Quicklist & Badges */}
      <div className="grid gap-6 md:grid-cols-3">
        {/* Active Goals Card */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Active Goals</h3>
                <p className="text-xs text-gray-500 font-medium">Commitments currently in progress</p>
              </div>
              <button
                onClick={() => router.push("/goals")}
                className="text-xs text-brand hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                Planner <ArrowRight className="h-3 w-3" />
              </button>
            </div>

            {goals.active.length > 0 ? (
              <div className="space-y-3 mt-4">
                {goals.active.slice(0, 3).map((goal: any) => (
                  <div
                    key={goal.id}
                    className="flex justify-between items-center rounded-xl bg-white/3 border border-white/5 p-3.5"
                  >
                    <div>
                      <span className="text-xs font-semibold text-gray-400 capitalize block">
                        {goal.category} • {goal.difficulty}
                      </span>
                      <span className="text-sm font-semibold text-white mt-1 block">
                        {goal.title}
                      </span>
                    </div>
                    <span className="text-xs font-bold text-brand block">
                      -{goal.co2Reduction} kg CO₂/yr
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-medium">
                No active goals. Head to the Simulator or Goals Planner to commit to some!
              </div>
            )}
          </div>
        </div>

        {/* Achievements / Badges Panel */}
        <div className="rounded-2xl border border-white/10 bg-white/2 p-6 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="text-sm font-bold text-white">Achievements</h3>
                <p className="text-xs text-gray-500 font-medium">Trophies earned for footprint reduction</p>
              </div>
            </div>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-4 gap-3 mt-4">
                {achievements.slice(0, 8).map((badge: any) => (
                  <div
                    key={badge.id}
                    title={`${badge.title}: ${badge.description}`}
                    className="flex flex-col items-center justify-center p-2 rounded-xl bg-brand/5 border border-brand/10 aspect-square group relative"
                  >
                    <Award className="h-6 w-6 text-brand" />
                    <span className="absolute bottom-[-24px] hidden group-hover:block bg-[#090d10] border border-white/10 rounded px-2 py-1 text-xs text-white z-50 whitespace-nowrap">
                      {badge.title}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-xs text-gray-500 font-medium">
                Complete your first assessment to unlock your first trophy!
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
