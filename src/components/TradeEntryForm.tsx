import React, { useState, useEffect } from "react";
import { Trade, Transaction } from "../types";
import { PlusCircle, Edit3, ArrowLeftRight, Check, X, ShieldAlert, DollarSign, RefreshCw } from "lucide-react";

interface TradeEntryFormProps {
  onAddTrade: (trade: Omit<Trade, "id">) => void;
  onUpdateTrade: (trade: Trade) => void;
  onAddTransaction: (tx: Omit<Transaction, "id">) => void;
  editingTrade: Trade | null;
  onCancelEdit: () => void;
}

const SUPPORTED_SYMBOLS = ["XAU/USD", "USOIL", "XAG/USD", "AUD/USD", "CAD/USD", "AUD/CAD", "BTC/USD"];

export default function TradeEntryForm({
  onAddTrade,
  onUpdateTrade,
  onAddTransaction,
  editingTrade,
  onCancelEdit
}: TradeEntryFormProps) {
  const [activeTab, setActiveTab] = useState<"trade" | "tx">("trade");

  // Helper for generating IST +5:30 (UTC+5:30) offset date/times
  const getISTDateTime = (offsetMinutes: number = 0) => {
    const now = new Date();
    if (offsetMinutes !== 0) {
      now.setMinutes(now.getMinutes() + offsetMinutes);
    }
    // Convert local timeline to UTC timeline, then set constant offset UTC+5:30 (IST +5:30)
    const utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    const istDate = new Date(utcMs + 19800000); // IST = UTC+5:30 = +19800000 ms

    const yyyy = istDate.getUTCFullYear();
    const mm = String(istDate.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(istDate.getUTCDate()).padStart(2, "0");
    const hh = String(istDate.getUTCHours()).padStart(2, "0");
    const min = String(istDate.getUTCMinutes()).padStart(2, "0");

    return {
      date: `${yyyy}-${mm}-${dd}`,
      time: `${hh}:${min}`
    };
  };

  // --- Trade Form States ---
  const [symbol, setSymbol] = useState("XAU/USD");
  const [customSymbol, setCustomSymbol] = useState("");
  const [useCustomSymbol, setUseCustomSymbol] = useState(false);
  const [type, setType] = useState<'BUY' | 'SELL'>("BUY");
  const [status, setStatus] = useState<'WIN' | 'LOSS' | 'BREAK_EVEN'>("WIN");
  const [profitLoss, setProfitLoss] = useState("");
  const [entryDate, setEntryDate] = useState(() => getISTDateTime().date);
  const [entryTime, setEntryTime] = useState(() => getISTDateTime().time);
  const [setupDate, setSetupDate] = useState(() => getISTDateTime(-30).date);
  const [setupTime, setSetupTime] = useState(() => getISTDateTime(-30).time);
  const [size, setSize] = useState("0.1");
  const [entryPrice, setEntryPrice] = useState("");
  const [exitPrice, setExitPrice] = useState("");
  const [stopLoss, setStopLoss] = useState("");
  const [takeProfit, setTakeProfit] = useState("");
  const [riskReward, setRiskReward] = useState("");
  const [emotionalState, setEmotionalState] = useState("calm");
  const [qualityScore, setQualityScore] = useState(3);
  const [notes, setNotes] = useState("");

  const [setupType, setSetupType] = useState("Breakout");
  const [session, setSession] = useState("London");
  const [psychConfidence, setPsychConfidence] = useState<number>(5);
  const [psychStress, setPsychStress] = useState<number>(4);
  const [psychFear, setPsychFear] = useState<number>(2);
  const [mistakeTags, setMistakeTags] = useState<string[]>([]);

  // --- Transaction Form States ---
  const [txType, setTxType] = useState<'DEPOSIT' | 'WITHDRAWAL'>("DEPOSIT");
  const [txAmount, setTxAmount] = useState("");
  const [txDate, setTxDate] = useState(() => getISTDateTime().date);
  const [txTime, setTxTime] = useState(() => getISTDateTime().time);
  const [txNotes, setTxNotes] = useState("");

  // --- Auto PnL Calculation Effects ---
  useEffect(() => {
    const ep = parseFloat(entryPrice);
    const xp = parseFloat(exitPrice);
    const sz = parseFloat(size);
    if (!isNaN(ep) && !isNaN(xp) && !isNaN(sz)) {
      // Basic PnL standard formulas based on points/contracts
      // XAU/USD (Gold) has 100 points per dollar. Contracts multiplier = 100 on standard lots
      // Let's make an intuitive lot size-based multiplier calculation
      let multiplier = 100;
      const lowerSym = (useCustomSymbol ? customSymbol : symbol).toLowerCase();
      if (lowerSym.includes("btc")) {
        multiplier = 10;
      } else if (lowerSym.includes("oil")) {
        multiplier = 1000;
      } else if (lowerSym.includes("cad") || lowerSym.includes("usd") && !lowerSym.includes("xau")) {
        // currencies usually pip based
        multiplier = 10000;
      }

      const diff = type === "BUY" ? (xp - ep) : (ep - xp);
      const calculatedPct = Number((diff * multiplier * sz).toFixed(2));
      setProfitLoss(String(calculatedPct));

      if (calculatedPct > 0) {
        setStatus("WIN");
      } else if (calculatedPct < 0) {
        setStatus("LOSS");
      } else {
        setStatus("BREAK_EVEN");
      }
    }
  }, [entryPrice, exitPrice, size, type, symbol, customSymbol, useCustomSymbol]);

  // --- Auto Risk Reward Calc ---
  useEffect(() => {
    const ep = parseFloat(entryPrice);
    const sl = parseFloat(stopLoss);
    const tp = parseFloat(takeProfit);

    if (!isNaN(ep) && !isNaN(sl) && !isNaN(tp)) {
      const risk = Math.abs(ep - sl);
      const reward = Math.abs(tp - ep);
      if (risk > 0) {
        setRiskReward(String(Number((reward / risk).toFixed(1))));
      }
    }
  }, [entryPrice, stopLoss, takeProfit]);

  // --- Handle loading trade edit states ---
  useEffect(() => {
    if (editingTrade) {
      setActiveTab("trade");
      if (SUPPORTED_SYMBOLS.includes(editingTrade.symbol)) {
        setSymbol(editingTrade.symbol);
        setUseCustomSymbol(false);
      } else {
        setCustomSymbol(editingTrade.symbol);
        setUseCustomSymbol(true);
      }
      setType(editingTrade.type);
      setStatus(editingTrade.status);
      setProfitLoss(String(editingTrade.profitLoss));
      setEntryDate(editingTrade.entryDate);
      setEntryTime(editingTrade.entryTime);
      setSetupDate(editingTrade.setupDate);
      setSetupTime(editingTrade.setupTime);
      setSize(String(editingTrade.size));
      setEntryPrice(String(editingTrade.entryPrice));
      setExitPrice(String(editingTrade.exitPrice));
      setStopLoss(editingTrade.stopLoss ? String(editingTrade.stopLoss) : "");
      setTakeProfit(editingTrade.takeProfit ? String(editingTrade.takeProfit) : "");
      setRiskReward(editingTrade.riskRewardRatio ? String(editingTrade.riskRewardRatio) : "");
      setEmotionalState(editingTrade.emotionalState || "calm");
      setQualityScore(editingTrade.qualityScore || 3);
      setNotes(editingTrade.notes || "");
      setSetupType(editingTrade.setupType || "Breakout");
      setSession(editingTrade.session || "London");
      setPsychConfidence(editingTrade.psychConfidence || 5);
      setPsychStress(editingTrade.psychStress || 4);
      setPsychFear(editingTrade.psychFear || 2);
      setMistakeTags(editingTrade.mistakeTags || []);
    }
  }, [editingTrade]);

  const handleResetTradeForm = () => {
    // Keep most recent dates
    setProfitLoss("");
    setEntryPrice("");
    setExitPrice("");
    setStopLoss("");
    setTakeProfit("");
    setRiskReward("");
    setNotes("");
    setSetupType("Breakout");
    setSession("London");
    setPsychConfidence(5);
    setPsychStress(4);
    setPsychFear(2);
    setMistakeTags([]);
    setCustomSymbol("");
    setUseCustomSymbol(false);
    if (editingTrade) {
      onCancelEdit();
    }
  };

  const handleTradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalSymbol = useCustomSymbol ? customSymbol.trim().toUpperCase() : symbol;
    if (!finalSymbol) {
      alert("Please provide a valid trade identifier.");
      return;
    }

    const tradeData = {
      symbol: finalSymbol,
      type,
      status,
      profitLoss: parseFloat(profitLoss) || 0,
      entryDate,
      entryTime,
      setupDate,
      setupTime,
      size: parseFloat(size) || 0.1,
      entryPrice: parseFloat(entryPrice) || 0,
      exitPrice: parseFloat(exitPrice) || 0,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined,
      riskRewardRatio: riskReward ? parseFloat(riskReward) : undefined,
      emotionalState,
      qualityScore,
      notes: notes.trim() || undefined,
      setupType,
      session,
      psychConfidence,
      psychStress,
      psychFear,
      mistakeTags
    };

    if (editingTrade) {
      onUpdateTrade({
        ...tradeData,
        id: editingTrade.id
      });
      alert("Trade journal record updated successfully!");
    } else {
      onAddTrade(tradeData);
      alert("Manual trade logged successfully!");
    }

    handleResetTradeForm();
  };

  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(txAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid deposit/withdrawal amount.");
      return;
    }

    onAddTransaction({
      type: txType,
      amount,
      date: txDate,
      time: txTime,
      notes: txNotes.trim() || undefined
    });

    alert(`${txType} transaction saved successfully!`);
    
    // Reset Form
    setTxAmount("");
    setTxNotes("");
  };

  return (
    <div id="journal-manual-entry-card" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col h-full text-slate-800 dark:text-slate-100">
      {/* Forms switcher tab header */}
      <div id="entry-form-tabs" className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 justify-between items-center">
        <div id="forms-toggle-buttons" className="flex gap-1.5">
          <button
            id="btn-tab-log-trade"
            onClick={() => {
              if (!editingTrade) setActiveTab("trade");
            }}
            disabled={!!editingTrade}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
              activeTab === "trade"
                ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-650 dark:text-indigo-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            } ${editingTrade ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            {editingTrade ? "Edit Mode Locked" : "Log Trade Setup"}
          </button>
          <button
            id="btn-tab-log-funding"
            onClick={() => setActiveTab("tx")}
            disabled={!!editingTrade}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
              activeTab === "tx"
                ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-semibold"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            } ${editingTrade ? "opacity-75 cursor-not-allowed" : ""}`}
          >
            Log Funding (Deposits/Withdrawals)
          </button>
        </div>
      </div>

      {/* Manual Entry scroll section */}
      <div 
        id="scrollable-entry-fields-area" 
        className="p-4 flex-1 overflow-y-auto max-h-[580px] custom-scrollbar bg-white dark:bg-slate-900"
        style={{ scrollbarWidth: 'thin' }}
      >
        {activeTab === "trade" ? (
          /* TRADING JOURNAL MANUAL ENTRY */
          <form id="trade-journal-form" onSubmit={handleTradeSubmit} className="space-y-3.5">
            
            {editingTrade && (
              <div id="edit-state-info-alert" className="bg-amber-50 dark:bg-amber-950/20 border border-amber-205 dark:border-amber-900/40 rounded p-2.5 flex items-center justify-between text-amber-850 dark:text-amber-300 mb-2">
                <div className="flex items-center gap-1.5 text-xs">
                  <ShieldAlert size={14} />
                  <span>You are editing <strong>{editingTrade.symbol}</strong> trade entry date: {editingTrade.entryDate}</span>
                </div>
                <button 
                  id="btn-cancel-top-edit"
                  type="button" 
                  onClick={handleResetTradeForm}
                  className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer font-semibold"
                >
                  Discard
                </button>
              </div>
            )}

            {/* Asset Selection */}
            <div id="selection-symbol-area" className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">Select Asset Symbol</label>
                {!useCustomSymbol ? (
                  <select
                    id="select-symbol"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    {SUPPORTED_SYMBOLS.map((sym) => (
                      <option key={sym} value={sym}>{sym}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    id="input-custom-symbol"
                    type="text"
                    required
                    placeholder="e.g. GBP/JPY, EUR/USD"
                    value={customSymbol}
                    onChange={(e) => setCustomSymbol(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  />
                )}
              </div>
              <div className="flex items-end">
                <button
                  id="btn-toggle-custom-symbol"
                  type="button"
                  onClick={() => setUseCustomSymbol(p => !p)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 text-[10px] p-2 rounded text-center transition-all font-mono cursor-pointer"
                >
                  {useCustomSymbol ? "Select listed asset" : "Custom symbol"}
                </button>
              </div>
            </div>

            {/* Direction, lot size, status */}
            <div id="direction-lot-row" className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">Order Direction</label>
                <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-950 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                  <button
                    id="btn-direction-buy"
                    type="button"
                    onClick={() => setType("BUY")}
                    className={`text-center py-1 text-xs rounded transition-all cursor-pointer ${
                      type === "BUY" ? "bg-white dark:bg-slate-900 shadow-xs text-emerald-700 dark:text-emerald-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    BUY
                  </button>
                  <button
                    id="btn-direction-sell"
                    type="button"
                    onClick={() => setType("SELL")}
                    className={`text-center py-1 text-xs rounded transition-all cursor-pointer ${
                      type === "SELL" ? "bg-white dark:bg-slate-900 shadow-xs text-rose-700 dark:text-rose-450 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                    }`}
                  >
                    SELL
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">Size (Lots)</label>
                <input
                  id="input-trade-lots"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="0.1"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5">Result Status</label>
                <select
                  id="select-trade-status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                >
                  <option value="WIN">WIN 🟢</option>
                  <option value="LOSS">LOSS 🔴</option>
                  <option value="BREAK_EVEN">BREAK EVEN ⚪</option>
                </select>
              </div>
            </div>

            {/* SETUP Timing Fields */}
            <div id="setup-timing-fields" className="border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase mb-1">1. Setup Patterns Identification</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Setup Date</label>
                  <input
                    id="input-setup-date"
                    type="date"
                    required
                    value={setupDate}
                    onChange={(e) => setSetupDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Setup Time (IST)</label>
                  <input
                    id="input-setup-time"
                    type="time"
                    required
                    value={setupTime}
                    onChange={(e) => setSetupTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* ENTRY Execution Timing Fields */}
            <div id="entry-timing-fields" className="border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase mb-1">2. Position Execution</span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Entry Date</label>
                  <input
                    id="input-entry-date"
                    type="date"
                    required
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Execution Time (IST)</label>
                  <input
                    id="input-entry-time"
                    type="time"
                    required
                    value={entryTime}
                    onChange={(e) => setEntryTime(e.target.value)}
                    className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>

            {/* Price levels */}
            <div id="prices-row" className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Entry Price</label>
                <input
                  id="input-entry-price"
                  type="number"
                  required
                  step="any"
                  placeholder="2015.5"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Exit Price</label>
                <input
                  id="input-exit-price"
                  type="number"
                  required
                  step="any"
                  placeholder="2020.5"
                  value={exitPrice}
                  onChange={(e) => setExitPrice(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-805 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Stop Loss (SL)</label>
                <input
                  id="input-stop-loss"
                  type="number"
                  step="any"
                  placeholder="2012.0"
                  value={stopLoss}
                  onChange={(e) => setStopLoss(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-808 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Take Profit (TP)</label>
                <input
                  id="input-take-profit"
                  type="number"
                  step="any"
                  placeholder="2025.0"
                  onChange={(e) => setTakeProfit(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Calculated fields: Risk/Reward, PnL */}
            <div id="results-calc-row" className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-200 dark:border-slate-800 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5 flex items-center gap-1">
                  Profit / Loss ($) 
                  <span className="text-[8px] lowercase opacity-60">(customizable)</span>
                </label>
                <input
                  id="input-calc-pnl"
                  type="number"
                  step="any"
                  required
                  value={profitLoss}
                  onChange={(e) => setProfitLoss(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-300 dark:border-slate-805 text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-0.5">Risk Reward Ratio (R:R)</label>
                <input
                  id="input-calc-rr"
                  type="number"
                  step="0.1"
                  placeholder="2.5"
                  value={riskReward}
                  onChange={(e) => setRiskReward(e.target.value)}
                  className="w-full bg-transparent border-b border-slate-300 dark:border-slate-805 text-slate-800 dark:text-slate-100 font-mono text-xs focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
                        {/* Quality rating score & mental emotion tag */}
            <div id="rating-psychology" className="grid grid-cols-2 gap-2.5 border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-0.5">Emotional State</label>
                <select
                  id="select-emotional-state"
                  value={emotionalState}
                  onChange={(e) => setEmotionalState(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="calm">Calm 🕯️</option>
                  <option value="confident">Confident 🚀</option>
                  <option value="anxious">Anxious 😰</option>
                  <option value="fomo">FOMO / Chasing 🏃‍♂️</option>
                  <option value="greedy">Greedy 🤑</option>
                  <option value="revenge">Revenge / Angry 👿</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-1">Setup Discipline (1-5 ⭐)</label>
                <div className="flex gap-1.5 items-center mt-1">
                  {[1, 2, 3, 4, 5].map((stars) => (
                    <button
                      id={`btn-star-${stars}`}
                      key={stars}
                      type="button"
                      onClick={() => setQualityScore(stars)}
                      className={`text-lg transition-colors cursor-pointer ${
                        stars <= qualityScore ? "text-amber-500" : "text-slate-300 dark:text-slate-700"
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({qualityScore}/5)</span>
                </div>
              </div>
            </div>

            {/* Advanced attributes layout: Setup type, session, sliders, mistakes tags */}
            <div id="advanced-compliance-selectors" className="border-t border-slate-205 dark:border-slate-800 pt-2.5 grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5 text-xs">Setup Type</label>
                <select
                  id="select-setup-type"
                  value={setupType}
                  onChange={(e) => setSetupType(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Breakout">Breakout</option>
                  <option value="Pullback">Pullback</option>
                  <option value="Reversal">Reversal</option>
                  <option value="Liquidity Sweep">Liquidity Sweep</option>
                  <option value="Trend Continuation">Trend Continuation</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-mono text-slate-500 dark:text-slate-400 mb-0.5 text-xs">Session (IST Timezone)</label>
                <select
                  id="select-trading-session"
                  value={session}
                  onChange={(e) => setSession(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="Asian">Asian Session (05:30 - 14:30)</option>
                  <option value="London">London Session (13:30 - 21:30)</option>
                  <option value="New York">New York Session (18:30 - 02:30)</option>
                  <option value="London-NY Overlap">London-NY Overlap (18:30 - 21:30)</option>
                  <option value="Unknown">Off-Session (Other)</option>
                </select>
              </div>
            </div>

            <div id="psych-sliders" className="border-t border-slate-205 dark:border-slate-800 pt-2.5 space-y-2">
              <span className="text-[9px] font-mono font-bold text-slate-400 dark:text-slate-500 tracking-wider block uppercase">Psychological Indicators Journal</span>
              
              <div className="grid grid-cols-3 gap-2 text-[10px]">
                <div className="space-y-0.5">
                  <div className="flex justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span>Confidence:</span>
                    <strong>{psychConfidence}/10</strong>
                  </div>
                  <input
                    id="slider-confidence"
                    type="range"
                    min="1"
                    max="10"
                    value={psychConfidence}
                    onChange={(e) => setPsychConfidence(parseInt(e.target.value))}
                    className="w-full accent-indigo-650"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span>Stress:</span>
                    <strong>{psychStress}/10</strong>
                  </div>
                  <input
                    id="slider-stress"
                    type="range"
                    min="1"
                    max="10"
                    value={psychStress}
                    onChange={(e) => setPsychStress(parseInt(e.target.value))}
                    className="w-full accent-rose-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <div className="flex justify-between font-mono text-slate-500 dark:text-slate-400">
                    <span>Fear level:</span>
                    <strong>{psychFear}/10</strong>
                  </div>
                  <input
                    id="slider-fear"
                    type="range"
                    min="1"
                    max="10"
                    value={psychFear}
                    onChange={(e) => setPsychFear(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Checklist of Mistake Tags */}
            <div id="mistakes-checklist-field" className="border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <span className="text-[9px] font-mono font-bold text-slate-550 dark:text-slate-400 tracking-wider block uppercase mb-1.5">Triggered Behavioral Mistakes / Pitfall tags</span>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {["FOMO", "Revenge trade", "Overtrading", "Early exit", "Late entry", "Ignored stop loss", "News trade", "Emotional trade"].map((tag) => {
                  const isChecked = mistakeTags.includes(tag);
                  return (
                    <label 
                      key={tag} 
                      className={`flex items-center gap-1.5 p-1.5 rounded border text-[10px] cursor-pointer transition-all ${
                        isChecked 
                          ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900 text-rose-800 dark:text-rose-400 font-semibold" 
                          : "bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {
                          if (isChecked) {
                            setMistakeTags(prev => prev.filter(t => t !== tag));
                          } else {
                            setMistakeTags(prev => [...prev, tag]);
                          }
                        }}
                        className="w-3 h-3 text-rose-600 rounded cursor-pointer pointer-events-auto"
                      />
                      <span>{tag}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Notes area */}
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-0.5">Trade Session Setup Notes</label>
              <textarea
                id="text-notes"
                rows={2}
                placeholder="Market catalyst overview, candle breakout, why you executed..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {/* Action Buttons */}
            <div id="journal-actions-row" className="flex gap-2 border-t border-slate-205 dark:border-slate-800 pt-2.5">
              <button
                id="btn-journal-submit"
                type="submit"
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingTrade ? <Check size={13} /> : <PlusCircle size={13} />}
                {editingTrade ? "Save Modifications" : "Add Trade to Journal"}
              </button>
              {(editingTrade || entryPrice || exitPrice) && (
                <button
                  id="btn-journal-reset"
                  type="button"
                  onClick={handleResetTradeForm}
                  className="bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-705 dark:text-slate-300 text-xs px-3 py-2 rounded transition-all font-semibold cursor-pointer"
                >
                  Clear Fields
                </button>
              )}
            </div>
          </form>
        ) : (
          /* DEPOSIT AND WITHDRAWAL FORM */
          <form id="tx-funding-form" onSubmit={handleTransactionSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-0.5">Transaction Category</label>
              <div className="grid grid-cols-2 bg-slate-100 dark:bg-slate-900 p-0.5 rounded border border-slate-200 dark:border-slate-800">
                <button
                  id="btn-funding-deposit"
                  type="button"
                  onClick={() => setTxType("DEPOSIT")}
                  className={`text-center py-1.5 text-xs rounded transition-all cursor-pointer ${
                    txType === "DEPOSIT" ? "bg-white dark:bg-slate-950 shadow-xs text-indigo-700 dark:text-indigo-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                  }`}
                >
                  DEPOSIT (+)
                </button>
                <button
                  id="btn-funding-withdrawal"
                  type="button"
                  onClick={() => setTxType("WITHDRAWAL")}
                  className={`text-center py-1.5 text-xs rounded transition-all cursor-pointer ${
                    txType === "WITHDRAWAL" ? "bg-white dark:bg-slate-950 shadow-xs text-amber-500 dark:text-amber-400 font-bold" : "text-slate-500 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
                  }`}
                >
                  WITHDRAWAL (-)
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-0.5">Transfer Amount ($)</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                  <span className="text-slate-400 dark:text-slate-500 text-xs">$</span>
                </div>
                <input
                  id="input-tx-amount"
                  type="number"
                  required
                  step="0.01"
                  min="0.01"
                  placeholder="500.00"
                  value={txAmount}
                  onChange={(e) => setTxAmount(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 pl-5 focus:ring-1 focus:ring-indigo-505 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Transaction Date</label>
                <input
                  id="input-tx-date"
                  type="date"
                  required
                  value={txDate}
                  onChange={(e) => setTxDate(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-805 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-500 dark:text-slate-400 mb-0.5">Transaction Time (IST)</label>
                <input
                  id="input-tx-time"
                  type="time"
                  required
                  value={txTime}
                  onChange={(e) => setTxTime(e.target.value)}
                  className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-805 dark:text-slate-100 text-xs rounded p-1.5 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-500 dark:text-slate-400 mb-0.5">Notes / Description (Optional)</label>
              <textarea
                id="text-tx-notes"
                rows={2}
                placeholder="Initial capital funding, profits drawing, etc."
                value={txNotes}
                onChange={(e) => setTxNotes(e.target.value)}
                className="w-full bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-100 text-xs rounded p-1.5 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div id="funding-alert-info" className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded border border-slate-205 dark:border-slate-800 text-slate-500 dark:text-slate-430 text-[10px]">
              {txType === "DEPOSIT" ? (
                <p>💡 Depositing funds directly increases your <strong>Total Investment</strong> and increases <strong>Total Equity</strong> available balance logs.</p>
              ) : (
                <p>💡 Withdrawing funds decreases available trade balance <strong>Equity</strong> statistics. It does not negatively reflect in your trade PnL calculations.</p>
              )}
            </div>

            <button
               id="btn-tx-submit"
               type="submit"
               className={`w-full font-bold text-xs py-2 rounded transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                 txType === "DEPOSIT" 
                   ? "bg-indigo-600 hover:bg-indigo-700 text-white" 
                   : "bg-amber-100 dark:bg-amber-950/40 hover:bg-amber-200 dark:hover:bg-amber-900 text-amber-805 dark:text-amber-400 border border-amber-300 dark:border-amber-900"
               }`}
             >
              <PlusCircle size={13} />
              Save {txType.charAt(0) + txType.slice(1).toLowerCase()} Transaction
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
