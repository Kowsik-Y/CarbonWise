"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Compass, Car, Flame, FlameKindling, ShoppingBag, Trash2, ChevronRight, ChevronLeft, Award, Sparkles } from "lucide-react";

export default function AssessmentPage() {
  const { user, refreshSession, loading, showToast } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // AI Autocomplete state
  const [aiPrompt, setAiPrompt] = useState("");
  const [parsing, setParsing] = useState(false);

  // Form State
  const [transportKm, setTransportKm] = useState(25);
  const [transportType, setTransportType] = useState("car_petrol");
  const [electricityBill, setElectricityBill] = useState(80);
  const [electricityKwh, setElectricityKwh] = useState(0);
  const [foodHabits, setFoodHabits] = useState("low_meat");
  const [shoppingHabits, setShoppingHabits] = useState("average");
  const [wasteHabits, setWasteHabits] = useState("recycle_some");

  // Redirection checks
  useEffect(() => {
    document.title = "Footprint Assessment | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
    }
  }, [user, loading, router]);

  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setParsing(true);
    try {
      const res = await fetch("/api/carbon/parse-assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: aiPrompt }),
      });

      if (res.ok) {
        const data = await res.json();
        const { values } = data;
        if (values) {
          if (typeof values.transportKm === "number") setTransportKm(values.transportKm);
          if (values.transportType) setTransportType(values.transportType);
          if (typeof values.electricityBill === "number") setElectricityBill(values.electricityBill);
          if (values.foodHabits) setFoodHabits(values.foodHabits);
          if (values.shoppingHabits) setShoppingHabits(values.shoppingHabits);
          if (values.wasteHabits) setWasteHabits(values.wasteHabits);

          showToast("AI parsed details and filled the assessment forms! Review and submit. ✨", "success");
        }
      } else {
        showToast("AI parser could not interpret the text. Please fill manually.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error communicating with AI parser.", "error");
    } finally {
      setParsing(false);
    }
  };

  if (loading || !user) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  const steps = [
    { title: "Transportation", icon: Car, desc: "How do you commute?" },
    { title: "Home Energy", icon: Flame, desc: "What's your household utility size?" },
    { title: "Diet & Food", icon: FlameKindling, desc: "What are your eating habits?" },
    { title: "Shopping", icon: ShoppingBag, desc: "How often do you purchase goods?" },
    { title: "Waste Management", icon: Trash2, desc: "What are your recycling patterns?" },
  ];

  const nextStep = () => {
    if (step < steps.length - 1) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/carbon/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transportKm: Number(transportKm),
          transportType,
          electricityBill: Number(electricityBill),
          electricityKwh: Number(electricityKwh),
          foodHabits,
          shoppingHabits,
          wasteHabits,
        }),
      });

      if (res.ok) {
        // Trigger high-fidelity confetti celebration
        const confetti = (await import("canvas-confetti")).default;
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ["#10b981", "#34d399", "#6ee7b7", "#3b82f6", "#60a5fa"],
        });

        await refreshSession();

        // Show success screen inside wizard
        setStep(5);
      } else {
        showToast("Failed to save assessment. Please check inputs.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Something went wrong.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const progressPercent = Math.round(((step + 1) / steps.length) * 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 max-w-3xl mx-auto w-full">
      {/* Step Indicator Header (Hide on success screen) */}
      {step < 5 && (
        <div className="w-full mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Compass className="h-6 w-6 text-brand" />
            <h1 className="text-xl font-bold tracking-tight text-white">Carbon Footprint Assessment</h1>
          </div>
          <p className="text-sm text-gray-400">Complete all 5 sections for your AI Coaching Profile</p>

          {/* Progress Bar */}
          <div className="w-full h-1.5 bg-white/5 rounded-full mt-5 relative overflow-hidden">
            <div
              className="h-full bg-brand rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
            <span>Step {step + 1} of 5</span>
            <span>{progressPercent}% Complete</span>
          </div>
        </div>
      )}

      {step < 5 && (
        <GlassCard className="w-full mb-6 p-4 border-brand/20 bg-brand/5">
          <div className="flex gap-2 items-center text-brand font-semibold text-xs uppercase tracking-wider mb-2">
            <Sparkles className="h-4 w-4" />
            <span>AI Quick Assessment Autocomplete</span>
          </div>
          <p className="text-xs text-gray-400 mb-3 leading-normal">
            Describe your lifestyle in a sentence or two (e.g. "I commute 30km in a petrol car, have average meat-eating diet, recycle sometimes..."), and AI will auto-configure the assessment details below!
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleAiParse();
            }}
            className="flex gap-2 w-full"
          >
            <input
              type="text"
              placeholder="e.g. I drive 40km in an EV, have a $150 electricity bill, eat vegetarian, and recycle"
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-white"
            />
            <Button
              type="submit"
              isLoading={parsing}
              size="sm"
              className="bg-brand text-background hover:bg-brand-light font-bold"
            >
              Parse & Fill
            </Button>
          </form>
        </GlassCard>
      )}

      {/* Step 1: Transport */}
      {step === 0 && (
        <GlassCard premium className="w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
              <Car className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Transportation Habits</h2>
              <p className="text-xs text-gray-400">Estimate your average daily commute travel.</p>
            </div>
          </div>

          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-sm mb-2 text-gray-300 font-medium">
                <label htmlFor="commute-distance">Average Daily Travel Distance</label>
                <span className="text-brand font-semibold">{transportKm} km</span>
              </div>
              <input
                id="commute-distance"
                type="range"
                min="0"
                max="200"
                step="5"
                value={transportKm}
                onChange={(e) => setTransportKm(Number(e.target.value))}
                className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-xs text-gray-500 mt-1 block">Includes driving, public transit, and train travel.</span>
            </div>

            <Select
              id="transport-type"
              label="Primary Mode of Transportation"
              value={transportType}
              onChange={(e) => setTransportType(e.target.value)}
              options={[
                { value: "car_petrol", label: "Petrol Car (Standard)" },
                { value: "car_diesel", label: "Diesel Car" },
                { value: "car_electric", label: "Electric Vehicle (EV)" },
                { value: "public_transit", label: "Public Transit (Bus/Train)" },
                { value: "none", label: "Active Commuting (Walk/Cycle/None)" },
              ]}
            />
          </div>
        </GlassCard>
      )}

      {/* Step 2: Energy */}
      {step === 1 && (
        <GlassCard premium className="w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
              <Flame className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Home Energy Usage</h2>
              <p className="text-xs text-gray-400">Tell us about your home utility consumption.</p>
            </div>
          </div>

          <div className="space-y-5">
            <Input
              id="electricity-bill"
              label="Monthly Electricity Bill ($)"
              type="number"
              min="0"
              value={electricityBill}
              onChange={(e) => setElectricityBill(Number(e.target.value))}
              placeholder="e.g. 80"
            />

            <div className="relative flex py-2 items-center">
              <div className="flex-1 grow border-t border-white/5"></div>
              <span className="flex-shrink mx-4 text-xs text-gray-500 uppercase tracking-widest font-semibold">Or enter directly</span>
              <div className="flex-1 grow border-t border-white/5"></div>
            </div>

            <Input
              id="electricity-kwh"
              label="Estimated Monthly Electricity (kWh)"
              type="number"
              min="0"
              value={electricityKwh || ""}
              onChange={(e) => setElectricityKwh(Number(e.target.value))}
              placeholder="Leave as 0 to estimate from bill"
            />
          </div>
        </GlassCard>
      )}

      {/* Step 3: Diet */}
      {step === 2 && (
        <GlassCard premium className="w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
              <FlameKindling className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Dietary & Food Habits</h2>
              <p className="text-xs text-gray-400">Food is a massive hidden contributor to carbon emissions.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Select
              id="food-habits"
              label="What best describes your regular eating habits?"
              value={foodHabits}
              onChange={(e) => setFoodHabits(e.target.value)}
              options={[
                { value: "high_meat", label: "Frequent Red Meat (Beef/Lamb heavy)" },
                { value: "low_meat", label: "Low Meat / Poultry heavy (Chicken/Fish/Occasional beef)" },
                { value: "vegetarian", label: "Vegetarian (Eggs/Dairy, no meat)" },
                { value: "vegan", label: "Vegan (Strictly plant-based)" },
              ]}
            />
          </div>
        </GlassCard>
      )}

      {/* Step 4: Shopping */}
      {step === 3 && (
        <GlassCard premium className="w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Shopping & Consumption</h2>
              <p className="text-xs text-gray-400">Manufacturing products contributes significantly to global emissions.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Select
              id="shopping-habits"
              label="What are your average consumer buying patterns?"
              value={shoppingHabits}
              onChange={(e) => setShoppingHabits(e.target.value)}
              options={[
                { value: "minimal", label: "Minimalist (Buy only essentials, recycle/secondhand first)" },
                { value: "average", label: "Average (Buy standard products, average clothing/gadgets)" },
                { value: "heavy", label: "Frequent shopper (Regularly buy gadgets, fast fashion, new items)" },
              ]}
            />
          </div>
        </GlassCard>
      )}

      {/* Step 5: Waste */}
      {step === 4 && (
        <GlassCard premium className="w-full animate-fade-in">
          <div className="flex items-center gap-3 mb-6 border-b border-white/5 pb-4">
            <div className="rounded-xl bg-brand/10 p-2.5 text-brand">
              <Trash2 className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Waste & Recycling</h2>
              <p className="text-xs text-gray-400">Recycling and composting prevent landfill methane leaks.</p>
            </div>
          </div>

          <div className="space-y-4">
            <Select
              id="waste-habits"
              label="How does your household handle trash and sorting?"
              value={wasteHabits}
              onChange={(e) => setWasteHabits(e.target.value)}
              options={[
                { value: "recycle_all", label: "Recycle & Compost everything possible" },
                { value: "recycle_some", label: "Recycle some items (Standard sorting)" },
                { value: "no_recycling", label: "Everything to general landfill/trash" },
              ]}
            />
          </div>
        </GlassCard>
      )}

      {/* Step 6: Success screen */}
      {step === 5 && (
        <GlassCard premium className="w-full text-center py-8 animate-fade-in relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-28 h-28 bg-brand/20 rounded-full blur-xl" />

          <div className="rounded-2xl bg-brand/15 border border-brand/35 text-brand p-4 inline-flex mb-6 animate-bounce">
            <Award className="h-10 w-10" />
          </div>

          <h2 className="text-2xl font-extrabold text-white">Calculation Complete! 🎉</h2>
          <p className="text-brand-light font-semibold text-sm mt-2">+150 XP Points Awarded</p>

          <p className="text-gray-400 text-sm max-w-md mx-auto mt-4 leading-relaxed">
            Congratulations! You have unlocked the <strong className="text-white">Carbon Pioneer</strong> achievement badge. Let's see your dashboard analysis and personalized reduction plan.
          </p>

          <Button
            onClick={() => router.push("/dashboard")}
            className="mt-8 flex gap-2 items-center mx-auto"
            size="lg"
          >
            Go to Dashboard <ChevronRight className="h-5 w-5" />
          </Button>
        </GlassCard>
      )}

      {/* Navigation Buttons (Hide on Success) */}
      {step < 5 && (
        <div className="flex justify-between w-full mt-6 gap-4">
          <Button
            variant="secondary"
            onClick={prevStep}
            disabled={step === 0 || submitting}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" /> Back
          </Button>

          {step < steps.length - 1 ? (
            <Button onClick={nextStep} className="flex items-center gap-2">
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              isLoading={submitting}
              className="bg-brand text-background hover:bg-brand-light font-semibold"
            >
              Calculate Carbon Score
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
