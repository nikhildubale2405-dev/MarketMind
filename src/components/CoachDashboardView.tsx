import React, { useState, useMemo } from "react";
import {
  Brain,
  Sparkles,
  Award,
  Zap,
  Network,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  CalendarCheck,
  ShieldAlert,
  Flame,
  Target
} from "lucide-react";
import { Trade, Transaction } from "../types";

interface CoachDashboardViewProps {
  trades: Trade[];
  transactions: Transaction[];
  onGenerateAIInsights: () => Promise<string>;
  savedAIReport: string;
}

export default function CoachDashboardView({
  trades,
  transactions,
  onGenerateAIInsights,
  savedAIReport
}: CoachDashboardViewProps) {
  const [aiReport, setAiReport] = useState(savedAIReport);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // 30-Day Discipline Challenge Progress checklist (stored in local database)
  const [challengeChecked, setChallengeChecked] = useState<boolean[]>(() => {
    const cached = localStorage.getItem("mm_discipline_challenge_checked");
    return cached ? JSON.parse(cached) : Array(30).fill(false);
  });

  const handleToggleDay = (idx: number) => {
    const updated = [...challengeChecked];
    updated[idx] = !updated[idx];
    setChallengeChecked(updated);
    localStorage.setItem("mm_discipline_challenge_checked", JSON.stringify(updated));
  };

  const completedDaysCount = challengeChecked.filter(Boolean).length;

  const handleRunAudit = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const report = await onGenerateAIInsights();
      setAiReport(report);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to generate AI insights. Please check your Gemini API key.");
    } finally {
      setAiLoading(false);
    }
  };

  // Setup Performance Calculations
  const setupStatsList = useMemo(() => {
    const SetupTypes = ["Breakout", "Pullback", "Reversal", "Liquidity Sweep", "Trend Continuation", "Other"];
    const stats: Record<string, { count: number; wins: number; totalProfit: number; totalLoss: number; totalRR: number }> = {};
    
    SetupTypes.forEach(st => {
      stats[st] = { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, totalRR: 0 };
    });

    trades.forEach(t => {
      const sType = t.setupType || "Other";
      const pnl = Number(t.profitLoss) || 0;
      const isWin = t.status === "WIN";
      const rr = t.riskRewardRatio || 1.5;

      if (!stats[sType]) {
        stats[sType] = { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, totalRR: 0 };
      }

      stats[sType].count++;
      stats[sType].totalRR += rr;
      if (isWin) {
        stats[sType].wins++;
        stats[sType].totalProfit += pnl;
      } else if (t.status === "LOSS") {
        stats[sType].totalLoss += Math.abs(pnl);
      }
    });

    return Object.entries(stats).map(([setup, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      const netResult = data.totalProfit - data.totalLoss;
      const avgRR = data.count > 0 ? (data.totalRR / data.count) : 1.5;

      return {
        setup,
        count: data.count,
        winRate: Math.round(winRate),
        netResult,
        avgRiskReward: Number(avgRR.toFixed(1))
      };
    }).sort((a, b) => b.netResult - a.netResult);
  }, [trades]);

  const bestSetup = setupStatsList.find(s => s.count > 0);
  const worstSetup = [...setupStatsList].reverse().find(s => s.count > 0);

  // Overall Trader DNA profile
  const traderDNA = useMemo(() => {
    if (trades.length === 0) {
      return {
        type: "Emerging Trader",
        description: "Log at least 2 trades to unlock your personalized behavioral DNA profile."
      };
    }

    const sizes = trades.map(t => t.size || 0.1);
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;

    if (avgSize >= 1.0) {
      return {
        type: "High-Volume Momentum Trader",
        description: "Fast entries with larger position sizing. Focus on quick profit taking."
      };
    } else if (avgSize < 0.2) {
      return {
        type: "Conservative Precision Trader",
        description: "Carefully calibrated lot sizing with wider stop-loss margins and steady risk control."
      };
    }
    return {
      type: "Balanced Swing & Day Trader",
      description: "Consistent risk allocation with structured technical entries across prime sessions."
    };
  }, [trades]);

  // Overall Quality Score (1-100)
  const averageQualityScore = useMemo(() => {
    if (trades.length === 0) return 0;
    let totalScore = 0;
    trades.forEach(t => {
      let score = 50;
      if (t.qualityScore) score += t.qualityScore * 6;
      if (t.status === "WIN") score += 10;
      if ((t.riskRewardRatio || 1.5) >= 2.0) score += 10;
      if (t.emotionalState === "calm" || t.emotionalState === "confident") score += 10;
      if (t.emotionalState === "revenge" || t.emotionalState === "fomo") score -= 20;
      totalScore += Math.max(10, Math.min(100, score));
    });
    return Math.round(totalScore / trades.length);
  }, [trades]);

  return (
    <div id="coach-workspace" className="space-y-6">

      {/* 1. AI PERFORMANCE COACH AUDIT SECTION */}
      <div id="ai-coach-audit-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500/10 p-2.5 rounded-xl text-amber-400 border border-amber-500/20">
              <Brain size={22} />
            </div>
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono text-slate-200">
                AI Trading Performance Coach
              </h3>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Analyzes psychology, timing patterns, and provides personalized strategic guidance
              </p>
            </div>
          </div>

          <button
            id="btn-run-ai-coach-audit"
            onClick={handleRunAudit}
            disabled={aiLoading || trades.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all self-stretch sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {aiLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Auditing Performance...
              </>
            ) : (
              <>
                <Sparkles size={14} />
                Run AI Coach Audit
              </>
            )}
          </button>
        </div>

        {aiError && (
          <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-3 rounded-lg text-xs flex items-center gap-2">
            <ShieldAlert size={15} className="flex-shrink-0" />
            <span>{aiError}</span>
          </div>
        )}

        {/* AI Report Content Container */}
        <div className="bg-slate-950 rounded-xl p-5 border border-slate-850">
          {aiReport ? (
            <div className="prose prose-invert prose-xs max-w-none text-slate-300 space-y-3 font-sans">
              {aiReport.split("\n").map((line, idx) => {
                if (line.startsWith("###")) {
                  return <h5 key={idx} className="text-slate-100 font-bold text-xs uppercase font-mono mt-3 mb-1">{line.replace("###", "").trim()}</h5>;
                }
                if (line.startsWith("##")) {
                  return <h4 key={idx} className="text-emerald-400 font-bold text-sm uppercase mt-4 mb-1 border-b border-slate-850 pb-1">{line.replace("##", "").trim()}</h4>;
                }
                if (line.startsWith("#")) {
                  return <h3 key={idx} className="text-emerald-400 font-bold text-base uppercase mt-2 mb-2">{line.replace("#", "").trim()}</h3>;
                }
                if (line.startsWith("-") || line.startsWith("*")) {
                  const txt = line.replace(/^[-*]\s*/, "").trim();
                  return (
                    <li key={idx} className="list-disc ml-4 text-xs text-slate-300">
                      {txt.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-white font-semibold">{tok}</strong> : tok)}
                    </li>
                  );
                }
                if (!line.trim()) return <div key={idx} className="h-1" />;
                return (
                  <p key={idx} className="text-xs text-slate-300 leading-relaxed">
                    {line.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-slate-100">{tok}</strong> : tok)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-10 text-slate-500">
              <Sparkles className="mx-auto mb-2 text-amber-400/40 animate-pulse" size={28} />
              <p className="text-xs text-slate-400">No audit generated yet.</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                {trades.length === 0 ? "Log trades in your journal to unlock AI analysis." : "Click 'Run AI Coach Audit' above to generate your tactical review."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 2. THREE CORE TRADER HIGHLIGHT CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Trader DNA */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Trader DNA Profile</span>
            <h4 className="text-sm font-bold text-slate-200 mt-1">{traderDNA.type}</h4>
            <p className="text-xs text-slate-400 leading-relaxed mt-1 font-sans">{traderDNA.description}</p>
          </div>
          <div className="text-[10px] text-indigo-400 font-mono pt-2 border-t border-slate-850">
            Strategy Match: {trades.length} trades evaluated
          </div>
        </div>

        {/* Setup Edge Highlights */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Best Setup Edge</span>
            <div className="mt-1 space-y-1 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Highest Profit Setup:</span>
                <span className="font-bold text-emerald-400">{bestSetup ? bestSetup.setup : "None"}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-850">
                <span className="text-slate-400">Highest Risk Setup:</span>
                <span className="font-bold text-rose-400">{worstSetup && worstSetup.netResult < 0 ? worstSetup.setup : "None"}</span>
              </div>
            </div>
          </div>
          <div className="text-[10px] text-emerald-400 font-mono pt-2 border-t border-slate-850">
            {bestSetup ? `${bestSetup.winRate}% Win Rate on ${bestSetup.setup}` : "Focus on high-confluence setups."}
          </div>
        </div>

        {/* Overall Quality Grade */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white space-y-2 flex flex-col justify-between">
          <div>
            <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider block">Overall Execution Score</span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-bold font-mono text-amber-400">{averageQualityScore}</span>
              <span className="text-xs font-mono text-slate-500">/ 100</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 font-sans">
              {averageQualityScore >= 75 ? "High tactical execution discipline." : "Focus on strict stop-loss adherence."}
            </p>
          </div>
          <div className="text-[10px] text-slate-500 font-mono pt-2 border-t border-slate-850">
            Calculated from setup quality, RR, and mindset
          </div>
        </div>
      </div>

      {/* 3. DUAL SECTION: SETUP PERFORMANCE TABLE & 30-DAY HABIT CHALLENGE */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Setup Performance Table (2 cols) */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3">
          <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
            <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
              <Network size={15} className="text-indigo-400" />
              Setup Performance Breakdown
            </h4>
            <span className="text-[10px] font-mono text-slate-500">By Setup Type</span>
          </div>

          {trades.length === 0 ? (
            <p className="text-xs text-slate-600 text-center py-10">No trade logs found to calculate setup performance.</p>
          ) : (
            <div className="space-y-2.5">
              {setupStatsList.map((st, idx) => {
                if (st.count === 0) return null;
                const isProfitable = st.netResult >= 0;
                return (
                  <div
                    key={idx}
                    className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex justify-between items-center"
                  >
                    <div>
                      <span className="text-xs font-bold text-slate-200">{st.setup}</span>
                      <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                        {st.count} trade{st.count !== 1 ? "s" : ""} • Avg RR {st.avgRiskReward}:1
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                        st.winRate >= 50 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                      }`}>
                        {st.winRate}% WR
                      </span>
                      <span className={`text-xs font-mono font-bold block mt-1 ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                        {isProfitable ? "+" : ""}${st.netResult.toFixed(2)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 30-Day Habit Streak Tracker (1 col) */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-3 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
              <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                <CalendarCheck size={15} className="text-emerald-400" />
                30-Day Discipline Tracker
              </h4>
              <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/40 border border-emerald-900/60 px-2 py-0.5 rounded">
                {completedDaysCount}/30 Days
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
              Mark off days where you strictly obeyed your rules and risk limit without breaking discipline:
            </p>

            <div className="grid grid-cols-6 gap-2 pt-1">
              {challengeChecked.map((isChecked, idx) => (
                <button
                  key={idx}
                  onClick={() => handleToggleDay(idx)}
                  className={`aspect-square rounded-lg border text-xs font-mono font-bold flex items-center justify-center transition-all cursor-pointer ${
                    isChecked
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-xs"
                      : "bg-slate-950 text-slate-500 border-slate-850 hover:border-slate-700"
                  }`}
                  title={`Day ${idx + 1}`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="text-[10px] font-mono text-slate-500 pt-3 border-t border-slate-850/80">
            🎯 Build consistency through 30 unbroken disciplined trading sessions.
          </div>
        </div>

      </div>

    </div>
  );
}
