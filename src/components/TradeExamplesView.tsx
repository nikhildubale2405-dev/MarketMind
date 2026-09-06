import React, { useState, useMemo } from "react";
import { Trade, Strategy, TradeExampleData } from "../types";
import { 
  calculateExecutionQuality, 
  calculateScreenshotCoverage, 
  extractWinningVsLosingSeparators 
} from "../lib/tradeExamplesUtils";
import TradeExampleCard from "./TradeExampleCard";
import TradeExampleDetailModal from "./TradeExampleDetailModal";
import WinnerVsLoserCompareModal from "./WinnerVsLoserCompareModal";
import { 
  Sparkles, 
  Camera, 
  Filter, 
  Search, 
  Award, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Eye, 
  PieChart, 
  TrendingUp, 
  RotateCcw,
  SlidersHorizontal,
  Layers,
  ArrowRight
} from "lucide-react";

interface TradeExamplesViewProps {
  userEmail: string | null;
  trades: Trade[];
  strategies: Strategy[];
}

export default function TradeExamplesView({
  userEmail,
  trades,
  strategies
}: TradeExamplesViewProps) {
  // Main Tab State
  const [activeTab, setActiveTab] = useState<"all" | "winning" | "losing" | "golden" | "review" | "mistakes">("all");

  // Filters State
  const [selectedSymbol, setSelectedSymbol] = useState<string>("ALL");
  const [selectedSetup, setSelectedSetup] = useState<string>("ALL");
  const [selectedSession, setSelectedSession] = useState<string>("ALL");
  const [selectedClassification, setSelectedClassification] = useState<string>("ALL");
  const [selectedMistake, setSelectedMistake] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal States
  const [selectedExampleModal, setSelectedExampleModal] = useState<TradeExampleData | null>(null);
  const [showCompareModal, setShowCompareModal] = useState<boolean>(false);
  const [compareWinner, setCompareWinner] = useState<TradeExampleData | undefined>(undefined);
  const [compareLoser, setCompareLoser] = useState<TradeExampleData | undefined>(undefined);

  // Transform all trades into TradeExampleData
  const allExamples = useMemo(() => {
    return trades.map(calculateExecutionQuality);
  }, [trades]);

  // Coverage Stats
  const coverageStats = useMemo(() => {
    return calculateScreenshotCoverage(trades);
  }, [trades]);

  // Statistical Separators
  const separators = useMemo(() => {
    return extractWinningVsLosingSeparators(trades);
  }, [trades]);

  // Available unique filter dropdown options
  const uniqueSymbols = useMemo(() => Array.from(new Set(trades.map(t => t.symbol).filter(Boolean))), [trades]);
  const uniqueSetups = useMemo(() => Array.from(new Set(trades.map(t => t.setupType).filter(Boolean))), [trades]);
  const uniqueSessions = useMemo(() => Array.from(new Set(trades.map(t => t.session).filter(Boolean))), [trades]);
  const ALL_MISTAKES = ["FOMO", "Revenge trade", "Overtrading", "Early exit", "Late entry", "Ignored stop loss", "News trade", "Emotional trade"];

  // Filtered Examples calculation
  const filteredExamples = useMemo(() => {
    return allExamples.filter(ex => {
      const t = ex.trade;
      
      // Tab Filtering
      if (activeTab === "winning" && t.status !== "WIN") return false;
      if (activeTab === "losing" && t.status !== "LOSS") return false;
      if (activeTab === "golden" && ex.quality !== "GOOD") return false;
      if (activeTab === "review" && (ex.quality !== "POOR" && t.playbookCompliance !== "NO")) return false;
      if (activeTab === "mistakes" && selectedMistake === "ALL" && (!t.mistakeTags || t.mistakeTags.length === 0)) return false;

      // Dropdown Filters
      if (selectedSymbol !== "ALL" && t.symbol !== selectedSymbol) return false;
      if (selectedSetup !== "ALL" && t.setupType !== selectedSetup) return false;
      if (selectedSession !== "ALL" && t.session !== selectedSession) return false;
      if (selectedClassification !== "ALL" && ex.classification !== selectedClassification) return false;
      if (selectedMistake !== "ALL" && (!t.mistakeTags || !t.mistakeTags.includes(selectedMistake as any))) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchSym = t.symbol.toLowerCase().includes(q);
        const matchNotes = (t.notes || "").toLowerCase().includes(q);
        const matchSetup = (t.setupType || "").toLowerCase().includes(q);
        if (!matchSym && !matchNotes && !matchSetup) return false;
      }

      return true;
    });
  }, [allExamples, activeTab, selectedSymbol, selectedSetup, selectedSession, selectedClassification, selectedMistake, searchQuery]);

  // Separate into screenshots-only and overall
  const screenshotExamples = filteredExamples.filter(ex => ex.trade.images && ex.trade.images.length > 0);

  const handleSelectForCompare = (example: TradeExampleData) => {
    if (example.trade.status === "WIN") {
      setCompareWinner(example);
    } else {
      setCompareLoser(example);
    }
    setShowCompareModal(true);
  };

  const handleResetFilters = () => {
    setSelectedSymbol("ALL");
    setSelectedSetup("ALL");
    setSelectedSession("ALL");
    setSelectedClassification("ALL");
    setSelectedMistake("ALL");
    setSearchQuery("");
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Screenshot Coverage Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 shadow-xl relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-xs font-semibold font-mono">
              <Camera size={13} className="text-indigo-400" />
              <span>Visual Execution Library</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              TRADE EXAMPLES
            </h2>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-sans">
              Study your best executions. Understand your losing trades. Build your visual trading playbook based on actual trade outcomes and execution discipline.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowCompareModal(true)}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles size={14} className="text-amber-400" />
              <span>Compare Winner vs Loser</span>
            </button>
          </div>
        </div>

        {/* Coverage Metrics Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 border-t border-slate-800 pt-4 relative z-10">
          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Journal Coverage</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-white">{coverageStats.overallCoveragePercent}%</span>
              <span className="text-[10px] font-mono text-slate-400">({coverageStats.tradesWithScreenshots}/{coverageStats.totalTrades})</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${coverageStats.overallCoveragePercent}%` }} />
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Winning Coverage</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-emerald-400">{coverageStats.winningCoveragePercent}%</span>
              <span className="text-[10px] font-mono text-slate-400">({coverageStats.winningWithScreenshots}/{coverageStats.winningTradesCount})</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${coverageStats.winningCoveragePercent}%` }} />
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Losing Coverage</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-rose-400">{coverageStats.losingCoveragePercent}%</span>
              <span className="text-[10px] font-mono text-slate-400">({coverageStats.losingWithScreenshots}/{coverageStats.losingTradesCount})</span>
            </div>
            <div className="w-full bg-slate-800 h-1 rounded-full mt-2 overflow-hidden">
              <div className="bg-rose-500 h-full rounded-full" style={{ width: `${coverageStats.losingCoveragePercent}%` }} />
            </div>
          </div>

          <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Valid Execution Losses</span>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xl font-extrabold font-mono text-blue-400">
                {allExamples.filter(ex => ex.classification === "GOOD_LOSS").length}
              </span>
              <span className="text-[10px] font-mono text-slate-400">🔵 Good Loss</span>
            </div>
            <span className="text-[9px] text-slate-500 font-mono block mt-1">Followed plan, hit Stop Loss</span>
          </div>
        </div>
      </div>

      {/* Tabs & Filters Navigation Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm space-y-4">
        
        {/* Category Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap gap-1.5 font-mono text-xs">
            <button
              onClick={() => setActiveTab("all")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              All ({allExamples.length})
            </button>
            <button
              onClick={() => setActiveTab("winning")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "winning" ? "bg-emerald-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🟢 Winning Trades
            </button>
            <button
              onClick={() => setActiveTab("losing")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "losing" ? "bg-rose-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              🔴 Losing Trades
            </button>
            <button
              onClick={() => setActiveTab("golden")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "golden" ? "bg-amber-500 text-slate-950 shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              ⭐ Best Executions
            </button>
            <button
              onClick={() => setActiveTab("review")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "review" ? "bg-purple-600 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              ⚠ Needs Review
            </button>
            <button
              onClick={() => setActiveTab("mistakes")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                activeTab === "mistakes" ? "bg-rose-700 text-white shadow-sm" : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900"
              }`}
            >
              Mistake Gallery
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search symbol, notes, setup..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs pl-9 pr-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        {/* Dropdown Filters Row */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-mono">
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Asset Symbol</label>
            <select
              value={selectedSymbol}
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-1.5"
            >
              <option value="ALL">All Symbols</option>
              {uniqueSymbols.map(sym => <option key={sym} value={sym}>{sym}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Setup Type</label>
            <select
              value={selectedSetup}
              onChange={(e) => setSelectedSetup(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-1.5"
            >
              <option value="ALL">All Setups</option>
              {uniqueSetups.map(st => <option key={st} value={st}>{st}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Session</label>
            <select
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-1.5"
            >
              <option value="ALL">All Sessions</option>
              {uniqueSessions.map(ss => <option key={ss} value={ss}>{ss}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Classification</label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-1.5"
            >
              <option value="ALL">All Classifications</option>
              <option value="GOOD_WIN">🟢 Good Win</option>
              <option value="BAD_WIN">🟡 Bad Win</option>
              <option value="GOOD_LOSS">🔵 Good Loss</option>
              <option value="BAD_LOSS">🔴 Bad Loss</option>
              <option value="BREAKEVEN">⚪ Breakeven</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Mistake Filter</label>
            <select
              value={selectedMistake}
              onChange={(e) => setSelectedMistake(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 rounded-lg p-1.5"
            >
              <option value="ALL">All Mistakes</option>
              {ALL_MISTAKES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        {(selectedSymbol !== "ALL" || selectedSetup !== "ALL" || selectedSession !== "ALL" || selectedClassification !== "ALL" || selectedMistake !== "ALL" || searchQuery) && (
          <div className="flex justify-end pt-1">
            <button
              onClick={handleResetFilters}
              className="text-xs text-rose-500 hover:underline font-mono flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw size={12} /> Clear Filters
            </button>
          </div>
        )}
      </div>

      {/* "WHAT SEPARATES MY WINNERS?" STATISTICAL WIDGET */}
      <div className="bg-gradient-to-r from-indigo-950 via-slate-900 to-purple-950 border border-indigo-500/20 text-white rounded-2xl p-6 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold font-mono tracking-wide uppercase">
              WHAT SEPARATES YOUR WINNING TRADES FROM LOSING TRADES?
            </h3>
          </div>
          <span className="text-xs font-mono text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 px-3 py-1 rounded-full">
            Based on {separators.sampleSizes.winning} winning & {separators.sampleSizes.losing} losing screenshot logs
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          {/* Winning Separator Card */}
          <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl space-y-2">
            <h4 className="text-xs font-mono font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={14} />
              Winning Trades Most Commonly Contain
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200 font-sans">
              <li className="flex justify-between">
                <span>Playbook Rule Compliance:</span>
                <strong className="font-mono text-emerald-400">{separators.winningStats.playbookFollowedPct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Disciplined Setup Rating (≥4⭐):</span>
                <strong className="font-mono text-emerald-400">{separators.winningStats.highDisciplinePct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Calm or Confident Emotional State:</span>
                <strong className="font-mono text-emerald-400">{separators.winningStats.calmOrConfidentPct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Zero Behavioral Mistakes Triggered:</span>
                <strong className="font-mono text-emerald-400">{separators.winningStats.noMistakesPct}%</strong>
              </li>
            </ul>
          </div>

          {/* Losing Separator Card */}
          <div className="p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl space-y-2">
            <h4 className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert size={14} />
              Losing Trades Most Commonly Contain
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-200 font-sans">
              <li className="flex justify-between">
                <span>Behavioral Mistakes Triggered:</span>
                <strong className="font-mono text-rose-400">{separators.losingStats.mistakeTriggeredPct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>Playbook Plan Violations:</span>
                <strong className="font-mono text-rose-400">{separators.losingStats.playbookViolatedPct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>FOMO or Revenge Pressure:</span>
                <strong className="font-mono text-rose-400">{separators.losingStats.fomoOrRevengePct}%</strong>
              </li>
              <li className="flex justify-between">
                <span>High Stress or Fear Level:</span>
                <strong className="font-mono text-rose-400">{separators.losingStats.highStressOrFearPct}%</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Main Trade Cards Grid */}
      {filteredExamples.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-slate-500">
            <span>Showing {filteredExamples.length} trade example{filteredExamples.length !== 1 ? "s" : ""} ({screenshotExamples.length} with screenshots)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredExamples.map(example => (
              <TradeExampleCard
                key={example.trade.id}
                example={example}
                onSelectTrade={setSelectedExampleModal}
                onSelectForCompare={handleSelectForCompare}
                isCompareSelected={compareWinner?.trade.id === example.trade.id || compareLoser?.trade.id === example.trade.id}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-3">
          <Camera size={40} className="mx-auto text-slate-400 opacity-40" />
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 font-mono">No Matching Trade Examples Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Try adjusting your filters or attach chart screenshots when logging manual trades in your Trade Journal to populate your visual library.
          </p>
        </div>
      )}

      {/* Detail Modal */}
      {selectedExampleModal && (
        <TradeExampleDetailModal
          example={selectedExampleModal}
          userEmail={userEmail}
          onClose={() => setSelectedExampleModal(null)}
        />
      )}

      {/* Winner vs Loser Comparison Modal */}
      {showCompareModal && (
        <WinnerVsLoserCompareModal
          examples={allExamples}
          initialWinner={compareWinner}
          initialLoser={compareLoser}
          userEmail={userEmail}
          onClose={() => setShowCompareModal(false)}
        />
      )}

    </div>
  );
}
