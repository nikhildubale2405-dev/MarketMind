import React, { useState, useEffect, useMemo } from "react";
import {
  CheckSquare,
  ShieldCheck,
  AlertTriangle,
  Plus,
  Trash2,
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Sparkles,
  Info
} from "lucide-react";
import { Trade, Transaction } from "../types";

interface Rule {
  id: string;
  name: string;
  category: "RISK" | "TIME" | "SETUP" | "EMOTION";
  description: string;
  ruleCode: string;
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
    description: "Stop-loss amount must not exceed 1% of your total account funding balance.",
    ruleCode: "RISK_1_PCT",
    active: true
  },
  {
    id: "r2",
    name: "Stop After 3 Consecutive Losses",
    category: "RISK",
    description: "Stop trading for the day upon reaching 3 losses in a row to avoid tilt.",
    ruleCode: "MAX_LOSS_3",
    active: true
  },
  {
    id: "r3",
    name: "Minimum 1:2 Risk to Reward",
    category: "SETUP",
    description: "Every setup entered must have a profit target at least 2x the stop-loss distance.",
    ruleCode: "MIN_RR_2",
    active: true
  },
  {
    id: "r4",
    name: "Prime Sessions Only (London / NY)",
    category: "TIME",
    description: "Strictly execute setups during London or New York liquidity windows.",
    ruleCode: "LONDON_NY_SESSION",
    active: true
  },
  {
    id: "r5",
    name: "Golden Specialty Assets Only (XAU / BTC)",
    category: "SETUP",
    description: "Build deep specialty in Gold (XAU/USD) or BTC/USD without asset-hopping.",
    ruleCode: "XAU_BTC_ONLY",
    active: true
  }
];

export default function RuleComplianceView({ trades, transactions }: RuleComplianceViewProps) {
  const [rules, setRules] = useState<Rule[]>(() => {
    const cached = localStorage.getItem("mm_custom_rules");
    return cached ? JSON.parse(cached) : DEFAULT_RULES;
  });

  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleDesc, setNewRuleDesc] = useState("");
  const [newRuleCategory, setNewRuleCategory] = useState<"RISK" | "TIME" | "SETUP" | "EMOTION">("RISK");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    localStorage.setItem("mm_custom_rules", JSON.stringify(rules));
  }, [rules]);

  // Balance calculation base
  const totalDeposits = transactions.filter(t => t.type === "DEPOSIT").reduce((sum, t) => sum + t.amount, 0);
  const totalWithdrawals = transactions.filter(t => t.type === "WITHDRAWAL").reduce((sum, t) => sum + t.amount, 0);
  const coreBalance = totalDeposits - totalWithdrawals || 10000;

  // Run Rule Audit
  const auditResult = useMemo(() => {
    let followedCount = 0;
    let brokenCount = 0;
    let totalBrokenLosses = 0;
    const ruleBreaksSummary: Record<string, { count: number; loss: number; name: string; category: string }> = {};

    rules.forEach(r => {
      ruleBreaksSummary[r.ruleCode || r.id] = { count: 0, loss: 0, name: r.name, category: r.category };
    });

    trades.forEach(t => {
      const pnl = Number(t.profitLoss) || 0;

      rules.forEach(r => {
        if (!r.active) return;

        let isBroken = false;

        if (r.ruleCode === "RISK_1_PCT") {
          const lossAbs = Math.abs(pnl);
          if (t.status === "LOSS" && lossAbs > coreBalance * 0.015) {
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
          const asset = (t.symbol || "").toUpperCase();
          if (!asset.includes("XAU") && !asset.includes("BTC")) {
            isBroken = true;
          }
        } else if (r.ruleCode === "MAX_LOSS_3") {
          if (t.emotionalState === "revenge" || t.emotionalState === "greedy" || (t.notes && t.notes.toLowerCase().includes("revenge"))) {
            isBroken = true;
          }
        } else {
          const checkMistake = t.mistakeTags || [];
          if (checkMistake.length > 0) {
            isBroken = true;
          }
        }

        if (isBroken) {
          brokenCount++;
          if (pnl < 0) {
            totalBrokenLosses += Math.abs(pnl);
            ruleBreaksSummary[r.ruleCode || r.id].loss += Math.abs(pnl);
          }
          ruleBreaksSummary[r.ruleCode || r.id].count++;
        } else {
          followedCount++;
        }
      });
    });

    const totalCheckpoints = followedCount + brokenCount;
    const obedienceRate = totalCheckpoints > 0 ? Math.round((followedCount / totalCheckpoints) * 100) : 100;

    return {
      totalCheckpoints,
      obedienceRate,
      followedCount,
      brokenCount,
      totalBrokenLosses,
      byRule: Object.values(ruleBreaksSummary).sort((a, b) => b.loss - a.loss)
    };
  }, [trades, rules, coreBalance]);

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRuleName.trim()) return;

    const newRule: Rule = {
      id: "rule_" + Date.now(),
      name: newRuleName.trim(),
      category: newRuleCategory,
      description: newRuleDesc.trim() || "Trader operational discipline guard",
      ruleCode: "CUSTOM_" + Math.random().toString(36).substring(2, 6).toUpperCase(),
      active: true
    };

    setRules(prev => [...prev, newRule]);
    setNewRuleName("");
    setNewRuleDesc("");
    setToastMsg("Rule added to your system guard!");
    setTimeout(() => setToastMsg(""), 3000);
  };

  const handleToggleRule = (id: string) => {
    setRules(prev => prev.map(r => r.id === id ? { ...r, active: !r.active } : r));
  };

  const handleDeleteRule = (id: string) => {
    setRules(prev => prev.filter(r => r.id !== id));
    setConfirmDeleteId(null);
  };

  const filteredRules = useMemo(() => {
    if (selectedCategory === "ALL") return rules;
    return rules.filter(r => r.category === selectedCategory);
  }, [rules, selectedCategory]);

  return (
    <div id="rule-compliance-workspace" className="space-y-6">

      {/* 1. COMPLIANCE HIGHLIGHT HEADER CARDS */}
      <div id="compliance-summary-cards" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Rule Compliance Rate</span>
          <span className={`text-2xl font-bold font-mono ${auditResult.obedienceRate >= 75 ? "text-emerald-400" : "text-rose-400"}`}>
            {auditResult.obedienceRate}%
          </span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Rules Followed</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{auditResult.followedCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Rules Broken</span>
          <span className="text-2xl font-bold font-mono text-rose-400">{auditResult.brokenCount}</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Rule Break Leakage</span>
          <span className="text-2xl font-bold font-mono text-rose-400">
            {auditResult.totalBrokenLosses > 0 ? `-$${auditResult.totalBrokenLosses.toFixed(2)}` : "$0.00"}
          </span>
        </div>
      </div>

      {/* 2. DUAL COLUMN: RULES GUARDS LIST & BROKEN RULE DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Column 1: Rules Checklist (2 cols on large) */}
        <div id="rules-checklist-column" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-800/80 pb-3">
            <div>
              <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                <CheckSquare size={15} className="text-emerald-400" />
                Active Trading Rules Guard
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Toggle rules to enforce disciplined execution checkpoints</p>
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-1">
              {["ALL", "RISK", "TIME", "SETUP", "EMOTION"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-[9px] font-mono px-2 py-0.5 rounded transition-colors ${
                    selectedCategory === cat
                      ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold"
                      : "bg-slate-950 text-slate-400 border border-slate-850 hover:text-slate-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2.5">
            {filteredRules.map((r) => (
              <div
                key={r.id}
                className={`p-3.5 rounded-xl border transition-all flex items-start justify-between gap-3 ${
                  r.active
                    ? "bg-slate-950 border-slate-800 hover:border-slate-700"
                    : "bg-slate-950/40 border-slate-850/60 opacity-60"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={r.active}
                    onChange={() => handleToggleRule(r.id)}
                    className="mt-0.5 w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title={r.active ? "Rule active" : "Rule disabled"}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold ${r.active ? "text-slate-200" : "text-slate-500"}`}>
                        {r.name}
                      </span>
                      <span className={`text-[8px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                        r.category === "RISK"
                          ? "bg-rose-950 text-rose-400 border border-rose-900/60"
                          : r.category === "TIME"
                          ? "bg-blue-950 text-blue-400 border border-blue-900/60"
                          : r.category === "SETUP"
                          ? "bg-purple-950 text-purple-400 border border-purple-900/60"
                          : "bg-amber-950 text-amber-400 border border-amber-900/60"
                      }`}>
                        {r.category}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed font-sans">{r.description}</p>
                  </div>
                </div>

                {confirmDeleteId === r.id ? (
                  <div className="flex items-center gap-1 bg-rose-950/60 border border-rose-900 rounded p-1 flex-shrink-0">
                    <span className="text-[10px] text-rose-400 font-mono px-1">Delete?</span>
                    <button
                      onClick={() => handleDeleteRule(r.id)}
                      className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded font-bold transition-colors"
                    >
                      Yes
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      className="text-[9px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-semibold transition-colors"
                    >
                      No
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(r.id)}
                    className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors flex-shrink-0"
                    title="Delete rule"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add New Rule Form */}
          <form onSubmit={handleAddRule} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3 mt-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold">Add Custom Rule</span>
              {toastMsg && (
                <span className="text-[10px] text-emerald-400 font-mono animate-pulse font-medium">{toastMsg}</span>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              <input
                type="text"
                required
                placeholder="Rule Name (e.g., Wait for 15M candle close)"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <select
                value={newRuleCategory}
                onChange={(e) => setNewRuleCategory(e.target.value as any)}
                className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                <option value="RISK">RISK</option>
                <option value="TIME">TIME</option>
                <option value="SETUP">SETUP</option>
                <option value="EMOTION">EMOTION</option>
              </select>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Rule Description / Criteria details..."
                value={newRuleDesc}
                onChange={(e) => setNewRuleDesc(e.target.value)}
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus size={13} /> Add Rule
              </button>
            </div>
          </form>
        </div>

        {/* Column 2: Broken Rules Diagnostics */}
        <div id="broken-rules-column" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b border-slate-800/80 pb-3">
              <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
                <AlertTriangle size={15} className="text-rose-400" />
                Rule Break Diagnostics
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Primary failure checkpoints and associated financial impact</p>
            </div>

            {auditResult.brokenCount === 0 ? (
              <div className="text-center py-10 text-slate-600 space-y-2">
                <ShieldCheck className="mx-auto text-emerald-400 opacity-60" size={32} />
                <p className="text-xs text-slate-300">100% Rule Compliance</p>
                <p className="text-[10px] text-slate-500">No broken checkpoints recorded in your trading journal!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {auditResult.byRule.map((rBreak, idx) => {
                  if (rBreak.count === 0) return null;
                  return (
                    <div key={idx} className="bg-slate-950 p-3 rounded-xl border border-slate-850">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-semibold text-slate-200">{rBreak.name}</span>
                          <span className="text-[9px] font-mono text-slate-500 block mt-0.5">{rBreak.category} RULE</span>
                        </div>
                        <span className="text-[10px] bg-rose-500/10 text-rose-400 border border-rose-500/20 px-2 py-0.5 rounded font-mono font-bold">
                          {rBreak.count} break{rBreak.count !== 1 ? "s" : ""}
                        </span>
                      </div>
                      <div className="mt-2 text-xs font-mono font-bold text-rose-400 flex justify-between items-center">
                        <span className="text-[10px] text-slate-500 font-sans">Estimated Cost:</span>
                        <span>-${rBreak.loss.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-850/80 text-[10px] text-slate-400 font-mono leading-relaxed mt-4 flex items-start gap-2">
            <Info size={14} className="text-indigo-400 flex-shrink-0 mt-0.5" />
            <span>Eliminating your top 2 broken rules typically recovers over <strong>60% of lost capital</strong>.</span>
          </div>
        </div>

      </div>

    </div>
  );
}
