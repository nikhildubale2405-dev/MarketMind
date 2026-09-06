import React, { useState, useEffect } from "react";
import { TradeExampleData } from "../types";
import { X, Sparkles, Image as ImageIcon, ArrowRight, ShieldAlert, CheckCircle2, Award, Loader2 } from "lucide-react";

interface WinnerVsLoserCompareModalProps {
  examples: TradeExampleData[];
  initialWinner?: TradeExampleData;
  initialLoser?: TradeExampleData;
  userEmail: string | null;
  onClose: () => void;
}

export default function WinnerVsLoserCompareModal({
  examples,
  initialWinner,
  initialLoser,
  userEmail,
  onClose
}: WinnerVsLoserCompareModalProps) {
  const winners = examples.filter(ex => ex.trade.status === "WIN");
  const losers = examples.filter(ex => ex.trade.status === "LOSS");

  const [selectedWinnerId, setSelectedWinnerId] = useState<string>(initialWinner ? initialWinner.trade.id : (winners[0]?.trade.id || ""));
  const [selectedLoserId, setSelectedLoserId] = useState<string>(initialLoser ? initialLoser.trade.id : (losers[0]?.trade.id || ""));
  const [aiComparison, setAiComparison] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const selectedWinner = examples.find(ex => ex.trade.id === selectedWinnerId) || initialWinner || winners[0];
  const selectedLoser = examples.find(ex => ex.trade.id === selectedLoserId) || initialLoser || losers[0];

  useEffect(() => {
    setAiComparison(null);
  }, [selectedWinnerId, selectedLoserId]);

  const handleRunAiComparison = async () => {
    if (!selectedWinner || !selectedLoser || !userEmail) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/trade-examples/compare", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userEmail}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          winnerId: selectedWinner.trade.id,
          loserId: selectedLoser.trade.id
        })
      });
      if (res.ok) {
        const data = await res.json();
        setAiComparison(data);
      }
    } catch (err) {
      console.error("AI comparison error:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-5xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold font-mono text-slate-900 dark:text-white flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              VISUAL TRADE COMPARISON: WINNER VS LOSER
            </h3>
            <p className="text-xs text-slate-500 font-mono">
              Compare execution differences side-by-side to discover recurring edge patterns.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Trade Selectors */}
        <div className="p-4 bg-slate-100 dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 mb-1">
              Select Winning Trade:
            </label>
            <select
              value={selectedWinnerId}
              onChange={(e) => setSelectedWinnerId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs rounded-lg p-2 font-mono"
            >
              {winners.map(w => (
                <option key={w.trade.id} value={w.trade.id}>
                  🟢 {w.trade.symbol} ({w.trade.entryDate}) +${w.trade.profitLoss} ({w.trade.riskRewardRatio || 0}R)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-mono font-bold text-rose-600 dark:text-rose-400 mb-1">
              Select Losing Trade:
            </label>
            <select
              value={selectedLoserId}
              onChange={(e) => setSelectedLoserId(e.target.value)}
              className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 text-xs rounded-lg p-2 font-mono"
            >
              {losers.map(l => (
                <option key={l.trade.id} value={l.trade.id}>
                  🔴 {l.trade.symbol} ({l.trade.entryDate}) -${Math.abs(l.trade.profitLoss)} ({l.trade.riskRewardRatio ? -1 : 0}R)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Side by Side Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          {selectedWinner && selectedLoser ? (
            <div className="space-y-6">
              
              {/* Screenshots Side-by-Side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Winner Card */}
                <div className="border border-emerald-500/30 rounded-2xl overflow-hidden bg-emerald-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 size={16} />
                      WINNER: {selectedWinner.trade.symbol} ({selectedWinner.trade.type})
                    </span>
                    <span className="font-mono text-sm font-black text-emerald-500">
                      +${selectedWinner.trade.profitLoss} (+{selectedWinner.trade.riskRewardRatio || 0}R)
                    </span>
                  </div>

                  <div className="h-48 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                    {selectedWinner.trade.images && selectedWinner.trade.images.length > 0 ? (
                      <img src={selectedWinner.trade.images[0]} alt="Winning trade chart" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">No Screenshot Attached</span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Setup:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedWinner.trade.setupType || "General"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Session:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedWinner.trade.session || "London"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Playbook Compliance:</span>
                      <strong className="font-mono text-emerald-500">{selectedWinner.trade.playbookCompliance || "YES"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Emotional State:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedWinner.trade.emotionalState || "Calm"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Execution Score:</span>
                      <strong className="font-mono text-indigo-400">{selectedWinner.executionScore}/100 ({selectedWinner.quality})</strong>
                    </p>
                  </div>
                </div>

                {/* Loser Card */}
                <div className="border border-rose-500/30 rounded-2xl overflow-hidden bg-rose-500/5 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm font-mono text-rose-600 dark:text-rose-400 flex items-center gap-1">
                      <ShieldAlert size={16} />
                      LOSER: {selectedLoser.trade.symbol} ({selectedLoser.trade.type})
                    </span>
                    <span className="font-mono text-sm font-black text-rose-500">
                      -${Math.abs(selectedLoser.trade.profitLoss)} ({selectedLoser.trade.riskRewardRatio ? -1 : 0}R)
                    </span>
                  </div>

                  <div className="h-48 bg-slate-950 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
                    {selectedLoser.trade.images && selectedLoser.trade.images.length > 0 ? (
                      <img src={selectedLoser.trade.images[0]} alt="Losing trade chart" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xs text-slate-500 font-mono">No Screenshot Attached</span>
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Setup:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedLoser.trade.setupType || "General"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Session:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedLoser.trade.session || "London"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Playbook Compliance:</span>
                      <strong className="font-mono text-rose-500">{selectedLoser.trade.playbookCompliance || "NO"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Emotional State:</span>
                      <strong className="font-mono text-slate-800 dark:text-slate-200">{selectedLoser.trade.emotionalState || "Emotional"}</strong>
                    </p>
                    <p className="flex justify-between">
                      <span className="text-slate-500 font-mono">Execution Score:</span>
                      <strong className="font-mono text-rose-400">{selectedLoser.executionScore}/100 ({selectedLoser.quality})</strong>
                    </p>
                  </div>
                </div>

              </div>

              {/* Key Separator Insights Box */}
              <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-extrabold font-mono text-indigo-600 dark:text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Award size={15} />
                    KEY DIFFERENCE BETWEEN THIS WINNER & LOSER
                  </h4>
                  {!aiComparison && (
                    <button
                      type="button"
                      onClick={handleRunAiComparison}
                      disabled={loadingAi}
                      className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      {loadingAi ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                      Run AI Comparative Audit
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-700 dark:text-slate-200 font-medium leading-relaxed">
                  {aiComparison ? aiComparison.keySeparator : (
                    selectedWinner.trade.playbookCompliance !== selectedLoser.trade.playbookCompliance
                      ? `The winning trade strictly adhered to playbook entry rules, while the losing trade suffered from ${selectedLoser.trade.violatedRule || "unplanned execution or rule violations"}.`
                      : `Both trades shared setup similarities, but differences in execution timing, session liquidity, or emotional discipline influenced the trade trajectory.`
                  )}
                </p>

                {aiComparison && (
                  <div className="pt-2 border-t border-indigo-500/20 space-y-2 text-xs font-mono">
                    <p className="text-emerald-500 font-bold">Winning Factors: {aiComparison.winningFactors?.join(" • ")}</p>
                    <p className="text-rose-500 font-bold">Losing Factors: {aiComparison.losingFactors?.join(" • ")}</p>
                    <p className="text-indigo-300 italic">Actionable Insight: {aiComparison.actionableRecommendation}</p>
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="p-8 text-center text-slate-500 font-mono text-xs">
              Please select at least 1 winning trade and 1 losing trade from your journal to compare.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
