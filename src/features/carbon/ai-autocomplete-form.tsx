import React from "react";
import { Sparkles } from "lucide-react";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";

interface AiAutocompleteFormProps {
  prompt: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function AiAutocompleteForm({
  prompt,
  onChange,
  onSubmit,
  loading,
}: AiAutocompleteFormProps) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <GlassCard className="w-full mb-6 p-4 border-brand/20 bg-brand/5">
      <div className="flex gap-2 items-center text-brand font-semibold text-xs uppercase tracking-wider mb-2">
        <Sparkles className="h-4 w-4" />
        <span>AI Quick Assessment Autocomplete</span>
      </div>
      <p className="text-xs text-gray-400 mb-3 leading-normal">
        Describe your lifestyle in a sentence or two (e.g. "I commute 30km in a petrol car, have average meat-eating diet, recycle sometimes..."), and AI will auto-configure the assessment details below!
      </p>
      <form onSubmit={handleSubmit} className="flex gap-2 w-full">
        <input
          type="text"
          placeholder="e.g. I drive 40km in an EV, have a $150 electricity bill, eat vegetarian, and recycle"
          value={prompt}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand text-white"
        />
        <Button
          type="submit"
          isLoading={loading}
          size="sm"
          className="bg-brand text-background hover:bg-brand-light font-bold"
        >
          Parse & Fill
        </Button>
      </form>
    </GlassCard>
  );
}
