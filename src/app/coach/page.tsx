"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Send, Sparkles, MessageSquare, Compass, Terminal, Trash2, ArrowRight } from "lucide-react";
import { Select } from "@/components/ui/select";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const parseInlineMarkdown = (text: string) => {
  const boldRegex = /\*\*(.*?)\*\*/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = boldRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(
      <strong key={match.index} className="font-extrabold text-white">
        {match[1]}
      </strong>
    );
    lastIndex = boldRegex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : text;
};

const parseMarkdown = (text: string) => {
  const lines = text.split("\n");
  return lines.map((line, idx) => {
    if (line.startsWith("### ")) {
      return (
        <h3 key={idx} className="text-sm font-bold text-white mt-3 mb-1 first:mt-0">
          {parseInlineMarkdown(line.slice(4))}
        </h3>
      );
    }
    if (line.startsWith("* ")) {
      return (
        <li key={idx} className="ml-4 list-disc text-gray-300 my-0.5">
          {parseInlineMarkdown(line.slice(2))}
        </li>
      );
    }
    if (line.trim() === "") {
      return <div key={idx} className="h-1.5" />;
    }
    return (
      <p key={idx} className="text-gray-300 my-0.5 leading-relaxed">
        {parseInlineMarkdown(line)}
      </p>
    );
  });
};

export default function CoachPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI Sustainability Coach. 🌲\n\nI can analyze your carbon footprint assessment, suggest realistic goals, explain environmental math, or help you level up your challenges. What category of emissions would you like to target today?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasAssessment, setHasAssessment] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [aiReport, setAiReport] = useState<string>("");
  const [loadingReport, setLoadingReport] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.title = "AI Coach | CarbonWise";
    if (!loading && !user) {
      router.push("/auth?mode=login");
      return;
    }

    if (user) {
      checkAssessmentStatus();
    }
  }, [user, loading, router]);

  useEffect(() => {
    // Scroll to bottom on new messages
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const checkAssessmentStatus = async () => {
    try {
      const res = await fetch("/api/carbon/assessment");
      const data = await res.json();
      const hasAss = !!data.assessment;
      setHasAssessment(hasAss);
      if (hasAss) {
        fetchEvaluationReport();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setFetching(false);
    }
  };

  const fetchEvaluationReport = async () => {
    setLoadingReport(true);
    try {
      const res = await fetch("/api/coach/report");
      if (res.ok) {
        const data = await res.json();
        setAiReport(data.report);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingReport(false);
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || sending) return;

    const userMsg: Message = { role: "user", content: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: textToSend,
          history: messages,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "Sorry, I ran into a connection glitch. Let me try again later." },
        ]);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Make sure your local servers are running." },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        role: "assistant",
        content: "Cleared history! 🗑️ What category of emissions would you like to work on now?",
      },
    ]);
  };

  const suggestionChips = [
    "Is chicken better than beef?",
    "How does my daily driving impact my score?",
    "What are the best home energy saving tips?",
    "How much carbon does recycling save?",
  ];

  if (loading || fetching) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#090d10]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand" />
      </div>
    );
  }

  return (
    <div className="flex-grow max-w-5xl mx-auto px-4 py-6 sm:px-6 lg:px-8 w-full flex flex-col h-[calc(100vh-180px)] max-h-[700px] min-h-[500px]">
      {/* Top Title Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-brand/10 p-2.5 text-brand animate-pulse-glow">
            <Sparkles className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-white">AI Sustainability Coach</h1>
            <p className="text-xs text-gray-400">Context-aware advice based on your lifestyle profile.</p>
          </div>
        </div>

        <button
          onClick={handleClear}
          title="Clear Chat Logs"
          className="rounded-xl p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/5 border border-white/5 transition-all cursor-pointer"
        >
          <Trash2 className="h-4.5 w-4.5" />
        </button>
      </div>

      {!hasAssessment ? (
        <div className="flex-1 flex items-center justify-center max-w-md mx-auto text-center">
          <GlassCard premium className="space-y-6">
            <Compass className="h-12 w-12 text-brand mx-auto animate-bounce" />
            <h2 className="text-lg font-bold text-white">Assessment Required</h2>
            <p className="text-sm text-gray-400">
              The AI Coach requires you to fill out your carbon assessment so it can diagnose your biggest emission sources.
            </p>
            <Button onClick={() => router.push("/assessment")} className="w-full flex gap-2 items-center justify-center">
              Start Assessment <ArrowRight className="h-4 w-4" />
            </Button>
          </GlassCard>
        </div>
      ) : (
        <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col rounded-2xl border border-white/10 bg-[#090d10]/40 overflow-hidden min-h-0">
            {/* Scrollable Dialogue Logs */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`rounded-2xl px-4 py-3 text-sm max-w-[80%] leading-relaxed ${msg.role === "user"
                      ? "bg-brand text-background font-semibold rounded-tr-sm whitespace-pre-line"
                      : "bg-white/5 border border-white/10 text-gray-200 rounded-tl-sm space-y-1.5"
                      }`}
                  >
                    {msg.role === "user" ? msg.content : parseMarkdown(msg.content)}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-4 py-3 bg-white/5 border border-white/10 text-gray-400 text-xs font-semibold flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-brand animate-bounce" style={{ animationDelay: "300ms" }} />
                    Coach is typing...
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>

            {/* Input Form Bar & Dropdown Select */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 border-t border-white/10 flex flex-col sm:flex-row gap-3 items-center"
            >
              <div className="w-fit shrink-0">
                <Select
                  value=""
                  openDirection="up"
                  onChange={(e) => {
                    if (e.target.value) {
                      setInput(e.target.value);
                      handleSend(e.target.value);
                    }
                  }}
                  options={[
                    { value: "", label: "Quick" },
                    ...suggestionChips.map((chip) => ({ value: chip, label: chip })),
                    { value: "How can I reduce my overall carbon footprint?", label: "How can I reduce my overall carbon footprint?" }
                  ]}
                />
              </div>

              <div className="flex-1 flex gap-2 w-full">
                <input
                  type="text"
                  placeholder="Ask something (e.g. Is eating chicken better than beef?)"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  disabled={sending}
                  className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-all disabled:opacity-50 text-white"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || sending}
                  className="rounded-xl p-3 bg-brand text-background hover:bg-brand-light font-semibold shadow disabled:opacity-50 disabled:pointer-events-none active:scale-95 transition-all cursor-pointer shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>

          {/* Right Column Help Hints Panel */}
          <GlassCard className="w-full lg:w-80 space-y-4 hidden lg:flex flex-col shrink-0 overflow-y-auto no-scrollbar max-h-[600px]">
            <div className="flex items-center gap-2 text-brand font-semibold text-xs uppercase tracking-wider border-b border-white/5 pb-2">
              <Terminal className="h-4.5 w-4.5" />
              <span>Evaluation Report</span>
            </div>

            {loadingReport ? (
              <div className="space-y-4 pt-2">
                <div className="h-4 bg-white/5 rounded animate-pulse w-3/4" />
                <div className="space-y-2">
                  <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
                  <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
                </div>
                <div className="h-16 bg-white/5 rounded-xl animate-pulse w-full mt-6" />
                <div className="h-16 bg-white/5 rounded-xl animate-pulse w-full mt-4" />
              </div>
            ) : aiReport ? (
              <div className="space-y-3 pt-1 text-xs text-gray-300">
                {parseMarkdown(aiReport)}
              </div>
            ) : (
              <p className="text-xs text-gray-400 leading-normal">
                Failed to load your personal evaluation report. Please refresh page or complete assessment.
              </p>
            )}
          </GlassCard>
        </div>
      )}
    </div>
  );
}
