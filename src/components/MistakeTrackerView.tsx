import React, { useState } from "react";
import { AlertCircle, Brain, Smile, Activity, RefreshCw, BarChart4, Compass, Award, ShieldAlert, HeartCrack, ChevronRight } from "lucide-react";
import { Trade } from "../types";

interface MistakeTrackerViewProps {
  trades: Trade[];
}

export default function MistakeTrackerView({ trades }: MistakeTrackerViewProps) {
  const [selectedEmotionFilter, setSelectedEmotionFilter] = useState<string>("ALL");

  // Calculate Streak Analytics
  const calculateStreaks = () => {
    if (trades.length === 0) {
      return {
        bestWinStreak: 0,
        currentStreak: 0,
        currentStreakType: "NONE" as "WIN" | "LOSS" | "NONE",
        streakDriftRisk: "Low"
      };
    }

    // Sort chronologically (oldest first to process sequentially)
    const cronTrades = [...trades].sort((a,b) => a.entryDate.localeCompare(b.entryDate));

    let maxWinStreak = 0;
    let currentWinStreak = 0;
    
    let currentStreakCount = 0;
    let currentStreakType: string = "NONE";
    
    let driftWarning = "Low";

    cronTrades.forEach((t) => {
      const isWin = t.status === "WIN";
      
      if (isWin) {
        currentWinStreak++;
        if (currentWinStreak > maxWinStreak) {
          maxWinStreak = currentWinStreak;
        }

        if (currentStreakType === "WIN") {
          currentStreakCount++;
        } else {
          currentStreakType = "WIN";
          currentStreakCount = 1;
        }
      } else if (t.status === "LOSS") {
        currentWinStreak = 0;
        if (currentStreakType === "LOSS") {
          currentStreakCount++;
        } else {
          currentStreakType = "LOSS";
          currentStreakCount = 1;
        }
      } else {
        // BREAK EVEN: don't break, skip or preserve
      }
    });

    if (currentStreakType === "WIN" && currentStreakCount >= 3) {
      driftWarning = "⚠️ Overconfidence Risk: Lot-size drift warning. Slow down setups.";
    } else if (currentStreakType === "LOSS" && currentStreakCount >= 3) {
      driftWarning = "🚨 Tilt Overtrading Alert: Revenge triggers detected. Pause dashboard.";
    }

    return {
      bestWinStreak: maxWinStreak,
      currentStreak: currentStreakCount,
      currentStreakType,
      streakDriftRisk: driftWarning
    };
  };

  const streakStats = calculateStreaks();

  // Evaluate Mistake Statistics
  const getMistakeStatistics = () => {
    // Categories count & cost
    // Tags: 'FOMO', 'Revenge trade', 'Overtrading', 'Early exit', 'Late entry', 'Ignored stop loss', 'News trade', 'Emotional trade'
    const mistakeMetrics: Record<string, { count: number; cost: number; description: string }> = {
      "FOMO": { count: 0, cost: 0, description: "Fear Of Missing Out. Entering setups late without clean support confluence." },
      "Revenge trade": { count: 0, cost: 0, description: "Forcing entry sizes right after a loss to make back capital rapidly." },
      "Overtrading": { count: 0, cost: 0, description: "Trading outside focus session ranges, racking up excessive commissions." },
      "Early exit": { count: 0, cost: 0, description: "Bailing on winning targets too early due to fear, leaving large risk/reward gains behind." },
      "Late entry": { count: 0, cost: 0, description: "Chasing a move after it has already extended past comfortable risk stops." },
      "Ignored stop loss": { count: 0, cost: 0, description: "Moving stop-loss structures wider, widening localized drawdowns." },
      "News trade": { count: 0, cost: 0, description: "Executing setups during blind high-slippage fundamental news releases." },
      "Emotional trade": { count: 0, cost: 0, description: "Sloppy execution lacking rule check due to anxiety or physical fatigue." }
    };

    let totalMistakeCount = 0;
    let totalMistakeLosses = 0;

    // Track mistakes by hour of day (0..23) to assess hourly densities
    const hourlyMistakesDensity: Record<number, number> = {};
    for (let h = 0; h < 24; h++) hourlyMistakesDensity[h] = 0;

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
          
          if (t.entryTime) {
            const hr = parseInt(t.entryTime.split(":")[0]);
            if (!isNaN(hr)) {
              hourlyMistakesDensity[hr] = (hourlyMistakesDensity[hr] || 0) + 1;
            }
          }
        }
      });
    });

    const rankList = Object.entries(mistakeMetrics)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a,b) => b.cost - a.cost);

    // Find prime high-risk hours for mistakes
    const highRiskHours = Object.entries(hourlyMistakesDensity)
      .map(([hrStr, count]) => ({ hour: parseInt(hrStr), count }))
      .sort((a,b) => b.count - a.count)
      .filter(h => h.count > 0);

    return {
      totalMistakeCount,
      totalMistakeLosses,
      byMistake: rankList,
      highRiskHoursList: highRiskHours.slice(0, 3)
    };
  };

  const mistakeStatsInfo = getMistakeStatistics();

  // Psychological Journal correlation stats helper
  const getPsychologicalCorrelations = () => {
    // group trades by emotionalState state
    const correlations: Record<string, { count: number; netResult: number; wins: number; avgConfidence: number }> = {};
    
    trades.forEach(t => {
      const state = t.emotionalState || "calm";
      const pnl = Number(t.profitLoss) || 0;
      const isWin = t.status === "WIN";
      const confidence = t.psychConfidence || 5;

      if (!correlations[state]) {
        correlations[state] = { count: 0, netResult: 0, wins: 0, avgConfidence: 0 };
      }

      correlations[state].count++;
      correlations[state].netResult += pnl;
      if (isWin) correlations[state].wins++;
      correlations[state].avgConfidence += confidence;
    });

    return Object.entries(correlations).map(([emotion, data]) => {
      const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
      const avgConf = data.count > 0 ? (data.avgConfidence / data.count) : 5;
      return {
        emotion,
        count: data.count,
        netResult: data.netResult,
        winRate: Math.round(winRate),
        avgConfidence: Number(avgConf.toFixed(1))
      };
    }).sort((a,b) => b.netResult - a.netResult);
  };

  const emotionalCorrelations = getPsychologicalCorrelations();

  // Drawdown Intelligence calculations
  const calculateDrawdownStats = () => {
    if (trades.length === 0) {
      return { maxDrawdown: 0, currentDrawdown: 0, startSource: "N/A" };
    }

    // Sort oldest first
    const cronTrades = [...trades].sort((a,b) => a.entryDate.localeCompare(b.entryDate));
    
    let peak = 0;
    let balance = 10000; // pivot value
    let maxDD = 0;
    let currentDD = 0;
    
    let drawdownStartTrade: Trade | null = null;
    let inDrawdown = false;

    cronTrades.forEach(t => {
      balance += (Number(t.profitLoss) || 0);
      if (balance > peak) {
        peak = balance;
        inDrawdown = false;
      } else {
        if (!inDrawdown) {
          drawdownStartTrade = t; // Found start of drawdown!
          inDrawdown = true;
        }
        const dd = ((peak - balance) / peak) * 100;
        if (dd > maxDD) {
          maxDD = dd;
        }
        currentDD = dd;
      }
    });

    return {
      maxDrawdown: Number(maxDD.toFixed(1)),
      currentDrawdown: Number(currentDD.toFixed(1)),
      startSource: drawdownStartTrade ? `${(drawdownStartTrade as Trade).symbol} (${(drawdownStartTrade as Trade).entryTime} NY)` : "N/A",
      startMistake: drawdownStartTrade ? ((drawdownStartTrade as Trade).mistakeTags?.[0] || "No Mistake Tagged") : "N/A"
    };
  };

  const drawdownIntel = calculateDrawdownStats();

  return (
    <div id="mistake-analysis-workspace" className="space-y-6">

      {/* 1. STREAKS & DRAWDOWN EXECUTIVE HEADER CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Drawdown Intelligence Card */}
        <div id="dd-intel-card" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Drawdown Intelligence</span>
              <span className="text-xs bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold">Max DD: {drawdownIntel.maxDrawdown}%</span>
            </div>
            
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-400">Current active drawdown:</span>
                <span className="font-mono text-slate-200 font-bold">{drawdownIntel.currentDrawdown}%</span>
              </div>
              <div className="flex justify-between text-xs pt-1 border-t border-slate-850">
                <span className="text-slate-400">Frequent drawdown trigger:</span>
                <span className="font-mono text-rose-400 font-bold max-w-[130px] truncate" title={drawdownIntel.startMistake}>
                  {drawdownIntel.startMistake}
                </span>
              </div>
            </div>
          </div>
          
          <div className="mt-4 pt-2 border-t border-slate-850 text-[10px] text-slate-500 font-mono">
            💡 Drawdowns usually initiate with a single late chase trade.
          </div>
        </div>

        {/* Dynamic Streak Assessment Card */}
        <div id="streak-assessment-card" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Historical System Streaks</span>
              <span className="text-xs bg-emerald-500/10 text-emerald-450 border border-emerald-500/20 px-2 py-0.5 rounded font-mono font-bold">Best Win Streak: {streakStats.bestWinStreak}</span>
            </div>

            <div className="mt-3.5 space-y-1.5">
              <p className="text-xs text-slate-400">Current active sequence:</p>
              <div className="flex items-center gap-2">
                <span className={`text-xl font-bold font-mono ${streakStats.currentStreakType === "WIN" ? "text-emerald-400" : "text-rose-450"}`}>
                  {streakStats.currentStreak} {streakStats.currentStreakType} SPREE
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                {streakStats.streakDriftRisk}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-850 text-[10px] text-slate-500 font-mono">
            ⚖️ Compounding win sprees frequently causes risk control breaches.
          </div>
        </div>

        {/* Psychological Slider Summary Metric */}
        <div id="emotional-grade-overview-card" className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">Trading Psychology Rating</span>
              <span className="text-xs bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded font-mono font-bold">H1 Emotional Index</span>
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="text-xs text-slate-400">Your most profitable emotional frame value:</p>
              {emotionalCorrelations.length > 0 ? (
                <div className="space-y-1">
                  <span className="text-sm font-bold uppercase text-emerald-400 flex items-center gap-1">
                    <Smile size={14} />
                    {emotionalCorrelations[0].emotion} Mode ({emotionalCorrelations[0].winRate}% Win-Rate)
                  </span>
                  <span className="text-[10px] text-slate-400 block font-mono">
                    Net result in this frame: +${emotionalCorrelations[0].netResult.toFixed(1)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-slate-500 italic pt-1">Initialize emotional logs inside the trade setup entries.</p>
              )}
            </div>
          </div>

          <div className="mt-4 pt-2 border-t border-slate-850 text-[10px] text-slate-500 font-mono">
            🧠 High stress inputs yield tight exits and decreased holding discipline.
          </div>
        </div>

      </div>

      {/* 2. MAIN SECTION: COST OF MISTAKES TABLE & ANALYSIS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Cost of mistakes ranking breakdown */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 p-5 rounded-xl text-white space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <HeartCrack size={16} className="text-rose-450" />
              Behavioral Mistakes tracker Leakage List
            </h4>
            <span className="text-[10px] bg-rose-950 text-rose-400 px-2.5 py-0.5 border border-rose-900 rounded font-mono font-bold">
              Total Leakage Cost: -${mistakeStatsInfo.totalMistakeLosses.toFixed(2)}
            </span>
          </div>

          {trades.length === 0 ? (
            <p className="text-xs text-slate-500 py-12 text-center">Execute trades setup journal to analyze leakage cost analytics.</p>
          ) : (
            <div id="mistakes-detailed-table" className="space-y-3">
              {mistakeStatsInfo.byMistake.map((m, idx) => (
                <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3 hover:border-slate-750 transition-all">
                  <div className="space-y-1 md:max-w-md">
                    <div className="flex items-center gap-2">
                      <strong className="text-xs text-slate-105 font-bold">{m.name}</strong>
                      <span className="text-[9px] bg-slate-900 text-slate-400 px-2 py-0.2 rounded font-mono font-semibold">{m.count} setup events</span>
                    </div>
                    <p className="text-[10px] text-slate-500 leading-relaxed font-sans">{m.description}</p>
                  </div>

                  <div className="text-left md:text-right">
                    <span className="text-[9px] text-slate-500 uppercase font-mono block">Direct PnL Cost</span>
                    <span className={`text-sm font-mono font-bold ${m.cost > 0 ? "text-rose-405" : "text-slate-400"}`}>
                      {m.cost > 0 ? `-$${m.cost.toFixed(2)}` : "$0.00 (Untriggered)"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right card: Hourly densities & psychological correlations list */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Mistake Densities</span>
              <h4 className="text-sm font-bold text-slate-205 mt-0.5">High-Risk Hourly Triggers</h4>
            </div>

            {mistakeStatsInfo.highRiskHoursList.length === 0 ? (
              <p className="text-xs text-slate-550 italic py-10 text-center">No high density mistake hour cluster recorded yet.</p>
            ) : (
              <div className="space-y-3">
                <p className="text-[11px] text-slate-400">Most common hours your rules or mistake tags trigger:</p>
                {mistakeStatsInfo.highRiskHoursList.map((cl, idx) => (
                  <div key={idx} className="bg-slate-950 p-2.5 rounded border border-slate-850 flex justify-between items-center text-xs">
                    <span className="font-mono text-slate-202 font-bold">{cl.hour}:00 IST +5:30 Hour</span>
                    <span className="text-rose-400 font-mono font-bold">{cl.count} mistake occurrences</span>
                  </div>
                ))}
              </div>
            )}

            {/* Psychological list */}
            <div className="border-t border-slate-850 pt-4 mt-2">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Correlation Matrix</span>
              <h4 className="text-xs font-bold text-slate-300 mt-1 mb-2">Emotion VS Performance outcome</h4>
              
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {emotionalCorrelations.map((ec, idx) => (
                  <div key={idx} className="flex justify-between items-center text-[11px] py-1 border-b border-slate-950">
                    <span className="uppercase text-slate-350 font-mono font-bold">{ec.emotion}</span>
                    <div className="flex gap-3 text-right font-mono">
                      <span className="text-slate-550">{ec.count} trades</span>
                      <span className={ec.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}>
                        {ec.netResult >= 0 ? "+" : ""}${ec.netResult.toFixed(0)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-2.5 rounded text-[10px] text-slate-500 font-mono mt-4 leading-normal">
            🛡️ Tag your setups with an accurate Emotional State inside the Trade Journal form to track focus correlations real-time.
          </div>
        </div>

      </div>

    </div>
  );
}
