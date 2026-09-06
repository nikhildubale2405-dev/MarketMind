import React from "react";
import { TradeExampleData } from "../types";
import { CheckCircle2, AlertTriangle, ShieldAlert, Award, Image as ImageIcon, ArrowUpRight, ArrowDownLeft, Eye, Star } from "lucide-react";

interface TradeExampleCardProps {
  example: TradeExampleData;
  onSelectTrade: (example: TradeExampleData) => void;
  onSelectForCompare?: (example: TradeExampleData) => void;
  isCompareSelected?: boolean;
}

export default function TradeExampleCard({
  example,
  onSelectTrade,
  onSelectForCompare,
  isCompareSelected
}: TradeExampleCardProps) {
  const { trade, executionScore, quality, classification, reasons, lesson } = example;
  const isBuy = trade.type === "BUY";
  const pnl = Number(trade.profitLoss) || 0;
  const hasScreenshots = trade.images && trade.images.length > 0;
  const firstImage = hasScreenshots ? trade.images![0] : null;

  const getClassificationBadge = () => {
    switch (classification) {
      case "GOOD_WIN":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] px-2 py-0.5 rounded-md font-mono">
            🟢 Good Win
          </span>
        );
      case "BAD_WIN":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 font-bold text-[10px] px-2 py-0.5 rounded-md font-mono">
            🟡 Bad Win
          </span>
        );
      case "GOOD_LOSS":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-500/15 border border-blue-500/30 text-blue-600 dark:text-blue-400 font-bold text-[10px] px-2 py-0.5 rounded-md font-mono" title="Valid execution according to plan, hit stop loss due to statistical distribution">
            🔵 Good Loss (Valid Exec)
          </span>
        );
      case "BAD_LOSS":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-500/15 border border-rose-500/30 text-rose-600 dark:text-rose-400 font-bold text-[10px] px-2 py-0.5 rounded-md font-mono">
            🔴 Bad Loss
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-500/15 border border-slate-500/30 text-slate-600 dark:text-slate-400 font-bold text-[10px] px-2 py-0.5 rounded-md font-mono">
            ⚪ Breakeven
          </span>
        );
    }
  };

  return (
    <div className={`bg-white dark:bg-slate-900 border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between group ${
      isCompareSelected ? "border-indigo-500 ring-2 ring-indigo-500/30" : "border-slate-200 dark:border-slate-800"
    }`}>
      {/* Thumbnail Header */}
      <div 
        onClick={() => onSelectTrade(example)}
        className="relative h-44 bg-slate-950 overflow-hidden cursor-pointer flex items-center justify-center"
      >
        {firstImage ? (
          <img 
            src={firstImage} 
            alt={`${trade.symbol} chart screenshot`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
          />
        ) : (
          <div className="text-center p-4 text-slate-500">
            <ImageIcon size={32} className="mx-auto mb-1 opacity-40" />
            <span className="text-xs font-mono">No Screenshot</span>
          </div>
        )}

        {/* Top Badges Overlay */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
          {getClassificationBadge()}
          <span className="bg-slate-900/80 backdrop-blur-md border border-slate-700 text-white text-[10px] font-mono font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
            <ImageIcon size={10} />
            {trade.images?.length || 0}
          </span>
        </div>

        {/* Hover View Button Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <button 
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSelectTrade(example);
            }}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-lg flex items-center gap-1 cursor-pointer transition-all"
          >
            <Eye size={13} />
            Inspect Trade
          </button>
        </div>
      </div>

      {/* Card Content Details */}
      <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
        <div className="space-y-2">
          {/* Header Row: Symbol & Outcome */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-900 dark:text-white font-mono">{trade.symbol}</span>
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                isBuy 
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" 
                  : "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
              }`}>
                {trade.type} • {trade.size}L
              </span>
            </div>

            <div className="text-right">
              <span className={`font-mono text-sm font-black ${
                pnl > 0 ? "text-emerald-600 dark:text-emerald-400" : pnl < 0 ? "text-rose-600 dark:text-rose-400" : "text-slate-500"
              }`}>
                {pnl > 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
              {trade.riskRewardRatio && (
                <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 block">
                  {pnl >= 0 ? "+" : "-"}{trade.riskRewardRatio.toFixed(1)}R
                </span>
              )}
            </div>
          </div>

          {/* Setup & Session */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] px-2 py-0.5 rounded-md font-mono">
              {trade.setupType || "General Setup"}
            </span>
            <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-mono">
              {trade.session || "Session"}
            </span>
          </div>

          {/* Execution Quality Score Gauge */}
          <div className="bg-slate-50 dark:bg-slate-950 p-2 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Award size={14} className={executionScore >= 75 ? "text-emerald-500" : executionScore >= 50 ? "text-amber-500" : "text-rose-500"} />
              <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400 uppercase">Execution Quality</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-16 bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full ${
                    executionScore >= 75 ? "bg-emerald-500" : executionScore >= 50 ? "bg-amber-500" : "bg-rose-500"
                  }`} 
                  style={{ width: `${executionScore}%` }}
                />
              </div>
              <span className="text-xs font-mono font-extrabold text-slate-900 dark:text-white">{executionScore}/100</span>
            </div>
          </div>

          {/* Rule compliance / mistake indicators */}
          <div className="space-y-1 text-[11px]">
            {trade.playbookCompliance === "YES" ? (
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 size={12} className="shrink-0" />
                <span>Strict Playbook Compliance</span>
              </div>
            ) : trade.playbookCompliance === "NO" ? (
              <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
                <ShieldAlert size={12} className="shrink-0" />
                <span>Violated Rule: {trade.violatedRule || "Unplanned entry"}</span>
              </div>
            ) : null}

            {trade.mistakeTags && trade.mistakeTags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {trade.mistakeTags.map(tag => (
                  <span key={tag} className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 text-[9px] px-1.5 py-0.5 rounded font-mono">
                    ⚠ {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Card Footer Actions */}
        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onSelectTrade(example)}
            className="flex-1 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-lg transition-colors cursor-pointer text-center"
          >
            View Details
          </button>

          {onSelectForCompare && (
            <button
              type="button"
              onClick={() => onSelectForCompare(example)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                isCompareSelected
                  ? "bg-indigo-600 text-white"
                  : "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900 border border-indigo-200 dark:border-indigo-800"
              }`}
            >
              {isCompareSelected ? "Selected" : "Compare"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
