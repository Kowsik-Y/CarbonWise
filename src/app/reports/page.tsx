"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Calendar, Download, Sparkles, ArrowRight, TrendingUp, Award, AlertTriangle, ArrowLeft } from "lucide-react";
import { WeeklyReport } from "@/types";
import { useApi } from "@/hooks/use-api";
import { PageLoader } from "@/components/ui/page-loader";

export default function ReportsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [selectedReport, setSelectedReport] = useState<WeeklyReport | null>(null);

  const { loading: loadingReports, error: fetchError, request: getReports } = useApi<{ reports: WeeklyReport[] }>();
  const { loading: generating, error: genError, request: postReport } = useApi<{ report: WeeklyReport }>();

  useEffect(() => {
    document.title = "Weekly Reports | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    const fetchReports = async () => {
      try {
        const data = await getReports("/api/reports");
        setReports(data.reports);
        if (data.reports.length > 0) {
          setSelectedReport(data.reports[0]);
        }
      } catch {
        // useApi handles state logging
      }
    };

    if (user) {
      fetchReports();
    }
  }, [user, loading, router, getReports]);

  const handleGenerate = async () => {
    try {
      const data = await postReport("/api/reports", {
        method: "POST",
      });
      setReports((prev) => [data.report, ...prev]);
      setSelectedReport(data.report);
    } catch {
      // useApi handles state logging
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const error = fetchError || genError;

  if (loading || (loadingReports && reports.length === 0)) {
    return <PageLoader />;
  }

  return (
    <div className="flex-1 max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 w-full space-y-8 print:p-0 print:max-w-none">
      {/* Printable CSS Override */}
      <style jsx global>{`
        @media print {
          nav, footer, button, .no-print {
            display: none !important;
          }
          body, html, main {
            background: white !important;
            color: black !important;
          }
          .print-card {
            border: 1px solid #ccc !important;
            background: white !important;
            color: black !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            padding: 24px !important;
            width: 100% !important;
          }
          .print-title {
            color: black !important;
          }
          .print-text {
            color: #333 !important;
          }
        }
      `}</style>

      {/* Top Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 no-print">
        <div>
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 text-xs text-brand hover:text-brand-light font-semibold mb-2 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Dashboard
          </button>
          <h1 className="text-2xl font-bold tracking-tight text-white mt-1">Weekly Sustainability Reports</h1>
          <p className="text-xs text-gray-400 mt-0.5">Track your week-over-week carbon reduction achievements.</p>
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleGenerate}
            isLoading={generating}
            className="flex items-center gap-2 text-xs"
          >
            <Sparkles className="h-4 w-4" /> Generate New Report
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400 no-print">
          {error}
        </div>
      )}

      {reports.length === 0 ? (
        <div className="py-16 text-center max-w-md mx-auto no-print">
          <GlassCard premium className="space-y-6">
            <Calendar className="h-12 w-12 text-brand mx-auto animate-pulse" />
            <h2 className="text-lg font-bold text-white">No Reports Generated Yet</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Generate your first weekly sustainability report to analyze accomplishments, missed opportunities, and receive recommendations.
            </p>
            <Button onClick={handleGenerate} isLoading={generating} className="w-full flex gap-2 items-center justify-center">
              Generate Report <ArrowRight className="h-4 w-4" />
            </Button>
          </GlassCard>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-3 min-h-[500px]">
          {/* Historical List Sidebar */}
          <div className="space-y-4 no-print">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Report History</h2>
            <div className="space-y-2.5 max-h-[550px] overflow-y-auto pr-1 no-scrollbar">
              {reports.map((rep) => {
                const isSelected = selectedReport?.id === rep.id;
                const formattedDate = new Date(rep.createdAt).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                });
                return (
                  <button
                    key={rep.id}
                    onClick={() => setSelectedReport(rep)}
                    className={`w-full text-left rounded-xl p-3 border transition-all cursor-pointer ${
                      isSelected
                        ? "bg-brand/10 border-brand text-white font-semibold"
                        : "bg-white/3 border-white/5 text-gray-300 hover:bg-white/5 hover:border-white/10"
                    }`}
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold">{formattedDate}</span>
                      <span className="text-brand font-semibold">-{rep.carbonReduction} kg</span>
                    </div>
                    <p className="text-[11px] text-gray-400 truncate mt-1">{rep.topAccomplishment}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Report Details View */}
          {selectedReport && (
            <div className="lg:col-span-2 space-y-6">
              <GlassCard premium className="print-card relative overflow-hidden space-y-6">
                {/* Header inside Card */}
                <div className="flex justify-between items-start border-b border-white/5 pb-4">
                  <div>
                    <span className="text-xs font-semibold text-brand tracking-widest uppercase">Weekly Analytics</span>
                    <h2 className="text-xl font-bold text-white print-title mt-1">
                      Report for {new Date(selectedReport.createdAt).toLocaleDateString(undefined, {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </h2>
                  </div>

                  <button
                    onClick={handlePrint}
                    className="no-print rounded-xl p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 transition-all text-gray-300 hover:text-white cursor-pointer"
                    title="Export as PDF"
                  >
                    <Download className="h-4.5 w-4.5" />
                  </button>
                </div>

                {/* Key Metrics Row */}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-xl border border-white/5 bg-white/2 p-4 flex items-center gap-3">
                    <div className="rounded-xl bg-brand/20 p-2.5 text-brand shrink-0">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 font-semibold block">Carbon Saved</span>
                      <span className="text-xl font-bold text-white print-title mt-0.5 block">
                        {selectedReport.carbonReduction} kg CO₂e
                      </span>
                    </div>
                  </div>

                  <div className="rounded-xl border border-white/5 bg-white/2 p-4 flex items-center gap-3">
                    <div className="rounded-xl bg-brand/20 p-2.5 text-brand shrink-0">
                      <Award className="h-5 w-5" />
                    </div>
                    <div>
                      <span className="text-xs text-gray-400 font-semibold block">Sustainability Trend</span>
                      <span className="text-base font-bold text-white print-title mt-0.5 block">
                        {selectedReport.scoreTrend}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Accomplishments Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-brand font-bold text-xs uppercase tracking-wider">
                    <Award className="h-4 w-4" />
                    <span>Top Accomplishment</span>
                  </div>
                  <p className="text-sm text-gray-200 print-text leading-relaxed font-medium bg-white/2 border border-white/5 rounded-xl p-4">
                    {selectedReport.topAccomplishment}
                  </p>
                </div>

                {/* Missed Opportunities Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Missed Opportunities</span>
                  </div>
                  <p className="text-sm text-gray-200 print-text leading-relaxed font-medium bg-white/2 border border-white/5 rounded-xl p-4">
                    {selectedReport.missedOpportunities}
                  </p>
                </div>

                {/* Recommended Next Actions Section */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <Sparkles className="h-4 w-4" />
                    <span>Recommended Next Actions</span>
                  </div>
                  <div className="bg-white/2 border border-white/5 rounded-xl p-4">
                    <ul className="space-y-2 text-sm text-gray-200 print-text font-medium list-disc pl-4">
                      {selectedReport.recommendedActions.split(",").map((action, idx) => (
                        <li key={idx} className="leading-relaxed">
                          {action.trim()}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </GlassCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
