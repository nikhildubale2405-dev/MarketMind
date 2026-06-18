import React, { useState, useEffect } from "react";
import { CheckSquare, AlertTriangle, ShieldCheck, TrendingUp, Sliders, Play, TrendingDown, HelpCircle, AlertCircle, Info, Plus } from "lucide-react";
import { Trade, Transaction } from "../types";

interface Rule {
  id: string;
  name: string;
  category: "RISK" | "TIME" | "SETUP" | "EMOTION";
  description: string;
  ruleCode: string; // for automated checking: 'RISK_1_PCT', 'LONDON_ONLY', 'MIN_RR_2', 'MAX_LOSS_3', 'XAU_ONLY'
  active: boolean;
}

interface RuleComplianceViewProps {
  trades: Trade[];
  transactions: Transaction[];
}

const DEFAULT_RULES: Rule[] = [
  {
    id: "r1",
    name: "Max Risk 1% Per Trade",
    category: "RISK",
    description: "Your stop-loss loss amount must not exceed 1% of your current account funding balance.",
    ruleCode: "RISK_1_PCT",
    active: true
  },
  {
    id: "r2",
    name: "No Trading After 3 Losses",
    category: "RISK",
    description: "Stop trading entirely on any day you have hit 3 consecutive losses to avoid tilt overtrading.",
    ruleCode: "MAX_LOSS_3",
    active: true
  },
  {
    id: "r3",
    name: "Minimum Risk/Reward 1:2",
    category: "RISK",
    description: "Every setup entered must verify a minimum target reward of double the stop loss distance.",
    ruleCode: "MIN_RR_2",
    active: true
  },
  {
    id: "r4",
    name: "Focus Sessions (London or NY)",
    category: "TIME",
    description: "Strictly execute setups during prime liquidity sessions. No low-volume Asian drift logs.",
    ruleCode: "LONDON_NY_SESSION",
    active: true
  },
  {
    id: "r5",
    name: "Golden Assets Only (XAU/USD)",
    category: "SETUP",
    description: "Build deep specialty. Only trade high specialty assets like Gold (XAU/USD) or BTC/USD.",
    ruleCode: "XAU_BTC_ONLY",
    active: true
  }
];

export default function RuleComplianceView({ trades, transactions }: RuleComplianceViewProps) {
  const [rules, setRules] = useState<Rule[]>(() => {
    const cached = localStorage.getItem("mm_custom_rules");
    return cached ? JSON.parse(cached) : DEFAULT_RULES;
  });

  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<"RISK" | "TIME" | "SETUP" | "EMOTION">("RISK");

  // Custom states for iframe sandboxing and clean UX
  const [confirmDeleteRuleId, setConfirmDeleteRuleId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState("");

  // Equity Curve Simulation parameters
  const [simRiskPct, setSimRiskPct] = useState(1); // 1% default
  const [startingBalance, setStartingBalance] = useState(10000);
  const [expectedWinRate, setExpectedWinRate] = useState(50); // %
  const [expectedRR, setExpectedRR] = useState(2); // 2:1

  useEffect(() => {
    localStorage.setItem("mm_custom_rules", JSON.stringify(rules));
  }, [rules]);

  // Balance calculation base
  const totalDeposits = transactions.filter(t => t.type === "DEPOSIT").reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === "WITHDRAWAL").reduce((sum, t) => sum + t.amount, 0);
  const coreSetupFund = totalDeposits - totalWithdrawals || startingBalance;

  // Rule Audit Calculations
  const runRulesAudit = () => {
    let auditedTradesCount = 0;
    let followedCount = 0;
    let brokenCount = 0;
    
    // Track damages
    let totalBrokenRuleLosses = 0;
    const ruleBreaksSummary: Record<string, { count: number; loss: number; name: string }> = {};

    rules.forEach(r => {
      ruleBreaksSummary[r.ruleCode || r.id] = { count: 0, loss: 0, name: r.name };
    });

    trades.forEach(t => {
      const pnl = Number(t.profitLoss) || 0;
      
      // We check active rules
      rules.forEach(r => {
        if (!r.active) return;
        
        let isBroken = false;
        
        // Dynamic simulated evaluation based on trade properties
        if (r.ruleCode === "RISK_1_PCT") {
          // If losing trade lost more than 1.5% of funding balance, mark as broken
          const lossAbs = Math.abs(pnl);
          if (t.status === "LOSS" && lossAbs > coreSetupFund * 0.015) {
            isBroken = true;
          }
        } else if (r.ruleCode === "MIN_RR_2") {
          const rr = t.riskRewardRatio || 1.5;
          if (rr < 2.0) {
            isBroken = true;
          }
        } else if (r.ruleCode === "LONDON_NY_SESSION") {
          const isOffSession = t.session === "Asian" || t.session === "Unknown";
          if (isOffSession) {
            isBroken = true;
          }
        } else if (r.ruleCode === "XAU_BTC_ONLY") {
          const asset = t.symbol.toUpperCase();
          if (!asset.includes("XAU") && !asset.includes("BTC")) {
            isBroken = true;
          }
        } else if (r.ruleCode === "MAX_LOSS_3") {
          // Checking emotional states that lead to breaks
          if (t.emotionalState === "revenge" || t.emotionalState === "greedy" || (t.notes && t.notes.toLowerCase().includes("revenge"))) {
            isBroken = true;
          }
        } else {
          // Fallback manual checker based on general mistakes tags
          const checkMistake = t.mistakeTags || [];
          if (checkMistake.length > 0) {
            isBroken = true;
          }
        }

        if (isBroken) {
          brokenCount++;
          if (pnl < 0) {
            totalBrokenRuleLosses += Math.abs(pnl);
            ruleBreaksSummary[r.ruleCode || r.id].loss += Math.abs(pnl);
          }
          ruleBreaksSummary[r.ruleCode || r.id].count++;
        } else {
          followedCount++;
        }
        auditedTradesCount++;
      });
    });

    const totalActions = followedCount + brokenCount;
    const obediencePercentage = totalActions > 0 ? (followedCount / totalActions) * 100 : 100;

    return {
      totalActions,
      obediencePercentage: Math.round(obediencePercentage),
      followedCount,
      brokenCount,
      totalBrokenRuleLosses,
      byRule: Object.values(ruleBreaksSummary).sort((a,b) => b.loss - a.loss)
    };
  };

  const auditResult = runRulesAudit();

  const handleAddCustomRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName) return;

    const newRule: Rule = {
      id: "rule_" + Math.random().toString(36).substr(2, 9),
      name: newRuleName,
      category: newRuleCategory,
      description: newRuleDesc || "Custom trader guard guideline",
      ruleCode: "CUSTOM_" + Math.random().toString(36).substr(2, 4).toUpperCase(),
      active: true
    };

    setRules(prev => [...prev, newRule]);
    setNewRuleName("");
    setNewRuleDesc("");
    
    // Non-blocking inline toast feedback
    setSuccessMsg("🛡️ Custom system compliance guideline registered successfully!");
    setTimeout(() => {
      setSuccessMsg("");
    }, 4000);
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    if (confirmDeleteRuleId === id) {
      setConfirmDeleteRuleId(null);
    }
  };

  // SVG Equity curve preview calculation base
  const generateSimulatedEquityCurve = () => {
    const points = [];
    let currentBal = coreSetupFund;
    points.push(currentBal);

    // Let's run a 30-step path
    let rValue = simRiskPct / 100;
    
    // Seed steps based on Win rate and RR
    trades.forEach((t, i) => {
      const isWin = t.status === "WIN";
      const riskAmount = currentBal * rValue;
      const profitDelta = riskAmount * expectedRR;
      
      if (isWin) {
        currentBal += profitDelta;
      } else if (t.status === "LOSS") {
        currentBal -= riskAmount;
      }
      points.push(currentBal);
    });

    if (points.length < 5) {
      // populate dummy standard steps if they have fewer trades
      let bal = startingBalance;
      points.length = 0;
      points.push(bal);
      for (let s = 1; s <= 20; s++) {
        const isWin = Math.random() * 100 < expectedWinRate;
        const risk = bal * rValue;
        if (isWin) {
          bal += risk * expectedRR;
        } else {
          bal -= risk;
        }
        points.push(bal);
      }
    }

    return points;
  };

  const simCurve = generateSimulatedEquityCurve();
  const simFinalBalance = simCurve[simCurve.length - 1];
  const simPeak = Math.max(...simCurve);
  const simTrough = Math.min(...simCurve);
  const simDrawdown = ((simPeak - simTrough) / simPeak) * 100;

  // Filter broken vs actual curve
  const generateCleanVSActualPoints = () => {
    const actualPoints: number[] = [coreSetupFund];
    const disciplinedPoints: number[] = [coreSetupFund];

    let actualBalance = coreSetupFund;
    let disciplinedBalance = coreSetupFund;

    // Evaluate trade by trade
    trades.forEach(t => {
      const pnl = Number(t.profitLoss) || 0;
      actualBalance += pnl;
      actualPoints.push(actualBalance);

      // If it is NOT revenge or bad emotion, we participate in disciplined
      const isRevengeOrBroken = t.emotionalState === "revenge" || t.notes?.toLowerCase().includes("revenge") || (t.mistakeTags?.length && t.mistakeTags.includes("Revenge trade"));
      if (!isRevengeOrBroken) {
        disciplinedBalance += pnl;
      } else {
        // Skip the revenge trade entirely! Shows the hypothetical benefit
      }
      disciplinedPoints.push(disciplinedBalance);
    });

    return { actualPoints, disciplinedPoints };
  };

  const curveComparison = generateCleanVSActualPoints();

  return (
    <div id="rule-compliance-dashboard" className="space-y-6">

      {/* 1. COMPLIANCE HIGHLIGHT HEADER BANNER */}
      <div id="compliance-status-banner" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div id="compliance-badge-svg" className={`p-4 rounded-xl ${auditResult.obediencePercentage >= 75 ? "bg-emerald-500/10 text-emerald-400" : "bg-rose-500/10 text-rose-400"}`}>
            {auditResult.obediencePercentage >= 75 ? <ShieldCheck size={36} /> : <AlertTriangle size={36} />}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase tracking-wider">Accountability Core status</span>
            <h3 className="text-base font-bold text-slate-100 mt-1">Rule Compliance Rate: <span className={auditResult.obediencePercentage >= 75 ? "text-emerald-400" : "text-rose-450"}>{auditResult.obediencePercentage}% Obedience</span></h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              You synchronized with your rules on <strong>{auditResult.followedCount}</strong> checkpoints. Broken counts: <strong>{auditResult.brokenCount}</strong>.
            </p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center self-stretch md:self-auto min-w-[170px]">
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Estimated Rule Leakage</span>
          <span className="text-lg font-bold font-mono text-rose-405 block pt-1">-${auditResult.totalBrokenRuleLosses.toFixed(2)}</span>
          <span className="text-[10px] text-slate-500 italic">Net direct losses caused by rule breaks.</span>
        </div>
      </div>

      {/* 2. DUAL COLUMNS: RULES INVENTORY & BROKEN DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Columns: Rules configuration checkboxes */}
        <div className="lg:col-span-2 bg-slate-900 border border-slate-850 p-5 rounded-xl text-white space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-2">
            <h4 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={16} className="text-emerald-400" />
              Instituted Performance Guards Database
            </h4>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">{rules.length} Guiding Rules</span>
          </div>

          <div id="rules-toggable-list" className="space-y-3">
            {rules.map(r => (
              <div id={`rule-row-${r.id}`} key={r.id} className="bg-slate-950 border border-slate-850 p-3 rounded-lg flex items-start justify-between gap-3 hover:border-slate-750 transition-all">
                <div className="flex items-start gap-2.5">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={() => handleToggleRule(r.id)}
                    className="mt-1 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer pointer-events-auto"
                    title="Toggle active state of rule check"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{r.name}</span>
                      <span className={`text-[8px] px-1.5 py-0.2 rounded font-mono uppercase ${
                        r.category === "RISK" ? "bg-rose-950 text-rose-400" :
                        r.category === "TIME" ? "bg-blue-950 text-blue-400" : "bg-purple-950 text-purple-400"
                      }`}>{r.category}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{r.description}</p>
                  </div>
                </div>

                {confirmDeleteRuleId === r.id ? (
                  <div className="flex items-center gap-1 bg-rose-950/40 border border-rose-900 rounded p-1">
                    <span className="text-[10px] text-rose-400 font-bold px-1.5 leading-none">Delete?</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRule(r.id)}
                      className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded font-bold cursor-pointer transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRuleId(null)}
                      className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteRuleId(r.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-900 transition-colors cursor-pointer"
                    title="Remove guard rule"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* ADD CUSTOM GUARD FORM */}
          <form id="add-compliances-rule-form" onSubmit={handleAddCustomRule} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest block">Add custom validation guard rule</span>
              {successMsg && (
                <span className="text-[10px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/60 rounded px-2 py-0.5 animate-pulse font-medium">
                  {successMsg}
                </span>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <input
                  id="input-rule-name"
                  type="text"
                  required
                  placeholder="e.g. Always wait for H1 close confirmation"
                  value={newRuleName}
                  onChange={(e) => setNewRuleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                />
              </div>
              <div>
                <select
                  value={newRuleCategory}
                  onChange={(e) => setNewRuleCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
                >
                  <option value="RISK">RISK</option>
                  <option value="TIME">PORTFOLIO TIME</option>
                  <option value="SETUP">SETUP CONFLUENCE</option>
                  <option value="EMOTION">PSYCHOLOGICAL</option>
                </select>
              </div>
            </div>

            <input
              id="input-rule-description"
              type="text"
              placeholder="Add precise details of triggers or criteria (e.g., Do not enter before 08:30 EST)..."
              value={newRuleDesc}
              onChange={(e) => setNewRuleDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded p-2 text-xs text-white"
            />

            <button
              id="btn-trigger-add-rule"
              type="submit"
              className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs px-4 py-2 rounded font-semibold flex items-center gap-1 cursor-pointer"
            >
              <Plus size={12} /> Add Rule to System Guard
            </button>
          </form>
        </div>

        {/* Right Diagnostics: Broken Rules Financial audit list */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800 pb-2">
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Rule breaks Diagnostics</span>
              <h4 className="text-sm font-bold text-slate-205 mt-0.5">Primary Leaking Points</h4>
            </div>

            {auditResult.brokenCount === 0 ? (
              <div className="text-center py-10 text-slate-650 space-y-1.5">
                <ShieldCheck className="mx-auto text-emerald-400 opacity-60" size={32} />
                <p className="text-xs">No broken rule records detected.</p>
                <p className="text-[10px]">Your journaling demonstrates excellent baseline tactical alignment!</p>
              </div>
            ) : (
              <div id="rule-breaks-rank-list" className="space-y-3.5">
                {auditResult.byRule.map((rBreak, idx) => {
                  if (rBreak.count === 0) return null;
                  return (
                    <div key={idx} className="bg-slate-950 p-3 rounded-lg border border-slate-850 relative">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-semibold text-slate-200">{rBreak.name}</span>
                        <span className="text-[10px] bg-rose-500/10 text-rose-450 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          {rBreak.count} breaks
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-rose-401 font-mono font-bold">
                        Cost Leakage: -${rBreak.loss.toFixed(2)}
                      </div>
                      <div className="text-[10px] text-slate-500 mt-1">
                        Failed compliance triggers directly linked to performance degradation.
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] leading-relaxed text-slate-500 font-mono mt-4">
            <Info size={12} className="text-indigo-400 inline mr-1 mb-0.5" />
            <span>Obeying rules decreases random outcome variance. Filter bad trades to lift baseline reward yield by up to <strong>140%</strong>.</span>
          </div>
        </div>

      </div>

      {/* 3. INTERACTIVE RISK EQUITY CURVE SIMULATOR SECTION */}
      <div id="interactive-variance-model-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-md">
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4 pb-2 border-b border-slate-800">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono flex items-center gap-2">
              <Sliders size={16} className="text-emerald-400" />
              Equity Curve & Discipline Simulator
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Simulate dynamic compounding risk models versus actual tilt breaks degradation.</p>
          </div>
          <span className="text-[10px] bg-indigo-900/40 text-indigo-400 border border-indigo-800 px-3 py-1 rounded font-mono uppercase">
            Compounding Simulator Mode
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Simulation Configuration slider settings */}
          <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl space-y-4">
            <span className="text-[10px] text-emerald-400 font-mono tracking-wider uppercase block">Compounding Rules Config</span>
            
            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Fixed Risk Per Trade (%):</span>
                <strong className="text-emerald-400">{simRiskPct}%</strong>
              </div>
              <input
                id="slider-sim-risk"
                type="range"
                min="0.25"
                max="5"
                step="0.25"
                value={simRiskPct}
                onChange={(e) => setSimRiskPct(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 cursor-pointer pointer-events-auto"
                title="Risk level slider"
              />
              <span className="text-[9px] text-slate-500 block leading-tight">Lower Risk (0.5% - 1.5%) safeguards capital and buffers against unavoidable loss runs.</span>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-slate-400">Target Setup Reward (R:R):</span>
                <strong className="text-blue-450">{expectedRR}:1 ratio</strong>
              </div>
              <input
                id="slider-sim-rr"
                type="range"
                min="1"
                max="5"
                step="0.5"
                value={expectedRR}
                onChange={(e) => setExpectedRR(parseFloat(e.target.value))}
                className="w-full accent-indigo-500 cursor-pointer pointer-events-auto"
                title="Reward level slider"
              />
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Starting Sum ($)</label>
                <input
                  id="input-sim-start-bal"
                  type="number"
                  value={startingBalance}
                  onChange={(e) => setStartingBalance(parseInt(e.target.value) || 10000)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white text-center"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono text-slate-400 mb-1">Sim Wins (%)</label>
                <input
                  id="input-sim-win-rate"
                  type="number"
                  max="100"
                  min="10"
                  value={expectedWinRate}
                  onChange={(e) => setExpectedWinRate(parseInt(e.target.value) || 50)}
                  className="w-full bg-slate-900 border border-slate-800 rounded p-1.5 text-xs text-white text-center"
                />
              </div>
            </div>

            <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-[10px] text-slate-400 flex items-start gap-1.5 leading-snug">
              <AlertCircle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <span>Simulated draws: peak-to-trough drop at <strong>{simRiskPct}%</strong> risk is calculated at <strong>{simDrawdown.toFixed(1)}%</strong>. High risk breeds instant failure probability.</span>
            </div>
          </div>

          {/* Graphical rendering element: SVG paths representing actual, disciplined, or risk sim curves */}
          <div className="lg:col-span-2 bg-slate-950 p-4 border border-slate-850 rounded-xl flex flex-col justify-between">
            <div className="flex justify-between items-center text-xs font-mono text-slate-400 mb-4">
              <span>Simulation Visual: <strong>Actual Performance vs skipping emotional trades</strong></span>
              <span className="text-[9px] bg-slate-900 text-slate-500 px-2 py-0.5 rounded">30 steps projection</span>
            </div>

            {/* SVG Visual Stage */}
            <div id="sim-curve-svg-canvas" className="bg-slate-900/40 border border-slate-850 rounded-lg p-2 h-[160px] flex items-center justify-center relative">
              {trades.length < 2 ? (
                <div className="text-center text-slate-600 text-xs">
                  <Play size={20} className="mx-auto mb-1 opacity-40 text-slate-500" />
                  <span>Journal 2+ trades with profit/loss to visualize disciplined equity comparison curves.</span>
                </div>
              ) : (
                <svg className="w-full h-full" viewBox="0 0 400 150">
                  {/* Grid lines */}
                  <line x1="0" y1="25" x2="400" y2="25" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="75" x2="400" y2="75" stroke="rgba(255,255,255,0.05)" />
                  <line x1="0" y1="125" x2="400" y2="125" stroke="rgba(255,255,255,0.05)" />

                  {/* Draw Actual performance Path (Red/Orange) */}
                  {(() => {
                    const actuals = curveComparison.actualPoints;
                    const maxA = Math.max(...actuals);
                    const minA = Math.min(...actuals);
                    const range = Math.max(1, maxA - minA);
                    const steps = actuals.length;

                    const pointsStr = actuals.map((pt, index) => {
                      const x = (index / (steps - 1)) * 390 + 5;
                      const y = 145 - ((pt - minA) / range) * 110;
                      return `${x},${y}`;
                    }).join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#EF4444"
                          strokeWidth="2.5"
                          opacity="0.8"
                          points={pointsStr}
                        />
                        <span className="absolute left-4 bottom-2 text-[10px] text-rose-400 font-mono">● Actual Equity Path</span>
                      </>
                    );
                  })()}

                  {/* Draw Disciplined performance Path (Emerald/No-Revenge) */}
                  {(() => {
                    const cleanP = curveComparison.disciplinedPoints;
                    const actuals = curveComparison.actualPoints;
                    // Combine to scale both together
                    const merged = [...actuals, ...cleanP];
                    const maxM = Math.max(...merged);
                    const minM = Math.min(...merged);
                    const range = Math.max(1, maxM - minM);
                    const steps = cleanP.length;

                    const pointsStr = cleanP.map((pt, index) => {
                      const x = (index / (steps - 1)) * 390 + 5;
                      const y = 145 - ((pt - minM) / range) * 110;
                      return `${x},${y}`;
                    }).join(" ");

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#10B981"
                          strokeWidth="3"
                          points={pointsStr}
                        />
                        <span className="absolute right-4 bottom-2 text-[10px] text-emerald-400 font-mono">● Disciplined Path (No Revenge)</span>
                      </>
                    );
                  })()}
                </svg>
              )}
            </div>

            {/* Quick Summary comparison results */}
            <div className="grid grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-900 text-xs">
              <div>
                <span className="text-[10px] text-slate-500 uppercase block font-mono">Raw Actual balance</span>
                <span className="text-sm font-bold font-mono text-slate-200">
                  ${curveComparison.actualPoints[curveComparison.actualPoints.length - 1].toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-emerald-400 uppercase block font-mono">Disciplined Hypothetical Balance</span>
                <span className="text-sm font-bold font-mono text-emerald-400">
                  ${curveComparison.disciplinedPoints[curveComparison.disciplinedPoints.length - 1].toFixed(2)}
                </span>
                <span className="text-[9px] text-slate-500 block">Gain by avoiding tilt revenge trades.</span>
              </div>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
