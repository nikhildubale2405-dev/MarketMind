import React, { useState } from "react";
import { TradeExampleData } from "../types";
import { X, CheckCircle2, ShieldAlert, Sparkles, Image as ImageIcon, Award, Calendar, Clock, Smile, Star, ArrowUpRight, ArrowDownLeft, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";

interface TradeExampleDetailModalProps {
  example: TradeExampleData;
  userEmail: string | null;
  onClose: () => void;
}

export default function TradeExampleDetailModal({
  example,
  userEmail,
  onClose
}: TradeExampleDetailModalProps) {
  const { trade, executionScore, quality, classification, reasons, lesson } = example;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [aiReview, setAiReview] = useState<any | null>(null);
  const [loadingAi, setLoadingAi] = useState(false);

  const images = trade.images || [];
  const pnl = Number(trade.profitLoss) || 0;
  const isWin = trade.status === "WIN";

  const handleFetchAiReview = async () => {
    if (!userEmail) return;
    setLoadingAi(true);
    try {
      const res = await fetch("/api/trade-examples/analyze", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${userEmail}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tradeId: trade.id })
      });
      if (res.ok) {
        const data = await res.json();
        setAiReview(data);
      }
    } catch (err) {
      console.error("AI review fetch error:", err);
    } finally {
      setLoadingAi(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm overflow-y-auto flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden text-slate-800 dark:text-slate-100">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-lg font-black font-mono">{trade.symbol}</span>
            <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded ${
              trade.type === "BUY" ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-rose-500/10 text-rose-600 dark:text-rose-400"
            }`}>
              {trade.type} • {trade.size} Lots
            </span>
            <span className="text-xs text-slate-500 font-mono hidden sm:inline">
              {trade.entryDate} {trade.entryTime}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-full transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Main Image Display Box */}
          {images.length > 0 ? (
            <div className="space-y-2">
              <div className="relative bg-slate-950 rounded-xl overflow-hidden min-h-[260px] max-h-[460px] flex items-center justify-center border border-slate-800 shadow-inner">
                <img 
                  src={images[activeImageIndex]} 
                  alt={`${trade.symbol} chart execution`} 
                  className="max-h-[440px] w-auto max-w-full object-contain"
                />

                {images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all border border-slate-700 cursor-pointer"
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveImageIndex((prev) => (prev + 1) % images.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900/80 hover:bg-slate-800 text-white rounded-full transition-all border border-slate-700 cursor-pointer"
                    >
                      <ChevronRight size={18} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails list */}
              {images.length > 1 && (
                <div className="flex gap-2 justify-center">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-12 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx ? "border-indigo-500 scale-105 shadow-md" : "border-slate-700 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="p-8 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-center text-slate-500">
              <ImageIcon size={36} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold">No Chart Screenshot Attached</p>
              <p className="text-xs text-slate-400 mt-1">Upload screenshots in Trade Entry to unlock full visual playbook analysis.</p>
            </div>
          )}

          {/* Trade Metric Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Trade Outcome</span>
              <span className={`text-base font-black font-mono ${pnl > 0 ? "text-emerald-500" : pnl < 0 ? "text-rose-500" : "text-slate-400"}`}>
                {pnl > 0 ? "+" : ""}${pnl.toFixed(2)}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {trade.riskRewardRatio ? `${pnl >= 0 ? "+" : "-"}${trade.riskRewardRatio.toFixed(1)}R` : trade.status}
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Execution Score</span>
              <span className="text-base font-black font-mono text-indigo-600 dark:text-indigo-400">
                {executionScore}/100
              </span>
              <span className="text-[10px] text-slate-400 font-mono block uppercase">
                {quality} Quality
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Setup & Session</span>
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block truncate">
                {trade.setupType || "General"}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {trade.session || "London"} Session
              </span>
            </div>

            <div className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase block">Entry / Exit</span>
              <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 block">
                {trade.entryPrice} → {trade.exitPrice}
              </span>
              <span className="text-[10px] text-slate-400 font-mono block">
                {trade.stopLoss ? `SL: ${trade.stopLoss}` : "Market Order"}
              </span>
            </div>
          </div>

          {/* Structured Analysis Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Strengths / Why it worked */}
            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <CheckCircle2 size={14} />
                Execution Strengths & Positive Drivers
              </h4>
              {reasons.strengths.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {reasons.strengths.map((st, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-emerald-500 font-bold">•</span>
                      <span>{st}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 italic">No explicit execution strengths recorded.</p>
              )}
            </div>

            {/* Weaknesses / Mistakes */}
            <div className="p-4 bg-rose-500/5 border border-rose-500/20 rounded-xl space-y-2">
              <h4 className="text-xs font-bold text-rose-600 dark:text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldAlert size={14} />
                Execution Flaws & Behavioral Pitfalls
              </h4>
              {reasons.weaknesses.length > 0 ? (
                <ul className="space-y-1 text-xs text-slate-700 dark:text-slate-300">
                  {reasons.weaknesses.map((wk, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{wk}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-emerald-600 dark:text-emerald-400 italic">Zero behavioral mistakes or rule violations detected on this trade.</p>
              )}
            </div>
          </div>

          {/* Lesson Card */}
          {lesson && (
            <div className="p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl space-y-1">
              <h4 className="text-xs font-mono font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                Key Trading Lesson
              </h4>
              <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-sans">
                {lesson}
              </p>
            </div>
          )}

          {/* Gemini AI Review Integration */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-amber-400" />
                <h4 className="text-xs font-bold font-mono text-slate-900 dark:text-white uppercase tracking-wider">
                  Gemini AI Trade Audit
                </h4>
              </div>
              {!aiReview && (
                <button
                  type="button"
                  onClick={handleFetchAiReview}
                  disabled={loadingAi}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {loadingAi ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
                  Generate AI Audit
                </button>
              )}
            </div>

            {aiReview && (
              <div className="p-4 bg-slate-950 text-slate-100 rounded-xl border border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-indigo-400 font-bold border-b border-slate-800 pb-2">
                  <span>Alignment: {aiReview.playbookRelevance}</span>
                  <span>Classification: {aiReview.classification}</span>
                </div>
                <p className="text-slate-300 leading-relaxed">{aiReview.lesson}</p>
                {aiReview.observations && aiReview.observations.length > 0 && (
                  <div className="pt-2 border-t border-slate-800/80 text-[11px] text-slate-400 space-y-1">
                    <strong>Observations:</strong>
                    {aiReview.observations.map((obs: string, idx: number) => (
                      <p key={idx}>• {obs}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
