"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { calculateCarbonFootprint, getCarbonEquivalents } from "@/utils/carbon-calculator";
import { Sliders, Leaf, Check, Plus, AlertCircle, Compass, Sparkles } from "lucide-react";
import { CarbonAssessment, SimulatorOptimization } from "@/types";
import { useApi } from "@/hooks/use-api";

export default function SimulatorPage() {
  const { user, loading, showToast } = useAuth();
  const router = useRouter();

  const [hasAssessment, setHasAssessment] = useState(false);
  const [originalAssessment, setOriginalAssessment] = useState<CarbonAssessment | null>(null);

  // Simulated State
  const [simTransportKm, setSimTransportKm] = useState(25);
  const [simTransportType, setSimTransportType] = useState("car_petrol");
  const [simElectricityBill, setSimElectricityBill] = useState(80);
  const [simFoodHabits, setSimFoodHabits] = useState("low_meat");
  const [simShoppingHabits, setSimShoppingHabits] = useState("average");
  const [simWasteHabits, setSimWasteHabits] = useState("recycle_some");

  // Goal adding feedback & AI suggestions
  const [addingGoal, setAddingGoal] = useState<string | null>(null);

  const { loading: fetching, request: getAssessment } = useApi<{ assessment: CarbonAssessment | null }>();
  const { loading: loadingAiSuggestion, request: getAiSuggestion } = useApi<{ recommendation: SimulatorOptimization }>();
  const { request: addGoalRequest } = useApi<unknown>();

  useEffect(() => {
    document.title = "Carbon Simulator | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    const fetchLatestAssessment = async () => {
      try {
        const data = await getAssessment("/api/carbon/assessment");
        if (data.assessment) {
          const ass = data.assessment;
          setOriginalAssessment(ass);
          setHasAssessment(true);
  
          // Initialize simulator with actual assessment values
          setSimTransportKm(ass.transportKm);
          setSimTransportType(ass.transportType);
          setSimElectricityBill(ass.electricityBill);
          setSimFoodHabits(ass.foodHabits);
          setSimShoppingHabits(ass.shoppingHabits);
          setSimWasteHabits(ass.wasteHabits);
        } else {
          setHasAssessment(false);
        }
      } catch {
        // useApi handles state logging
      }
    };

    if (user) {
      fetchLatestAssessment();
    }
  }, [user, loading, router, getAssessment]);

  const handleAiSuggest = async () => {
    try {
      const data = await getAiSuggestion("/api/simulator/recommend");
      const { recommendation } = data;
      if (recommendation) {
        if (typeof recommendation.targetTransportKm === "number") setSimTransportKm(recommendation.targetTransportKm);
        if (recommendation.targetTransportType) setSimTransportType(recommendation.targetTransportType);
        if (typeof recommendation.targetElectricityBill === "number") setSimElectricityBill(recommendation.targetElectricityBill);
        if (recommendation.targetFoodHabits) setSimFoodHabits(recommendation.targetFoodHabits);
        if (recommendation.targetShoppingHabits) setSimShoppingHabits(recommendation.targetShoppingHabits);
        if (recommendation.targetWasteHabits) setSimWasteHabits(recommendation.targetWasteHabits);

        showToast("AI optimized simulation variables to suggest the highest impact lifestyle reduction! 🌟", "success");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load AI suggestions";
      showToast(msg, "error");
    }
  };

  if (loading || fetching || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  if (!hasAssessment || !originalAssessment) {
    return (
      <div className="flex-1 grow flex items-center justify-center p-4 max-w-md mx-auto text-center">
        <GlassCard premium className="space-y-6">
          <AlertCircle className="h-12 w-12 text-brand mx-auto animate-bounce" />
          <h2 className="text-xl font-bold text-white">No Assessment Found</h2>
          <p className="text-gray-400 text-sm">
            You need to complete your initial Carbon Assessment before you can simulate lifestyle modifications.
          </p>
          <Button
            onClick={() => router.push("/assessment")}
            className="w-full flex gap-2 items-center justify-center"
          >
            <Compass className="h-4 w-4" /> Start Assessment
          </Button>
        </GlassCard>
      </div>
    );
  }

  // Calculate current simulated outcome
  const simulated = calculateCarbonFootprint({
    transportKm: simTransportKm,
    transportType: simTransportType,
    electricityBill: simElectricityBill,
    electricityKwh: 0, // estimate from bill in simulator
    foodHabits: simFoodHabits,
    shoppingHabits: simShoppingHabits,
    wasteHabits: simWasteHabits,
  });

  const originalAnnual = originalAssessment.annualFootprint;
  const simulatedAnnual = simulated.annualFootprint;
  const co2Reduction = Math.max(0, originalAnnual - simulatedAnnual);
  const pctReduction = Math.round((co2Reduction / (originalAnnual || 1)) * 100);
  const eq = getCarbonEquivalents(co2Reduction);

  const addSimulatedGoal = async (category: "transport" | "energy" | "food" | "shopping" | "waste", title: string, saving: number, difficulty: "easy" | "medium" | "hard") => {
    if (saving <= 0) return;
    setAddingGoal(category);

    try {
      await addGoalRequest("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          category,
          co2Reduction: Math.round(saving),
          difficulty,
        }),
      });

      const confetti = (await import("canvas-confetti")).default;
      confetti({
        particleCount: 40,
        spread: 40,
        colors: ["#10b981", "#3b82f6"],
      });
      showToast("Goal added to your dashboard! 🚀", "success");
      setTimeout(() => setAddingGoal(null), 2000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to add goal";
      showToast(msg, "error");
      setAddingGoal(null);
    }
  };

  // Determine sub-savings for buttons
  const origTrans = originalAssessment.transportEmissions;
  const simTrans = simulated.transportEmissions;
  const transSavings = Math.max(0, origTrans - simTrans);

  const origEnergy = originalAssessment.energyEmissions;
  const simEnergy = simulated.energyEmissions;
  const energySavings = Math.max(0, origEnergy - simEnergy);

  const origFood = originalAssessment.foodEmissions;
  const simFood = simulated.foodEmissions;
  const foodSavings = Math.max(0, origFood - simFood);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
          <Sliders className="h-6 w-6" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">Carbon Reduction Simulator</h1>
          <p className="text-sm text-gray-400">Modify inputs to project savings before adjusting your lifestyle.</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Left 2 Columns: Controls */}
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3 gap-2">
              <h2 className="text-base font-bold text-white">Simulate Lifestyle Choices</h2>
              <Button
                onClick={handleAiSuggest}
                isLoading={loadingAiSuggestion}
                size="sm"
                variant="outline"
                className="flex items-center gap-1.5 text-xs border-brand/20 hover:border-brand/40 text-brand py-1 px-3 font-semibold"
              >
                <Sparkles className="h-3.5 w-3.5" /> AI Suggest Plan
              </Button>
            </div>

            {/* Commute */}
            <div className="space-y-4">
              <h3 className="text-xs font-semibold text-brand tracking-wider uppercase">1. Transportation</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <div className="flex justify-between text-sm mb-2 text-gray-300">
                    <label htmlFor="sim-commute">Daily Commute Distance</label>
                    <span className="text-brand font-semibold">{simTransportKm} km</span>
                  </div>
                  <input
                    id="sim-commute"
                    type="range"
                    min="0"
                    max="200"
                    step="5"
                    value={simTransportKm}
                    onChange={(e) => setSimTransportKm(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>
                <Select
                  id="sim-transport-type"
                  label="Commute Vehicle Type"
                  value={simTransportType}
                  onChange={(e) => setSimTransportType(e.target.value)}
                  options={[
                    { value: "car_petrol", label: "Petrol Car (Standard)" },
                    { value: "car_diesel", label: "Diesel Car" },
                    { value: "car_electric", label: "Electric Vehicle (EV)" },
                    { value: "public_transit", label: "Public Transit" },
                    { value: "none", label: "Active Commute (Walk/Bike)" },
                  ]}
                />
              </div>
            </div>

            {/* Energy */}
            <div className="space-y-4 pt-4 border-t border-white/5">
              <h3 className="text-xs font-semibold text-brand tracking-wider uppercase">2. Home Energy</h3>
              <div>
                <div className="flex justify-between text-sm mb-2 text-gray-300">
                  <label htmlFor="sim-energy-bill">Estimated Monthly Energy Bill</label>
                  <span className="text-brand font-semibold">${simElectricityBill}</span>
                </div>
                <input
                  id="sim-energy-bill"
                  type="range"
                  min="0"
                  max="400"
                  step="10"
                  value={simElectricityBill}
                  onChange={(e) => setSimElectricityBill(Number(e.target.value))}
                  className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                />
              </div>
            </div>

            {/* Diet & Waste */}
            <div className="grid gap-6 sm:grid-cols-3 pt-4 border-t border-white/5">
              <div className="sm:col-span-1">
                <Select
                  id="sim-food-habits"
                  label="Diet Category"
                  value={simFoodHabits}
                  onChange={(e) => setSimFoodHabits(e.target.value)}
                  options={[
                    { value: "high_meat", label: "High Meat" },
                    { value: "low_meat", label: "Low Meat / Chicken" },
                    { value: "vegetarian", label: "Vegetarian" },
                    { value: "vegan", label: "Vegan" },
                  ]}
                />
              </div>
              <div className="sm:col-span-1">
                <Select
                  id="sim-shopping-habits"
                  label="Shopping Habits"
                  value={simShoppingHabits}
                  onChange={(e) => setSimShoppingHabits(e.target.value)}
                  options={[
                    { value: "minimal", label: "Minimalist" },
                    { value: "average", label: "Average Consumer" },
                    { value: "heavy", label: "Heavy Shopper" },
                  ]}
                />
              </div>
              <div className="sm:col-span-1">
                <Select
                  id="sim-waste-habits"
                  label="Recycling Sorting"
                  value={simWasteHabits}
                  onChange={(e) => setSimWasteHabits(e.target.value)}
                  options={[
                    { value: "recycle_all", label: "Recycle & Compost" },
                    { value: "recycle_some", label: "Recycle Some" },
                    { value: "no_recycling", label: "None sorting" },
                  ]}
                />
              </div>
            </div>
          </GlassCard>

          {/* Quick Action Goals */}
          {co2Reduction > 0 && (
            <GlassCard className="space-y-4">
              <h3 className="text-sm font-bold text-white">Convert Simulation to Active Goals</h3>
              <p className="text-xs text-gray-400 leading-normal">
                Commit to these changes by adding them as direct tasks in your Action Planner:
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {transSavings > 0 && (
                  <button
                    disabled={addingGoal === "transport"}
                    onClick={() => addSimulatedGoal(
                      "transport",
                      `Commute ${simTransportKm}km daily via public transit/active transit`,
                      transSavings,
                      "medium"
                    )}
                    className="flex flex-col items-center justify-between text-center p-3 rounded-xl border border-white/10 hover:border-brand/40 bg-white/2 hover:bg-brand/5 text-xs text-gray-300 font-semibold cursor-pointer transition-all"
                  >
                    <span>Transit Shift</span>
                    <span className="text-brand font-bold text-sm block mt-1">-{Math.round(transSavings)} kg CO₂</span>
                    <span className="flex items-center gap-1 text-xs text-brand-light mt-2">
                      {addingGoal === "transport" ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {addingGoal === "transport" ? "Added" : "Add Goal"}
                    </span>
                  </button>
                )}

                {energySavings > 0 && (
                  <button
                    disabled={addingGoal === "energy"}
                    onClick={() => addSimulatedGoal(
                      "energy",
                      `Reduce monthly energy usage down to $${simElectricityBill}`,
                      energySavings,
                      "easy"
                    )}
                    className="flex flex-col items-center justify-between text-center p-3 rounded-xl border border-white/10 hover:border-brand/40 bg-white/2 hover:bg-brand/5 text-xs text-gray-300 font-semibold cursor-pointer transition-all"
                  >
                    <span>Cut Electricity</span>
                    <span className="text-brand font-bold text-sm block mt-1">-{Math.round(energySavings)} kg CO₂</span>
                    <span className="flex items-center gap-1 text-xs text-brand-light mt-2">
                      {addingGoal === "energy" ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {addingGoal === "energy" ? "Added" : "Add Goal"}
                    </span>
                  </button>
                )}

                {foodSavings > 0 && (
                  <button
                    disabled={addingGoal === "food"}
                    onClick={() => addSimulatedGoal(
                      "food",
                      `Shift diet description profile to ${simFoodHabits.replace("_", " ")}`,
                      foodSavings,
                      "medium"
                    )}
                    className="flex flex-col items-center justify-between text-center p-3 rounded-xl border border-white/10 hover:border-brand/40 bg-white/2 hover:bg-brand/5 text-xs text-gray-300 font-semibold cursor-pointer transition-all"
                  >
                    <span>Change Diet</span>
                    <span className="text-brand font-bold text-sm block mt-1">-{Math.round(foodSavings)} kg CO₂</span>
                    <span className="flex items-center gap-1 text-xs text-brand-light mt-2">
                      {addingGoal === "food" ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                      {addingGoal === "food" ? "Added" : "Add Goal"}
                    </span>
                  </button>
                )}
              </div>
            </GlassCard>
          )}
        </div>

        {/* Right 1 Column: Results Breakdown */}
        <div className="space-y-6">
          <GlassCard premium className="space-y-6 text-center relative overflow-hidden">
            <div className="absolute -top-12 -right-12 w-20 h-20 bg-brand/10 rounded-full blur-xl" />
            <h2 className="text-base font-bold text-white">Projected Outcomes</h2>

            {/* Score Comparison */}
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-xl bg-white/2 border border-white/5 p-4">
                <span className="text-xs text-gray-500 block font-medium">Original Score</span>
                <span className="text-3xl font-black text-gray-400 mt-1 block">
                  {originalAssessment.carbonScore}
                </span>
                <span className="text-xs text-gray-500 mt-0.5 block">out of 100</span>
              </div>
              <div className="rounded-xl bg-brand/10 border border-brand/20 p-4">
                <span className="text-xs text-brand-light block font-medium">Simulated Score</span>
                <span className="text-3xl font-black text-brand mt-1 block">
                  {simulated.carbonScore}
                </span>
                <span className="text-xs text-brand-light mt-0.5 block">
                  {simulated.carbonScore > originalAssessment.carbonScore
                    ? `+${simulated.carbonScore - originalAssessment.carbonScore} points`
                    : "No change"}
                </span>
              </div>
            </div>

            {/* Total Annual CO2 Comparison */}
            <div className="space-y-3 pt-4 border-t border-white/5">
              <div className="flex justify-between text-xs font-semibold text-gray-400">
                <span>Original Footprint:</span>
                <span className="text-white">{(originalAnnual / 1000).toFixed(1)} tonnes</span>
              </div>
              <div className="flex justify-between text-xs font-semibold text-gray-400">
                <span>Simulated Footprint:</span>
                <span className="text-white">{(simulatedAnnual / 1000).toFixed(1)} tonnes</span>
              </div>
              <div className="flex justify-between text-xs font-bold text-brand-light pt-2 border-t border-dashed border-white/5">
                <span>Total Annual Reduction:</span>
                <span>{co2Reduction.toLocaleString()} kg CO₂</span>
              </div>
            </div>

            {/* Highlights Savings Block */}
            {co2Reduction > 0 ? (
              <div className="rounded-2xl bg-brand/10 border border-brand/20 p-5">
                <span className="inline-flex rounded-full bg-brand/20 p-1.5 text-brand mb-2.5">
                  <Leaf className="h-4 w-4" />
                </span>
                <div className="text-2xl font-black text-white">-{pctReduction}% CO₂e</div>
                <p className="text-xs text-gray-300 mt-1">Lifestyle change savings estimate</p>
                <div className="mt-4 pt-3 border-t border-white/5 text-left space-y-2 text-xs font-semibold text-gray-400">
                  <div className="flex justify-between">
                    <span>Trees equivalent planted:</span>
                    <span className="text-white font-bold">+{eq.treesPlanted}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equivalent Flight hours avoided:</span>
                    <span className="text-white font-bold">+{eq.flightsSaved} hrs</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Equivalent Car miles avoided:</span>
                    <span className="text-white font-bold">+{eq.carMilesAvoided.toLocaleString()} mi</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl bg-white/2 border border-white/5 p-5 text-gray-400 text-xs">
                <AlertCircle className="h-5 w-5 mx-auto text-gray-500 mb-2" />
                Adjust the sliders or options on the left to start simulating reductions!
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
