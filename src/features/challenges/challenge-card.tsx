import React from "react";
import { Sparkles, Check, Plus } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

interface Challenge {
  code: string;
  title: string;
  description: string;
  category: string;
  points: number;
  duration: string;
  difficulty: string;
}

interface ChallengeCardProps {
  challenge: Challenge;
  isJoined: boolean;
  isCompleted: boolean;
  processing: boolean;
  onJoin: (code: string) => void;
  onComplete: (id: string, title: string) => void;
  enrollmentId: string | undefined;
}

export function ChallengeCard({
  challenge,
  isJoined,
  isCompleted,
  processing,
  onJoin,
  onComplete,
  enrollmentId,
}: ChallengeCardProps) {
  return (
    <GlassCard
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
            <span className="capitalize text-[10px] text-gray-400 font-bold bg-white/5 px-1.5 py-0.5 rounded border border-white/5">
              {challenge.difficulty} • {challenge.duration}
            </span>
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
            disabled={processing}
            onClick={() => onComplete(enrollmentId!, challenge.title)}
            className="bg-brand text-background hover:bg-brand-light font-bold text-sm"
          >
            I Did This!
          </Button>
        ) : (
          <Button
            variant="outline"
            size="sm"
            disabled={processing}
            onClick={() => onJoin(challenge.code)}
            className="border-white/10 hover:border-brand/35 text-sm flex gap-1 items-center"
          >
            <Plus className="h-3.5 w-3.5" /> Join Challenge
          </Button>
        )}
      </div>
    </GlassCard>
  );
}
