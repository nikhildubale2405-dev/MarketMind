import React, { useState, useEffect, useMemo } from "react";
import {
  Brain,
  AlertTriangle,
  Smile,
  ShieldAlert,
  HeartCrack,
  Lightbulb,
  Plus,
  Trash2,
  CheckCircle,
  TrendingDown,
  Sparkles,
  BookOpen,
  Filter
} from "lucide-react";
import { Trade } from "../types";

interface MistakeTrackerViewProps {
  trades: Trade[];
}

interface UserLearning {
  id: string;
  date: string;
  category: "RISK" | "PSYCHOLOGY" | "EXECUTION" | "STRATEGY";
  lesson: string;
  mastered?: boolean;
}

const DEFAULT_LEARNINGS: UserLearning[] = [
  {
    id: "l1",
    date: "2026-08-15",
    category: "PSYCHOLOGY",
    lesson: "Never enter a trade immediately after taking a loss. Take a 15-minute screen break to avoid revenge impulses.",
    mastered: true
  },
  {
    id: "l2",
    date: "2026-08-20",
    category: "RISK",
    lesson: "Always fix lot size before opening orders. Never adjust stop-loss further away once a position is active.",
    mastered: false
  },
  {
    id: "l3",
    date: "2026-08-25",
    category: "EXECUTION",
    lesson: "Wait for the 1-hour candle close confirmation before entering breakout continuations on Gold (XAU/USD).",
    mastered: false
  }
];

export default function MistakeTrackerView({ trades }: MistakeTrackerViewProps) {
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>("ALL");
  const [newLessonText, setNewLessonText] = useState("");
  const [newLessonCategory, setNewLessonCategory] = useState<"RISK" | "PSYCHOLOGY" | "EXECUTION" | "STRATEGY">("PSYCHOLOGY");
  
  // Custom learnings persistent storage
  const [learnings, setLearnings] = useState<UserLearning[]>(() => {
    const cached = localStorage.getItem("mm_user_learnings");
    return cached ? JSON.parse(cached) : DEFAULT_LEARNINGS;
  });

  useEffect(() => {
    localStorage.setItem("mm_user_learnings", JSON.stringify(learnings));
  }, [learnings]);

  const handleAddLearning = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLessonText.trim()) return;

    const newEntry: UserLearning = {
      id: "learn_" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      category: newLessonCategory,
      lesson: newLessonText.trim(),
      mastered: false
    };

    setLearnings(prev => [newEntry, ...prev]);
    setNewLessonText("");
  };

  const handleToggleMastered = (id: string) => {
    setLearnings(prev => prev.map(l => l.id === id ? { ...l, mastered: !l.mastered } : l));
  };

  const handleDeleteLearning = (id: string) => {
    setLearnings(prev => prev.filter(l => l.id !== id));
  };

  // Evaluate Mistake Statistics
  const mistakeStatsInfo = useMemo(() => {
    const mistakeMetrics: Record<string, { count: number; cost: number; description: string; fix: string }> = {
      "FOMO": {
        count: 0,
        cost: 0,
        description: "Fear Of Missing Out — chasing rapid candle moves without waiting for pullbacks.",
        fix: "Set pending limit orders at confirmed support/resistance levels instead of market execution."
      },
      "Revenge trade": {
        count: 0,
        cost: 0,
        description: "Forcing trades right after a loss to recover capital rapidly.",
        fix: "Implement a mandatory 15-minute cooldown rule after any losing trade."
      },
      "Overtrading": {
        count: 0,
        cost: 0,
        description: "Trading excessively during low-volume sessions, racking up spread costs.",
        fix: "Restrict executions strictly to your primary trading session (e.g. London / New York)."
      },
      "Early exit": {
        count: 0,
        cost: 0,
        description: "Cutting winning setups too early out of fear, capping upside reward.",
        fix: "Scale out half position at 1:1 and let the remaining half run to the predetermined target."
      },
      "Late entry": {
        count: 0,
        cost: 0,
        description: "Entering after price has already moved significantly, resulting in poor risk-to-reward.",
        fix: "If entry price is more than 5 pips away from planned entry, cancel the setup."
      },
      "Ignored stop loss": {
        count: 0,
        cost: 0,
        description: "Widening or removing stop-loss structures, multiplying drawdown size.",
        fix: "Hard-code stop loss in terminal immediately at order entry and never modify it wider."
      },
      "News trade": {
        count: 0,
        cost: 0,
        description: "Trading during high-impact news releases with extreme volatility & slippage.",
        fix: "Do not open new positions 15 minutes before and after high-impact economic releases."
      },
      "Emotional trade": {
        count: 0,
        cost: 0,
        description: "Trading under stress, anger, or fatigue without checking your rules checklist.",
        fix: "Rate your mental readiness (1-10) before trading; sit out if below 7."
      }
    };

    let totalMistakeCount = 0;
    let totalMistakeLosses = 0;

    trades.forEach(t => {
      const mTags = t.mistakeTags || [];
      const pnl = Number(t.profitLoss) || 0;
      
      mTags.forEach(tag => {
        if (mistakeMetrics[tag]) {
          mistakeMetrics[tag].count++;
          if (pnl < 0) {
            mistakeMetrics[tag].cost += Math.abs(pnl);
            totalMistakeLosses += Math.abs(pnl);
          }
          totalMistakeCount++;
        }
      });
    });

    const rankList = Object.entries(mistakeMetrics)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.cost - a.cost);

    return {
      totalMistakeCount,
      totalMistakeLosses,
      byMistake: rankList
    };
  }, [trades]);

  // Automated Data-Driven Learnings from actual logs
  const dynamicLearnings = useMemo(() => {
    const insights: string[] = [];

    // 1. Most costly mistake insight
    const topCostly = mistakeStatsInfo.byMistake.find(m => m.cost > 0);
    if (topCostly) {
      insights.push(
        `Your most expensive behavioral pitfall is "${topCostly.name}" costing -$${topCostly.cost.toFixed(2)}. ${topCostly.fix}`
      );
    }

    // 2. Emotional frame correlation
    const calmTrades = trades.filter(t => t.emotionalState === "calm" || !t.emotionalState);
    const emotionalTrades = trades.filter(t => t.emotionalState && t.emotionalState !== "calm" && t.emotionalState !== "confident");
    
    if (calmTrades.length >= 2) {
      const calmWins = calmTrades.filter(t => Number(t.profitLoss) > 0).length;
      const calmWinRate = Math.round((calmWins / calmTrades.length) * 100);
      insights.push(`When trading in a Calm state, your win rate is ${calmWinRate}% (${calmTrades.length} trades).`);
    }

    if (emotionalTrades.length >= 1) {
      const emotionalLosses = emotionalTrades.reduce((sum, t) => sum + (Number(t.profitLoss) < 0 ? Math.abs(Number(t.profitLoss)) : 0), 0);
      if (emotionalLosses > 0) {
        insights.push(`Emotional setups (anxious, fomo, revenge) led to -$${emotionalLosses.toFixed(2)} in losses.`);
      }
    }

    if (insights.length === 0) {
      insights.push("Continue logging setups and tagging mistakes to generate automated tactical learnings.");
    }

    return insights;
  }, [trades, mistakeStatsInfo]);

  // Filtered learnings list
  const filteredLearnings = useMemo(() => {
    if (selectedCategoryFilter === "ALL") return learnings;
    return learnings.filter(l => l.category === selectedCategoryFilter);
  }, [learnings, selectedCategoryFilter]);

  return (
    <div id="mistakes-learnings-workspace" className="space-y-6">

      {/* 1. EXECUTIVE SUMMARY CARDS */}
      <div id="mistakes-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Mistakes Recorded</span>
          <span className="text-2xl font-bold font-mono text-white">{mistakeStatsInfo.totalMistakeCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Capital Leakage</span>
          <span className="text-2xl font-bold font-mono text-rose-400">
            {mistakeStatsInfo.totalMistakeLosses > 0 ? `-$${mistakeStatsInfo.totalMistakeLosses.toFixed(2)}` : "$0.00"}
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Learnings Documented</span>
          <span className="text-2xl font-bold font-mono text-indigo-400">{learnings.length}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Lessons Mastered</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">
            {learnings.filter(l => l.mastered).length} / {learnings.length}
          </span>
        </div>
      </div>

      {/* 2. AUTOMATED DATA-DRIVEN KEY TAKEAWAYS */}
      <div id="data-learnings-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3 mb-3">
          <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
            <Sparkles size={15} className="text-amber-400" />
            Automated Key Learnings from Journal Data
          </h4>
          <span className="text-[10px] font-mono text-slate-500">Auto-generated</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {dynamicLearnings.map((insight, idx) => (
            <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-start gap-2.5">
              <Lightbulb size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-slate-300 leading-relaxed font-sans">{insight}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 3. TWO-COLUMN LAYOUT: MISTAKES BREAKDOWN & USER LEARNINGS NOTEBOOK */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Column 1: Behavioral Mistakes & Cost Breakdown */}
        <div id="behavioral-mistakes-column" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                <HeartCrack size={15} className="text-rose-400" />
                Mistakes & Capital Leakage
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Track recurring behavioral pitfalls and their direct financial cost</p>
            </div>
          </div>

          <div className="space-y-3">
            {mistakeStatsInfo.byMistake.map((m, idx) => {
              const hasOccurred = m.count > 0;
              return (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border transition-all ${
                    hasOccurred
                      ? "bg-slate-950 border-slate-800 hover:border-slate-700"
                      : "bg-slate-950/40 border-slate-850/60 opacity-65"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-slate-200">{m.name}</strong>
                      <span className={`text-[9px] font-mono font-semibold px-2 py-0.5 rounded ${
                        hasOccurred ? "bg-slate-900 text-slate-300 border border-slate-800" : "text-slate-500"
                      }`}>
                        {m.count} event{m.count !== 1 ? "s" : ""}
                      </span>
                    </div>

                    <span className={`text-xs font-mono font-bold ${m.cost > 0 ? "text-rose-400" : "text-slate-500"}`}>
                      {m.cost > 0 ? `-$${m.cost.toFixed(2)}` : "$0.00"}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 leading-relaxed font-sans mb-2">
                    {m.description}
                  </p>

                  <div className="bg-slate-900/80 p-2 rounded border border-slate-850/80 text-[10px] text-emerald-400/90 flex items-start gap-1.5">
                    <span className="font-mono font-bold text-slate-400">FIX:</span>
                    <span>{m.fix}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Column 2: Personal Trader Learnings & Notes Notebook */}
        <div id="user-learnings-notebook-column" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800/80 pb-3">
              <div>
                <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                  <BookOpen size={15} className="text-indigo-400" />
                  My Trading Learnings & Rules
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">Your personal lessons learned to prevent repeating mistakes</p>
              </div>

              {/* Category Filter */}
              <div className="flex items-center gap-1">
                {["ALL", "PSYCHOLOGY", "RISK", "EXECUTION"].map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors ${
                      selectedCategoryFilter === cat
                        ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold"
                        : "bg-slate-950 text-slate-400 border border-slate-850 hover:text-slate-200"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Learnings List */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredLearnings.length === 0 ? (
                <div className="text-center py-8 text-slate-600">
                  <BookOpen size={24} className="mx-auto mb-1.5 opacity-30" />
                  <p className="text-xs">No learnings logged in this category yet.</p>
                </div>
              ) : (
                filteredLearnings.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                      item.mastered
                        ? "bg-emerald-950/10 border-emerald-500/20"
                        : "bg-slate-950 border-slate-850 hover:border-slate-800"
                    }`}
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded font-bold ${
                          item.category === "RISK"
                            ? "bg-rose-950 text-rose-400 border border-rose-900/60"
                            : item.category === "PSYCHOLOGY"
                            ? "bg-purple-950 text-purple-400 border border-purple-900/60"
                            : "bg-blue-950 text-blue-400 border border-blue-900/60"
                        }`}>
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">{item.date}</span>
                        {item.mastered && (
                          <span className="text-[9px] font-mono text-emerald-400 font-bold flex items-center gap-1">
                            <CheckCircle size={10} /> Mastered
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed font-sans">{item.lesson}</p>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0 pt-0.5">
                      <button
                        onClick={() => handleToggleMastered(item.id)}
                        className={`p-1 rounded text-xs transition-colors ${
                          item.mastered ? "text-emerald-400 hover:text-emerald-300" : "text-slate-500 hover:text-emerald-400"
                        }`}
                        title={item.mastered ? "Mark as in progress" : "Mark as mastered"}
                      >
                        <CheckCircle size={14} />
                      </button>
                      <button
                        onClick={() => handleDeleteLearning(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        title="Delete lesson"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Add Learning Note Form */}
          <form onSubmit={handleAddLearning} className="mt-4 pt-3 border-t border-slate-850/80 space-y-2.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Log a New Trading Lesson</span>
              <select
                value={newLessonCategory}
                onChange={(e) => setNewLessonCategory(e.target.value as any)}
                className="bg-slate-950 border border-slate-800 text-slate-300 text-[10px] font-mono px-2 py-0.5 rounded focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="PSYCHOLOGY">Psychology</option>
                <option value="RISK">Risk Management</option>
                <option value="EXECUTION">Execution & Timing</option>
                <option value="STRATEGY">Strategy & Setup</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                required
                placeholder="What did this session teach you? (e.g., Do not trade gold during high impact news)"
                value={newLessonText}
                onChange={(e) => setNewLessonText(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-2 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={14} /> Save
              </button>
            </div>
          </form>
        </div>

      </div>

    </div>
  );
}
