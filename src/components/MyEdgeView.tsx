import React, { useState, useEffect } from "react";
import { Trade, Strategy, EdgeAnalysisResult, DataSufficiency } from "../types";
import { 
  Brain, 
  Sparkles, 
  Target, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  BookOpen, 
  Loader2, 
  Eye, 
  X, 
  Plus, 
  ArrowRight, 
  CheckSquare, 
  Layers, 
  History, 
  Info, 
  Award,
  Zap
} from "lucide-react";

interface MyEdgeViewProps {
  userEmail: string | null;
  trades: Trade[];
}

export default function MyEdgeView({ userEmail, trades }: MyEdgeViewProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "playbook">("overview");
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<EdgeAnalysisResult | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<Strategy | null>(null);
  const [editingVersionStrat, setEditingVersionStrat] = useState<Strategy | null>(null);
  const [versionChangeSummary, setVersionChangeSummary] = useState("");
  const [newRuleInput, setNewRuleInput] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Load existing strategies & last analysis on mount
  useEffect(() => {
    if (!userEmail) return;
    fetchStrategies();
  }, [userEmail]);

  const fetchStrategies = async () => {
    try {
      const res = await fetch("/api/my-edge/strategies", {
        headers: {
          "Authorization": `Bearer ${userEmail}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setStrategies(data.strategies || []);
        if (data.lastAnalysis) {
          setAnalysisResult(data.lastAnalysis);
        }
      }
    } catch (err) {
      console.error("Failed to fetch strategies:", err);
    }
  };

  const handleRunAnalysis = async () => {
    if (!userEmail) return;
    setAnalyzing(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const res = await fetch("/api/my-edge/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userEmail}`,
          "Content-Type": "application/json"
        }
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Analysis failed");
      }
      const data: EdgeAnalysisResult = await res.json();
      setAnalysisResult(data);
      setSuccessMsg("Edge analysis completed successfully! Discovered setup candidates updated.");
      fetchStrategies();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to complete My Edge analysis");
    } finally {
      setAnalyzing(false);
    }
  };

  const handleAcceptStrategy = async (stratId: string) => {
    try {
      const res = await fetch(`/api/my-edge/strategies/${stratId}/accept`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${userEmail}` }
      });
      if (res.ok) {
        setSuccessMsg("Strategy candidate accepted into your active Playbook!");
        setSelectedStrategy(null);
        fetchStrategies();
      }
    } catch (err) {
      console.error("Failed to accept strategy:", err);
    }
  };

  const handleRejectStrategy = async (stratId: string) => {
    try {
      const res = await fetch(`/api/my-edge/strategies/${stratId}/reject`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${userEmail}` }
      });
      if (res.ok) {
        setSuccessMsg("Strategy candidate archived.");
        setSelectedStrategy(null);
        fetchStrategies();
      }
    } catch (err) {
      console.error("Failed to reject strategy:", err);
    }
  };

  const handleCreateVersion = async () => {
    if (!editingVersionStrat || !userEmail) return;
    try {
      const updatedRules = [...editingVersionStrat.entryRules];
      if (newRuleInput.trim()) {
        updatedRules.push(newRuleInput.trim());
      }
      const res = await fetch(`/api/my-edge/strategies/${editingVersionStrat.id}/version`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userEmail}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          changeSummary: versionChangeSummary || "Updated rules and conditions.",
          entryRules: updatedRules
        })
      });
      if (res.ok) {
        setSuccessMsg(`Strategy version updated to v${editingVersionStrat.version + 1}!`);
        setEditingVersionStrat(null);
        setVersionChangeSummary("");
        setNewRuleInput("");
        fetchStrategies();
      }
    } catch (err) {
      console.error("Failed to version strategy:", err);
    }
  };

  // Derived metrics
  const activeStrategies = strategies.filter(s => s.status === "active");
  const candidateStrategies = strategies.filter(s => s.status === "candidate");
  const sufficiency: DataSufficiency = analysisResult?.dataSufficiency || {
    tradeCount: trades.length,
    minimumRequired: 30,
    level: trades.length >= 100 ? "established" : trades.length >= 60 ? "developing" : trades.length >= 30 ? "exploratory" : "insufficient",
    descriptionCoveragePercent: Math.round((trades.filter(t => t.notes).length / (trades.length || 1)) * 100),
    setupCoveragePercent: Math.round((trades.filter(t => t.setupType).length / (trades.length || 1)) * 100),
    emotionCoveragePercent: Math.round((trades.filter(t => t.emotionalState).length / (trades.length || 1)) * 100),
    riskDataCoveragePercent: Math.round((trades.filter(t => t.riskRewardRatio).length / (trades.length || 1)) * 100),
    missingFields: trades.length < 30 ? ["at least 30 historical trades"] : []
  };

  // Calculate Playbook compliance impact
  const complianceTrades = trades.filter(t => t.playbookCompliance === "YES");
  const nonComplianceTrades = trades.filter(t => t.playbookCompliance === "NO");

  const compliancePnL = complianceTrades.reduce((sum, t) => sum + Number(t.profitLoss), 0);
  const nonCompliancePnL = nonComplianceTrades.reduce((sum, t) => sum + Number(t.profitLoss), 0);

  const getConfidenceBadgeClass = (level: string) => {
    switch (level) {
      case "established":
        return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
      case "developing":
        return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20";
      case "exploratory":
        return "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
      default:
        return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white rounded-2xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-white/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-indigo-200 text-xs font-semibold backdrop-blur-md border border-white/10">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              <span>Strategy Lab & Edge Discovery Engine</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <Brain className="w-9 h-9 text-indigo-400" />
              MY EDGE
            </h1>
            <p className="text-indigo-200 text-sm sm:text-base leading-relaxed">
              Discover what actually works in your trading. MarketMind analyzes your historical trade logs and journal notes to identify repeatable setups, market conditions, behaviors, and rules.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <button
              onClick={handleRunAnalysis}
              disabled={analyzing}
              className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-bold rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Analyzing Trades...</span>
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 fill-current" />
                  <span>Analyze My Trades</span>
                </>
              )}
            </button>

            <button
              onClick={() => setActiveTab(activeTab === "overview" ? "playbook" : "overview")}
              className="w-full sm:w-auto px-5 py-3.5 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/20 transition-all flex items-center justify-center gap-2 backdrop-blur-md"
            >
              <BookOpen className="w-4 h-4" />
              <span>{activeTab === "overview" ? `View Playbook (${activeStrategies.length})` : "View Discovery Dashboard"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Alert Notifications */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === "overview"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Edge Discovery & Top Setups</span>
        </button>

        <button
          onClick={() => setActiveTab("playbook")}
          className={`px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center gap-2 ${
            activeTab === "playbook"
              ? "bg-indigo-600 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Personal Playbook ({activeStrategies.length})</span>
          {candidateStrategies.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-slate-950">
              {candidateStrategies.length} New
            </span>
          )}
        </button>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === "overview" && (
        <div className="space-y-6">
          {/* DATA SUFFICIENCY & CONFIDENCE GAUGE CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  Data Sufficiency & Statistical Confidence
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Minimum recommended sample size for statistical edge analysis: <strong className="text-slate-700 dark:text-slate-300">30 trades</strong>.
                </p>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Confidence Level:</span>
                <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border ${getConfidenceBadgeClass(sufficiency.level)}`}>
                  {sufficiency.level}
                </span>
              </div>
            </div>

            {/* Sufficiency Progress Bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-semibold">
                <span className="text-slate-700 dark:text-slate-300">
                  Trades Available: <strong className="text-indigo-600 dark:text-indigo-400">{sufficiency.tradeCount}</strong> / {sufficiency.minimumRequired} Minimum
                </span>
                <span className="text-slate-500 dark:text-slate-400">
                  {Math.min(100, Math.round((sufficiency.tradeCount / sufficiency.minimumRequired) * 100))}% Goal
                </span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    sufficiency.tradeCount >= 100
                      ? "bg-emerald-500"
                      : sufficiency.tradeCount >= 30
                      ? "bg-indigo-500"
                      : "bg-amber-500"
                  }`}
                  style={{ width: `${Math.min(100, (sufficiency.tradeCount / sufficiency.minimumRequired) * 100)}%` }}
                ></div>
              </div>
            </div>

            {/* Coverage Badges */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Description Notes</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{sufficiency.descriptionCoveragePercent}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Setup Classification</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{sufficiency.setupCoveragePercent}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Psychology Tags</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{sufficiency.emotionCoveragePercent}%</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-800">
                <span className="text-xs text-slate-500 dark:text-slate-400 block">Risk Data / RR</span>
                <span className="text-base font-bold text-slate-900 dark:text-white">{sufficiency.riskDataCoveragePercent}%</span>
              </div>
            </div>

            {sufficiency.tradeCount < 30 && (
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Exploratory Mode Active:</strong>
                  MarketMind requires at least 30 trades for reliable statistical edge discovery. Discovered setups below 30 trades are tagged as <span className="font-semibold underline">Exploratory</span>. Continue logging trades in your journal!
                </div>
              </div>
            )}
          </div>

          {/* TOP DISCOVERED SETUPS */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Award className="w-5 h-5 text-amber-500" />
                  Your Strongest Setups & Discovered Edges
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Statistical patterns ranked by sample size, win rate %, and R-multiple expectancy.
                </p>
              </div>
            </div>

            {analysisResult?.topSetups && analysisResult.topSetups.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {analysisResult.topSetups.map((setup, idx) => {
                  const candidateStrat = candidateStrategies.find(s => s.name.includes(setup.setupName) || setup.setupName.includes(s.name));
                  return (
                    <div
                      key={idx}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between space-y-4 relative overflow-hidden group"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <span className="text-xs font-extrabold px-2.5 py-1 rounded-md bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                            #{idx + 1} Edge Candidate
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${getConfidenceBadgeClass(setup.confidenceLevel)}`}>
                            {setup.confidenceLevel}
                          </span>
                        </div>

                        <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {setup.setupName}
                        </h3>

                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                          {setup.evidenceSummary}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2 border-t border-b border-slate-100 dark:border-slate-800 text-center">
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Trades</span>
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{setup.tradeCount}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Win Rate</span>
                          <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{setup.winRate}%</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block uppercase">Expectancy</span>
                          <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                            {setup.expectancyR > 0 ? `+${setup.expectancyR}` : setup.expectancyR}R
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => {
                          const strat = candidateStrat || strategies[idx] || {
                            id: "temp_" + idx,
                            name: setup.setupName,
                            description: setup.evidenceSummary,
                            status: "candidate",
                            confidenceLevel: setup.confidenceLevel,
                            evidence: {
                              tradeCount: setup.tradeCount,
                              wins: Math.round((setup.winRate / 100) * setup.tradeCount),
                              losses: setup.tradeCount - Math.round((setup.winRate / 100) * setup.tradeCount),
                              winRate: setup.winRate,
                              expectancyR: setup.expectancyR,
                              profitFactor: setup.profitFactor,
                              netPnL: 0,
                              avgWin: 0,
                              avgLoss: 0
                            },
                            preferredInstruments: [],
                            preferredSessions: [],
                            conditions: ["Verify liquidity & market structure"],
                            entryRules: ["Wait for explicit confirmation trigger"],
                            riskRules: ["Maintain max 1-2% account risk"],
                            avoidConditions: ["Avoid trading during news / FOMO"],
                            observedPatterns: [setup.evidenceSummary],
                            inferredPatterns: ["Trades with structure confirmation perform best."],
                            recommendations: ["Require retest before entry."],
                            weaknesses: [`Sample size is ${setup.tradeCount} trades.`],
                            limitations: ["Requires strict stop loss adherence."],
                            sourceTradeIds: [],
                            checklist: ["Correct setup", "Stop defined", "Risk plan followed"],
                            version: 1,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString()
                          };
                          setSelectedStrategy(strat as Strategy);
                        }}
                        className="w-full py-2.5 bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/40 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Strategy & Rules</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-4">
                <Brain className="w-12 h-12 text-slate-400 mx-auto" />
                <div className="space-y-1 max-w-md mx-auto">
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">No Analysis Snapshots Yet</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Click <strong>"Analyze My Trades"</strong> above to extract statistical patterns and candidate trading strategies from your historical trades.
                  </p>
                </div>
                <button
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-all inline-flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  <span>Run First Edge Analysis</span>
                </button>
              </div>
            )}
          </div>

          {/* THREE-TIER INSIGHTS: OBSERVED VS INFERRED VS RECOMMENDED */}
          {analysisResult && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
              {/* OBSERVED FACTS */}
              <div className="bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-200 dark:border-emerald-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold text-sm">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>OBSERVED FACTS (Direct Data)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Directly verified from your historical trade logs.
                </p>
                <ul className="space-y-2">
                  {analysisResult.observedPatterns.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-emerald-100 dark:border-emerald-900/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* INFERRED PATTERNS */}
              <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-200 dark:border-blue-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold text-sm">
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>INFERRED PATTERNS (Correlations)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detected pattern correlations across multi-variable trade data.
                </p>
                <ul className="space-y-2">
                  {analysisResult.inferredPatterns.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-blue-100 dark:border-blue-900/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* RECOMMENDED RULES */}
              <div className="bg-purple-50/50 dark:bg-purple-950/10 border border-purple-200 dark:border-purple-900/30 rounded-2xl p-5 space-y-3">
                <div className="flex items-center gap-2 text-purple-700 dark:text-purple-400 font-bold text-sm">
                  <Target className="w-4 h-4 shrink-0" />
                  <span>RECOMMENDED RULES (AI Action)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Suggested playbook rules derived from statistical evidence.
                </p>
                <ul className="space-y-2">
                  {analysisResult.journalImprovementTips.map((item, idx) => (
                    <li key={idx} className="text-xs text-slate-700 dark:text-slate-300 flex items-start gap-2 bg-white/60 dark:bg-slate-900/60 p-2.5 rounded-lg border border-purple-100 dark:border-purple-900/20">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500 mt-1.5 shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* PLAYBOOK TAB */}
      {activeTab === "playbook" && (
        <div className="space-y-6">
          {/* PLAYBOOK COMPLIANCE FINANCIAL IMPACT CARD */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
              Playbook Compliance Financial Impact
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30">
                <span className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold block">Playbook-Following Trades</span>
                <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {compliancePnL >= 0 ? `+$${compliancePnL.toFixed(2)}` : `-$${Math.abs(compliancePnL).toFixed(2)}`}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  {complianceTrades.length} trades executed in full alignment with playbook rules.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30">
                <span className="text-xs text-red-700 dark:text-red-400 font-semibold block">Playbook-Violation Trades</span>
                <span className="text-2xl font-black text-red-600 dark:text-red-400">
                  {nonCompliancePnL >= 0 ? `+$${nonCompliancePnL.toFixed(2)}` : `-$${Math.abs(nonCompliancePnL).toFixed(2)}`}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  {nonComplianceTrades.length} trades with rule violations.
                </span>
              </div>

              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30">
                <span className="text-xs text-indigo-700 dark:text-indigo-400 font-semibold block">Active Playbook Rules</span>
                <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {activeStrategies.length}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block mt-1">
                  Accepted strategies governing pre-trade validation.
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVE PLAYBOOK STRATEGIES LIST */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center justify-between">
              <span>Active Personal Playbook Strategies</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                These strategies populate your pre-trade checklist in Trade Entry.
              </span>
            </h2>

            {activeStrategies.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeStrategies.map((strat) => (
                  <div
                    key={strat.id}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-md bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold border border-emerald-200 dark:border-emerald-800">
                          Active Playbook Strategy v{strat.version}
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                          {strat.evidence.tradeCount} Trades Baseline
                        </span>
                      </div>

                      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{strat.name}</h3>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{strat.description}</p>

                      {/* Rules Checklist Preview */}
                      <div className="space-y-1.5 pt-2">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">Pre-Trade Entry Rules:</span>
                        {strat.entryRules.map((rule, idx) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                            <CheckSquare className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span>{rule}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        onClick={() => setShowChecklistModal(strat)}
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Generate Checklist</span>
                      </button>

                      <button
                        onClick={() => setEditingVersionStrat(strat)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-all flex items-center gap-1"
                      >
                        <History className="w-3.5 h-3.5" />
                        <span>v{strat.version} Versioning</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-slate-50 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center space-y-3">
                <BookOpen className="w-10 h-10 text-slate-400 mx-auto" />
                <h3 className="text-base font-bold text-slate-900 dark:text-white">Your Playbook is Empty</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
                  Run <strong>"Analyze My Trades"</strong> on the Edge Discovery tab and click <strong>"Accept to Playbook"</strong> on discovered setup candidates to populate your trading playbook.
                </p>
                <button
                  onClick={() => setActiveTab("overview")}
                  className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
                >
                  Go to Edge Discovery
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STRATEGY DETAIL & REVIEW MODAL */}
      {selectedStrategy && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative my-8">
            <button
              onClick={() => setSelectedStrategy(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${getConfidenceBadgeClass(selectedStrategy.confidenceLevel)}`}>
                  Confidence: {selectedStrategy.confidenceLevel}
                </span>
                <span className="text-xs text-slate-400">v{selectedStrategy.version} Candidate</span>
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">{selectedStrategy.name}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">{selectedStrategy.description}</p>
            </div>

            {/* Evidence Stat Grid */}
            <div className="grid grid-cols-4 gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-center border border-slate-200/60 dark:border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Trades</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedStrategy.evidence.tradeCount}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Win Rate</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{selectedStrategy.evidence.winRate}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Expectancy</span>
                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{selectedStrategy.evidence.expectancyR}R</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">Profit Factor</span>
                <span className="text-sm font-bold text-slate-800 dark:text-white">{selectedStrategy.evidence.profitFactor}</span>
              </div>
            </div>

            {/* Rules Breakdown */}
            <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Entry Execution Rules:</h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {selectedStrategy.entryRules.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Risk & Management Rules:</h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {selectedStrategy.riskRules.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <ShieldAlert className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white mb-1.5">Avoid Conditions:</h4>
                <ul className="space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {selectedStrategy.avoidConditions.map((r, i) => (
                    <li key={i} className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
              <button
                onClick={() => handleRejectStrategy(selectedStrategy.id)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl"
              >
                Archive Candidate
              </button>
              <button
                onClick={() => handleAcceptStrategy(selectedStrategy.id)}
                className="px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-sm flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Accept to Playbook</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STRATEGY CHECKLIST MODAL */}
      {showChecklistModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl relative">
            <button
              onClick={() => setShowChecklistModal(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">Pre-Trade Validation</span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">{showChecklistModal.name} Checklist</h3>
            </div>

            <div className="space-y-2.5">
              {showChecklistModal.checklist.map((item, idx) => (
                <label key={idx} className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-800 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <input type="checkbox" className="mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4" />
                  <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">{item}</span>
                </label>
              ))}
            </div>

            <button
              onClick={() => setShowChecklistModal(null)}
              className="w-full py-2.5 bg-indigo-600 text-white font-semibold text-xs rounded-xl"
            >
              Close Checklist
            </button>
          </div>
        </div>
      )}

      {/* STRATEGY VERSIONING MODAL */}
      {editingVersionStrat && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setEditingVersionStrat(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-5 h-5" />
            </button>

            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">Strategy Versioning (v{editingVersionStrat.version} → v{editingVersionStrat.version + 1})</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Record rule updates while preserving previous version history snapshots.</p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Change Summary / Notes</label>
                <input
                  type="text"
                  placeholder="e.g., Added requirement for liquidity sweep before entry"
                  value={versionChangeSummary}
                  onChange={(e) => setVersionChangeSummary(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">Add New Entry Rule</label>
                <input
                  type="text"
                  placeholder="e.g., Minimum RR of 1:2 required"
                  value={newRuleInput}
                  onChange={(e) => setNewRuleInput(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-xs text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setEditingVersionStrat(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-xs font-semibold rounded-xl text-slate-700 dark:text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateVersion}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl"
              >
                Save Version v{editingVersionStrat.version + 1}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
