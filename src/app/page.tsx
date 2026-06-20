"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Compass, MessageSquare, Target, Trophy, Sparkles, ArrowRight, BarChart2, Globe, ShieldCheck } from "lucide-react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    document.title = "CarbonWise - Track Less, Reduce More";
  }, []);

  // Redirect to dashboard if logged in to prevent landing page blinking/shifting
  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [user, loading, router]);

  // Interactive preview slider state
  const [kms, setKms] = useState(30);
  const petrolEmission = Math.round(kms * 365 * 0.17);
  const trainEmission = Math.round(kms * 365 * 0.03);
  const saving = petrolEmission - trainEmission;

  const features = [
    {
      title: "AI Carbon Assessment",
      description: "Quickly map your transportation, diet, shopping, energy, and waste habits. See your detailed category breakdown.",
      icon: Compass,
      color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
    },
    {
      title: "Smart AI Coach",
      description: "Ask anything about sustainability. The coach analyzes your custom carbon profile to suggest tailored adjustments.",
      icon: MessageSquare,
      color: "text-teal-400 bg-teal-500/10 border-teal-500/20",
    },
    {
      title: "Action Planner",
      description: "Get a prioritized checklist ranked by reduction impact and adoption difficulty. Commit to goals directly.",
      icon: Target,
      color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
    },
    {
      title: "Weekly AI Challenges",
      description: "Compete in community challenges like 'No-Car Tuesday' and earn gamification XP and achievement badges.",
      icon: Trophy,
      color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
    },
  ];

  return (
    <div className="relative overflow-hidden flex-1 flex flex-col justify-between">
      {/* Background radial glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand/5 rounded-full blur-3xl -z-10" />
      <div className="absolute top-[40%] right-[-10%] w-[350px] h-[350px] bg-blue-500/5 rounded-full blur-3xl -z-10" />

      {/* Hero Section */}
      <section className="mx-auto max-w-7xl px-4 pt-16 pb-12 sm:px-6 lg:px-8 text-center sm:pt-24 lg:pt-32">
        <div className="flex justify-center mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 border border-brand/20 px-3.5 py-1.5 text-xs font-semibold text-brand-light animate-pulse-glow">
            <Sparkles className="h-3.5 w-3.5" />
            Empowering Personal Carbon Reduction
          </span>
        </div>

        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl md:text-6xl max-w-4xl mx-auto leading-[1.1]">
          Track less. <span className="bg-gradient-to-r from-brand-light to-teal-400 bg-clip-text text-transparent">Reduce more.</span>
        </h1>

        <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-400">
          An AI sustainability coach that learns your lifestyle, calculates your carbon score, and generates micro-actions that create a macro impact on our planet.
        </p>

        {/* Hero CTA — rendered only after auth resolves to prevent flash */}
        <div className="mt-10 flex justify-center gap-4 flex-col sm:flex-row items-center min-h-[52px]">
          {loading ? (
            // Invisible placeholder keeps layout stable while auth resolves
            <div className="h-12 w-48 rounded-xl bg-white/5 animate-pulse" />
          ) : user ? (
            <Link href="/dashboard" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto flex gap-2 items-center">
                Go to Dashboard <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          ) : (
            <>
              <Link href="/auth?mode=signup" className="w-full sm:w-auto">
                <Button size="lg" className="w-full sm:w-auto flex gap-2 items-center">
                  Start Your Journey <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#interactive-preview" className="w-full sm:w-auto">
                <Button variant="outline" size="lg" className="w-full sm:w-auto text-gray-300">
                  Try Footprint Simulator
                </Button>
              </a>
            </>
          )}
        </div>
      </section>

      {/* Interactive Micro-Calculator Section */}
      <section id="interactive-preview" className="py-12 bg-white/2">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-2 items-center">
            <div>
              <span className="text-sm font-semibold text-brand tracking-wider uppercase">Interactive Preview</span>
              <h2 className="text-3xl font-bold text-white tracking-tight mt-2 sm:text-4xl">
                Small adjustments, giant impact.
              </h2>
              <p className="mt-4 text-gray-400 text-base leading-relaxed">
                Use the slider to see how modifying your daily commute from petrol/diesel driving to public transit (or active transit like cycling/walking) drops your annual emissions.
              </p>

              <div className="mt-8 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/5 p-2 text-brand">
                    <Globe className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-gray-300">No complex forms required for estimation</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/5 p-2 text-brand">
                    <BarChart2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-gray-300">Visual representations of category footprints</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-white/5 p-2 text-brand">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <span className="text-sm text-gray-300">Zero data collection until you sign up</span>
                </div>
              </div>
            </div>

            <GlassCard premium className="relative overflow-hidden">
              <h3 className="text-lg font-bold text-white mb-6">Commute Calculator</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2 text-gray-300 font-medium">
                    <span>Daily Travel Distance</span>
                    <span className="text-brand font-semibold">{kms} km</span>
                  </div>
                  <input
                    type="range"
                    min="5"
                    max="150"
                    value={kms}
                    onChange={(e) => setKms(Number(e.target.value))}
                    className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="rounded-xl bg-red-500/5 border border-red-500/10 p-4">
                    <span className="text-xs text-gray-400 block font-medium">Petrol/Diesel Car</span>
                    <span className="text-2xl font-bold text-red-400 mt-1 block">
                      {petrolEmission.toLocaleString()} kg
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 block">CO₂e / year</span>
                  </div>
                  <div className="rounded-xl bg-brand/5 border border-brand/10 p-4">
                    <span className="text-xs text-gray-400 block font-medium">Public Transit</span>
                    <span className="text-2xl font-bold text-brand mt-1 block">
                      {trainEmission.toLocaleString()} kg
                    </span>
                    <span className="text-xs text-gray-500 mt-0.5 block">CO₂e / year</span>
                  </div>
                </div>

                <div className="rounded-2xl bg-brand/10 border border-brand/20 p-5 text-center">
                  <span className="text-sm text-gray-300 font-medium">Annual CO₂ Savings:</span>
                  <div className="text-3xl font-extrabold text-white mt-1.5">
                    {saving.toLocaleString()} kg CO₂e
                  </div>
                  <p className="text-xs text-brand-light mt-2 font-medium">
                    Equivalent to planting {Math.round(saving / 22)} mature trees! 🌲
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* Feature Breakdown */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Features Judges Will Love
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-gray-400">
            CarbonWise is designed for maximum sustainability impact with gamified features and secure AI advice.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <GlassCard key={idx} className="glass-interactive flex flex-col justify-between">
                <div>
                  <div className={`inline-flex rounded-xl p-3 border ${feature.color} mb-5`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                  <p className="text-sm text-gray-400 leading-relaxed">{feature.description}</p>
                </div>
              </GlassCard>
            );
          })}
        </div>
      </section>

      {/* Community Impact Statistics */}
      <section className="border-t border-white/5 py-16 bg-[#070b0e]/50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl border border-white/5 bg-[#090d10]/40 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center justify-between gap-12 relative overflow-hidden">
            {/* Glow blur background */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-brand/5 rounded-full blur-3xl -z-10" />

            <div className="max-w-xl text-center lg:text-left">
              <h2 className="text-3xl font-extrabold text-white tracking-tight sm:text-4xl">
                The Community Impact
              </h2>
              <p className="mt-4 text-gray-400">
                Join a global group of environmentally minded individuals lowering their footprints together.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3 w-full lg:w-auto text-center">
              <div className="p-6 rounded-2xl bg-white/2 border border-white/5 min-w-[160px]">
                <span className="text-4xl font-extrabold text-brand-light block">1,845</span>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mt-1.5">
                  Trees Absorbed
                </span>
              </div>
              <div className="p-6 rounded-2xl bg-white/2 border border-white/5 min-w-[160px]">
                <span className="text-4xl font-extrabold text-teal-400 block">40.5t</span>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mt-1.5">
                  CO₂ Reduced
                </span>
              </div>
              <div className="p-6 rounded-2xl bg-white/2 border border-white/5 min-w-[160px]">
                <span className="text-4xl font-extrabold text-blue-400 block">95k L</span>
                <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold block mt-1.5">
                  Water Saved
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
