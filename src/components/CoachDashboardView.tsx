import React, { useState } from "react";
import { Brain, Sparkles, Award, Zap, Award as Trophy, Network, Flame, CalendarRange, ChevronRight, CheckCircle2, ShieldX, HelpCircle } from "lucide-react";
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
  const challengeStreak = completedDaysCount;

  // Run AI Coach Audit
  const handleRunAudit = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const report = await onGenerateAIInsights();
      setAiReport(report);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Failed to reach system AI endpoints. Please ensure Gemini API credentials are set.");
    } finally {
      setAiLoading(false);
    }
  };

  // 1. SETUP PERFORMANCE DATABASE CALCULATIONS
  const getSetupPerformance = () => {
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
      const profitFactor = data.totalLoss > 0 ? (data.totalProfit / data.totalLoss) : data.totalProfit > 0 ? 9.9 : 1.0;

      return {
        setup,
        count: data.count,
        winRate: Math.round(winRate),
        netResult,
        avgRiskReward: Number(avgRR.toFixed(1)),
        profitFactor: Number(profitFactor.toFixed(1))
      };
    }).sort((a,b) => b.netResult - a.netResult);
  };

  const setupStatsList = getSetupPerformance();
  const bestSetupType = setupStatsList[0];
  const worstSetupType = setupStatsList[setupStatsList.length - 1];

  // 2. PROFIT / LOSS CONCENTRATION CALCULATIONS
  const getConcentrationStats = () => {
    if (trades.length === 0) return { profitCon: 0, lossCon: 0 };
    
    const wins = trades.filter(t => Number(t.profitLoss) > 0).map(t => Number(t.profitLoss));
    const losses = trades.filter(t => Number(t.profitLoss) < 0).map(t => Math.abs(Number(t.profitLoss)));
    
    const totalWinsBox = wins.reduce((sum, v) => sum + v, 0);
    const totalLossBox = losses.reduce((sum, v) => sum + v, 0);

    // Profit concentration: % of profits made by the single biggest trade
    const maxWin = wins.length > 0 ? Math.max(...wins) : 0;
    const profitConcentration = totalWinsBox > 0 ? (maxWin / totalWinsBox) * 100 : 0;

    // Loss concentration: % of losses driven by the single biggest loss
    const maxLoss = losses.length > 0 ? Math.max(...losses) : 0;
    const lossConcentration = totalLossBox > 0 ? (maxLoss / totalLossBox) * 100 : 0;

    return {
      profitCon: Math.round(profitConcentration),
      lossCon: Math.round(lossConcentration),
      maxWin,
      maxLoss
    };
  };

  const concentration = getConcentrationStats();

  // 3. PERSONAL TRADING DNA DEFINER
  const getTradingDNA = () => {
    if (trades.length === 0) {
      return {
        traderType: "Pending evaluation",
        holdProfile: "Balanced hold profile",
        recommendedFocus: "Journal 2+ trades to unlock strategic suggestions"
      };
    }

    const sizes = trades.map(t => t.size);
    const avgSize = sizes.reduce((sum, s) => sum + s, 0) / sizes.length;
    
    let type = "Intermediate Swing Trader";
    let holdText = "Tactically balances day scaling and trend-holding";
    let recommended = "Align setups strictly with London liquidity sessions to increase profit factors.";

    if (avgSize >= 1.5) {
      type = "Prop Scalper / Momentum Trader";
      holdText = "High-velocity active entries with tight targets";
      recommended = "Avoid NY late session consolidation ranges to protect capital.";
    } else if (avgSize < 0.25) {
      type = "Macro Swing Investor / Day Trader";
      holdText = "Generous stop-loss ranges with wider holding margins";
      recommended = "Allow confluences of support/resistance structure to trigger before size entries.";
    }

    return {
      traderType: type,
      holdProfile: holdText,
      recommendedFocus: recommended
    };
  };

  const traderDNA = getTradingDNA();

  // 4. COMPUTED TRADE SCORE SYSTEM
  const calculateAggregateScore = (t: Trade) => {
    // Score based on Setup Quality, emotionalState state, Rule adherence, riskReward
    let score = 50; // base scale
    
    if (t.qualityScore) score += t.qualityScore * 6; // up to +30 points
    
    const isWin = t.status === "WIN";
    if (isWin) score += 10;
    
    const rr = t.riskRewardRatio || 1.5;
    if (rr >= 2.0) score += 10;

    // Emotional multipliers
    if (t.emotionalState === "calm" || t.emotionalState === "confident") score += 10;
    if (t.emotionalState === "revenge" || t.emotionalState === "fomo") score -= 25;

    // Boundary constraints
    return Math.max(10, Math.min(100, score));
  };

  const getSystemAverageTradeScore = () => {
    if (trades.length === 0) return 0;
    const scores = trades.map(t => calculateAggregateScore(t));
    const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
    return Math.round(avg);
  };

  const computedAveScore = getSystemAverageTradeScore();

  return (
    <div id="coach-executive-canvas" className="space-y-6">

      {/* 1. COMPREHENSIVE EXECUTIVE AUDITING CARD BOARD */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        
        {/* Trading DNA Card */}
        <div id="card-trading-dna" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Trading DNA Matrix</span>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold">DNA Profile</span>
            </div>

            <div className="mt-4 space-y-1">
              <h4 className="text-sm font-bold text-slate-201">{traderDNA.traderType}</h4>
              <p className="text-[11px] text-slate-400 leading-relaxed pt-1">{traderDNA.holdProfile}</p>
            </div>
          </div>
          
          <div className="text-[10px] text-emerald-400 font-mono mt-4 pt-1 border-t border-slate-850">
            🌿 Action Focus: {bestSetupType?.setup ? `${bestSetupType.setup} are your golden edge.` : "Pending logs."}
          </div>
        </div>

        {/* Profit / Loss Concentration Card */}
        <div id="card-concentration" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Risk Concentration</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">Concentrations</span>
            </div>

            <div className="mt-3 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Profit concentration:</span>
                <span className="font-mono text-emerald-400 font-bold">{concentration.profitCon}%</span>
              </div>
              <div className="flex justify-between pt-1 border-t border-slate-850">
                <span className="text-slate-400">Loss concentration:</span>
                <span className="font-mono text-rose-400 font-bold">{concentration.lossCon}%</span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4">
            🔥 High loss concentration suggests single-trade over-leveraging risks.
          </div>
        </div>

        {/* Computed Trade Score System */}
        <div id="card-trade-score-system" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Trade Score System</span>
              <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded font-mono font-bold">Execution</span>
            </div>

            <div className="mt-3.5 space-y-1">
              <span className="text-[10px] text-slate-400 block font-mono">System Overall Quality Grade</span>
              <span className="text-2xl font-bold font-mono text-amber-400">{computedAveScore}/100</span>
              <p className="text-[10px] text-slate-450 leading-relaxed pt-1">Derived mathematically from Setup, Execution, Risk, and Compliance.</p>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4 pt-1 border-t border-slate-850">
            📊 Level: {computedAveScore >= 75 ? "Consistent Execution Elite" : "Adherence optimization required"}
          </div>
        </div>

        {/* Setup Database overview stats */}
        <div id="card-setup-metrics-highlight" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Golden vs Pitfall Setups</span>
              <span className="text-xs bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded font-mono font-bold">Metrics</span>
            </div>

            <div className="mt-3 space-y-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-slate-400">Best Edge: <strong>{bestSetupType?.setup || "None"}</strong></span>
              </div>
              <div className="flex items-center gap-1.5 pt-1 border-t border-slate-850">
                <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                <span className="text-slate-400">Pitfall: <strong>{worstSetupType?.setup || "None"}</strong></span>
              </div>
            </div>
          </div>

          <div className="text-[10px] text-slate-500 font-mono mt-4">
            📉 Focus purely on Best Edge configurations to eliminate noise drawdown.
          </div>
        </div>

      </div>

      {/* 2. SETUP PERFORMANCE DATABASE & REPORT GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Setup performance Database */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 p-5 rounded-xl text-white space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Network size={16} className="text-indigo-400" />
              Comprehensive Setup Performance Database
            </h4>
            <span className="text-[10px] bg-slate-805 text-slate-400 border border-slate-800 px-2 py-0.5 rounded font-mono">Statistical analysis</span>
          </div>

          {trades.length === 0 ? (
            <p className="text-xs text-slate-550 italic py-12 text-center">No trades logged to construct Setup Performance matrix.</p>
          ) : (
            <div className="space-y-3.5">
              {setupStatsList.map((st, idx) => {
                if (st.count === 0) return null;
                return (
                  <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-lg hover:border-slate-750 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-slate-200 block">{st.setup} Configuration</span>
                        <span className="text-[10px] text-slate-500 block font-mono mt-0.5">
                          {st.count} setups analyzed • Average R Ratio {st.avgRiskReward}:1
                        </span>
                      </div>
                      
                      <div className="text-right">
                        <span className="text-xs bg-indigo-950 text-indigo-400 font-mono border border-indigo-900/50 px-2.5 py-0.5 rounded font-bold">
                          {st.winRate}% Win-Rate
                        </span>
                        <span className={`block font-mono text-xs font-bold mt-1 ${st.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          PnL net: {st.netResult >= 0 ? "+" : ""}${st.netResult.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right card: 30-Day Trading Discipline Challenge Checklist */}
        <div id="challenge-checklist-container" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div className="space-y-3">
            <div className="border-b border-slate-800 pb-2">
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-slate-500 font-mono uppercase block">30-day Accountability</span>
                <span className="text-xs bg-emerald-500/10 text-emerald-440 border border-emerald-500/20 px-20 py-0.5 rounded-full font-mono font-bold whitespace-nowrap">Streak: {challengeStreak} Days</span>
              </div>
              <h4 className="text-xs font-bold text-slate-205 mt-1">Discipline Streak Challenge Checklist</h4>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pb-1">Did you follow your strict limits each session? Check off dates on successful completion!</p>
            
            <div className="grid grid-cols-6 gap-1.5 max-h-[160px] overflow-y-auto">
              {challengeChecked.map((chk, idx) => (
                <button
                  key={idx}
                  id={`btn-toggle-day-${idx}`}
                  onClick={() => handleToggleDay(idx)}
                  className={`aspect-square rounded border font-mono text-[10px] font-bold flex items-center justify-center cursor-pointer transition-all ${
                    chk 
                      ? "bg-emerald-500 border-emerald-500 text-slate-950" 
                      : "bg-slate-955 border-slate-850 text-slate-500 hover:border-slate-705 text-slate-350"
                  }`}
                  title={`Day ${idx + 1}`}
                >
                  {chk ? "✓" : idx + 1}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-850 pt-3 mt-4 flex justify-between items-center text-xs">
            <span className="text-slate-400 font-mono">Discipline Progress:</span>
            <span className="font-bold font-mono text-emerald-400">{completedDaysCount}/30 Days Checked</span>
          </div>
        </div>

      </div>

      {/* 3. AI PERFORMANCE COACH OUTPUT AUDITING PANEL */}
      <div id="ai-performance-coach-audit-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono flex items-center gap-2">
              <Brain size={16} className="text-emerald-400" />
              Elite AI trading Performance Coach Audit
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Synthesize overall setup quality, entry timing, and psychological habit anomalies.</p>
          </div>
          <button
            id="btn-run-ai-coach-audit"
            onClick={handleRunAudit}
            disabled={aiLoading || trades.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all self-stretch sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pointer-events-auto"
          >
            {aiLoading ? (
              <>
                <Sparkles size={14} className="animate-spin" />
                Evaluating Trading DNA...
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
          <div id="ai-error-banner" className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-3 text-xs mb-3">
            <span>{aiError}</span>
          </div>
        )}

        <div id="ai-report-box" className="bg-slate-950 rounded-xl p-5 border border-slate-850">
          {aiReport ? (
            <div id="ai-report-markdown-content" className="prose prose-invert prose-xs max-w-none text-slate-300 space-y-4">
              {aiReport.split("\n").map((line, idx) => {
                // Parse headers nicely
                if (line.startsWith("###")) {
                  return <h5 key={idx} className="text-slate-100 font-bold border-b border-slate-850 pb-1 mt-4 text-xs font-mono uppercase">{line.replace("###", "").trim()}</h5>;
                }
                if (line.startsWith("##")) {
                  return <h4 key={idx} className="text-emerald-400 font-bold border-b border-slate-800 pb-1.5 mt-4 text-sm uppercase">{line.replace("##", "").trim()}</h4>;
                }
                if (line.startsWith("#")) {
                  return <h3 key={idx} className="text-emerald-400 font-bold text-base tracking-wider uppercase">{line.replace("#", "").trim()}</h3>;
                }
                if (line.startsWith("-") || line.startsWith("*")) {
                  const txt = line.replace(/^[-*]\s*/, "").trim();
                  return (
                    <li key={idx} className="list-disc ml-4 text-xs font-sans text-slate-350 leading-relaxed">
                      {txt.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-white font-semibold">{tok}</strong> : tok)}
                    </li>
                  );
                }
                // Paragraph text
                return (
                  <p key={idx} className="text-xs text-slate-300 leading-relaxed font-sans">
                    {line.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-slate-100">{tok}</strong> : tok)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div id="ai-coach-placeholder" className="text-center py-12 text-slate-500">
              <Sparkles className="mx-auto mb-3 text-slate-650 opacity-40 animate-pulse" size={32} />
              <p className="text-xs">No audit report generated yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Click "Run AI Coach Audit" to activate the deep behavioral diagnostics layer.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
