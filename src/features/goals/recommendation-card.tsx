import React from "react";
import { Plus } from "lucide-react";
import { AIRecommendation } from "@/types";

interface RecommendationCardProps {
  action: AIRecommendation;
  adding: boolean;
  onAdd: (title: string, category: string, co2: number, diff: string) => void;
}

export function RecommendationCard({ action, adding, onAdd }: RecommendationCardProps) {
  return (
    <div className="rounded-xl border border-white/5 hover:border-white/10 bg-white/2 p-3 flex flex-col justify-between gap-3 text-xs">
      <div>
        <div className="flex justify-between items-center text-xs font-semibold text-gray-500 uppercase tracking-widest">
          <span className="capitalize">{action.category}</span>
          <span className="capitalize">{action.diff}</span>
        </div>
        <p className="font-semibold text-white mt-1 leading-normal">
          {action.title}
        </p>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-white/5">
        <span className="text-xs font-bold text-brand-light">
          -{action.co2} kg CO₂ / yr
        </span>
        <button
          disabled={adding}
          onClick={() => onAdd(action.title, action.category, action.co2, action.diff)}
          className="rounded-lg p-1.5 bg-white/5 hover:bg-brand/10 border border-white/10 hover:border-brand/20 text-gray-300 hover:text-brand transition-colors cursor-pointer disabled:opacity-50"
          title="Add to Goals"
        >
          <Plus className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
