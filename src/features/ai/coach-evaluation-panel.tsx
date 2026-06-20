import React from "react";
import { Terminal } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";

interface CoachEvaluationPanelProps {
  loading: boolean;
  report: string | null;
  parseMarkdown: (text: string) => React.ReactNode;
}

export function CoachEvaluationPanel({
  loading,
  report,
  parseMarkdown,
}: CoachEvaluationPanelProps) {
  return (
    <GlassCard className="w-full lg:w-80 space-y-4 hidden lg:flex flex-col shrink-0 overflow-y-auto no-scrollbar max-h-[600px]">
      <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider border-b border-white/5 pb-2">
        <Terminal className="h-4.5 w-4.5" />
        <span>Evaluation Report</span>
      </div>

      {loading ? (
        <div className="space-y-4 pt-2">
          <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
          <div className="space-y-2">
            <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
            <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
          </div>
          <div className="h-16 bg-white/5 rounded-xl animate-pulse w-full mt-6" />
          <div className="h-16 bg-white/5 rounded-xl animate-pulse w-full mt-4" />
        </div>
      ) : report ? (
        <div className="space-y-3 pt-1 text-xs text-gray-300">
          {parseMarkdown(report)}
        </div>
      ) : (
        <p className="text-xs text-gray-400 leading-normal">
          Failed to load your personal evaluation report. Please refresh page or complete assessment.
        </p>
      )}
    </GlassCard>
  );
}
