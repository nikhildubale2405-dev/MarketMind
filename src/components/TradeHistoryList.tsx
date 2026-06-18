import React, { useState } from "react";
import { Trade, Transaction } from "../types";
import { ChevronDown, ChevronRight, Edit2, Trash2, Tag, Calendar, Clock, Smile, Star, ArrowUpRight, ArrowDownLeft } from "lucide-react";

interface TradeHistoryListProps {
  trades: Trade[];
  transactions: Transaction[];
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
  onDeleteTransaction: (id: string) => void;
}

export default function TradeHistoryList({
  trades,
  transactions,
  onEditTrade,
  onDeleteTrade,
  onDeleteTransaction
}: TradeHistoryListProps) {
  const [expandedDates, setExpandedDates] = useState<Record<string, boolean>>(() => {
    // By default, only today's trades are expanded.
    const d = new Date();
    const offset = d.getTimezoneOffset();
    const todayStr = new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
    return { [todayStr]: true };
  });

  const [activeTab, setActiveTab] = useState<"trades" | "transactions">("trades");

  // Non-blocking inline confirm states for iframe compliance
  const [confirmDeleteTradeId, setConfirmDeleteTradeId] = useState<string | null>(null);
  const [confirmDeleteTxId, setConfirmDeleteTxId] = useState<string | null>(null);

  const toggleDate = (dateStr: string) => {
    setExpandedDates(prev => ({
      ...prev,
      [dateStr]: !prev[dateStr]
    }));
  };

  // Group trades by entryDate
  const groupTradesByDate = () => {
    const groups: Record<string, Trade[]> = {};
    trades.forEach(t => {
      const date = t.entryDate || "No Date";
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(t);
    });

    // Sort dates by descending order (most recent first)
    return Object.keys(groups)
      .sort((a, b) => b.localeCompare(a))
      .map(date => {
        const dateTrades = groups[date];
        const dateObj = new Date(date + "T00:00:00");
        const dayName = dateObj.toLocaleDateString("en-US", { weekday: "long" });
        const daySum = dateTrades.reduce((sum, t) => sum + Number(t.profitLoss || 0), 0);

        return {
          date,
          dayName,
          trades: dateTrades,
          summaryPnL: daySum
        };
      });
  };

  const groupedTrades = groupTradesByDate();

  return (
    <div id="trade-history-organizer" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg overflow-hidden shadow-sm flex flex-col h-full text-slate-850 dark:text-slate-105">
      {/* Tab Navigation header */}
      <div id="history-tabs-header" className="flex border-b border-slate-202 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-2 items-center justify-between">
        <div id="tabs-toggle-buttons" className="flex gap-1.5">
          <button
            id="btn-tab-trades"
            role="tab"
            aria-selected={activeTab === "trades"}
            onClick={() => setActiveTab("trades")}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
              activeTab === "trades"
                ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-indigo-650 dark:text-indigo-400 font-semibold shadow-xs"
                : "text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Trades Log ({trades.length})
          </button>
          <button
            id="btn-tab-transactions"
            role="tab"
            aria-selected={activeTab === "transactions"}
            onClick={() => setActiveTab("transactions")}
            className={`px-2.5 py-1 text-xs font-mono rounded transition-all cursor-pointer ${
              activeTab === "transactions"
                ? "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-amber-600 dark:text-amber-400 font-semibold shadow-xs"
                : "text-slate-550 dark:text-slate-400 hover:text-slate-850 dark:hover:text-slate-200"
            }`}
          >
            Deposits & Withdrawals ({transactions.length})
          </button>
        </div>
        <div id="log-status-badge" className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          IST +5:30 Synchronized
        </div>
      </div>

      {/* Independent scroll area for trading history */}
      <div 
        id="scrollable-trade-history-container" 
        className="overflow-y-auto flex-1 p-4 space-y-4 max-h-[580px] custom-scrollbar"
        style={{ scrollbarWidth: 'thin' }}
      >
        {activeTab === "trades" ? (
          groupedTrades.length === 0 ? (
            <div id="empty-trades-view" className="text-center py-16 text-slate-500">
              <Calendar className="mx-auto mb-3 opacity-30" size={36} />
              <p className="text-sm">No trades registered yet.</p>
              <p className="text-xs text-slate-600 mt-1">Use the Manual Trade Entry form to add your first journal trade.</p>
            </div>
          ) : (
            groupedTrades.map(group => {
              const isExpanded = !!expandedDates[group.date];
              const pnlColor = group.summaryPnL > 0 
                ? "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 px-1.5 py-0.5 rounded" 
                : group.summaryPnL < 0 
                  ? "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 px-1.5 py-0.5 rounded" 
                  : "text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-1.5 py-0.5 rounded";

              return (
                <div 
                  id={`date-section-${group.date}`} 
                  key={group.date}
                  className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded overflow-hidden transition-all shadow-xs"
                >
                  {/* Collapsible Section Header */}
                  <div
                    id={`section-header-${group.date}`}
                    onClick={() => toggleDate(group.date)}
                    className="flex items-center justify-between p-2 cursor-pointer bg-slate-50 dark:bg-slate-950 hover:bg-slate-100/80 dark:hover:bg-slate-900 transition-colors border-b border-slate-202 dark:border-slate-800"
                  >
                    <div id="header-left-side" className="flex items-center gap-1.5">
                      {isExpanded ? <ChevronDown size={14} className="text-slate-500 dark:text-slate-400" /> : <ChevronRight size={14} className="text-slate-500 dark:text-slate-400" />}
                      <div>
                        <div id="date-label-area" className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{group.date}</span>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">({group.dayName})</span>
                        </div>
                        <div id="count-label-area" className="text-[9px] text-slate-400 dark:text-slate-500 font-mono mt-0.5">
                          {group.trades.length} {group.trades.length === 1 ? "trade" : "trades"}
                        </div>
                      </div>
                    </div>
                    
                    {/* Collapsible Section Right - Summary result */}
                    <div id="header-right-side" className="text-right">
                      <span className={`font-mono text-xs font-bold ${pnlColor}`}>
                        {group.summaryPnL > 0 ? "+" : ""}${group.summaryPnL.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Expanded Trades List */}
                  {isExpanded && (
                    <div id={`trades-list-${group.date}`} className="divide-y divide-slate-105 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {group.trades.map((trade) => {
                        const tradePnL = Number(trade.profitLoss) || 0;
                        const cardPnLColor = tradePnL > 0 
                          ? "bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold" 
                          : tradePnL < 0 
                            ? "bg-rose-50 border border-rose-200 text-rose-700 font-bold" 
                            : "bg-slate-50 border border-slate-200 text-slate-600";

                        const isBuy = trade.type === "BUY";

                        return (
                          <div 
                            id={`trade-card-${trade.id}`}
                            key={trade.id} 
                            className="p-3 hover:bg-slate-50/50 dark:hover:bg-slate-950/50 transition-colors flex flex-col sm:flex-row gap-2 justify-between items-start sm:items-center"
                          >
                            <div id="trade-body-left" className="flex gap-2.5">
                              {/* Symbol badge / Direction */}
                              <div id="direction-symbol-badge" className="flex flex-col justify-center items-center min-w-[70px]">
                                <span className="font-bold text-slate-800 dark:text-slate-200 text-xs tracking-tight">{trade.symbol}</span>
                                <span className={`text-[9px] font-mono font-bold px-1 py-0.5 rounded mt-0.5 uppercase ${
                                  isBuy ? "bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400" : "bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40 text-rose-600 dark:text-rose-400"
                                }`}>
                                  {trade.type} • {trade.size}L
                                </span>
                              </div>

                              {/* Timings, score, emotions */}
                              <div id="trade-meta-details" className="text-xs">
                                <div id="meta-times" className="flex flex-wrap items-center gap-x-2 text-slate-500 dark:text-slate-400 text-[11px]">
                                  <span id="label-setup-time" className="flex items-center gap-0.5" title="Setup Time">
                                    <Tag size={9} className="text-slate-400 dark:text-slate-500" />
                                    Setup: <span className="text-slate-700 dark:text-slate-300 font-mono">{trade.setupTime}</span>
                                  </span>
                                  <span id="label-entry-time" className="flex items-center gap-0.5" title="Execution Time">
                                    <Clock size={9} className="text-slate-400 dark:text-slate-500" />
                                    Entry: <span className="text-slate-700 dark:text-slate-300 font-mono">{trade.entryTime}</span>
                                  </span>
                                </div>

                                <div id="meta-prices" className="text-slate-500 dark:text-slate-450 mt-0.5 font-mono text-[10px]">
                                  Prices: <span className="text-slate-805 dark:text-slate-300 font-medium">{trade.entryPrice}</span> → <span className="text-slate-850 dark:text-slate-200 font-medium">{trade.exitPrice}</span>
                                  {trade.stopLoss && <span className="text-slate-400 dark:text-slate-500"> | SL: {trade.stopLoss}</span>}
                                  {trade.takeProfit && <span className="text-slate-400 dark:text-slate-500"> | TP: {trade.takeProfit}</span>}
                                </div>

                                <div id="badge-emotions" className="flex items-center gap-1.5 mt-1">
                                  {trade.emotionalState && (
                                    <span id="tag-emotion" className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[9px] px-1.5 py-0.5 rounded italic">
                                      <Smile size={9} className="text-slate-400 dark:text-slate-500" />
                                      {trade.emotionalState}
                                    </span>
                                  )}
                                  {trade.qualityScore && (
                                    <span id="tag-quality" className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-amber-600 dark:text-amber-400 text-[9px] px-1.5 py-0.5 rounded">
                                      <Star size={9} className="fill-amber-400 text-amber-400" />
                                      {trade.qualityScore}/5 Setup
                                    </span>
                                  )}
                                </div>

                                {trade.notes && (
                                  <p id="trade-notes" className="text-slate-500 dark:text-slate-450 mt-1 text-[10px] italic line-clamp-1 max-w-[320px]">
                                    "{trade.notes}"
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* PnL and Actions */}
                            <div id="trade-body-right" className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-2">
                              {/* ProfitLoss Display */}
                              <div id="pnl-badge-area" className="text-right">
                                <span className={`text-[11px] font-mono px-2 py-0.5 rounded inline-block ${cardPnLColor}`}>
                                  {tradePnL > 0 ? "+" : ""}${tradePnL.toFixed(2)}
                                </span>
                                <div id="status-label" className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                                  {trade.status}
                                </div>
                              </div>

                              {/* Edit & Delete Buttons */}
                              <div id="action-buttons" className="flex items-center gap-0.5">
                                {confirmDeleteTradeId === trade.id ? (
                                  <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900 rounded p-0.5 animate-bounce-short">
                                    <span className="text-[9px] text-rose-700 dark:text-rose-400 font-bold px-1 font-sans">Delete?</span>
                                    <button
                                      id={`btn-confirm-delete-trade-${trade.id}`}
                                      onClick={() => {
                                        onDeleteTrade(trade.id);
                                        setConfirmDeleteTradeId(null);
                                      }}
                                      className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                                    >
                                      Yes
                                    </button>
                                    <button
                                      id={`btn-cancel-delete-trade-${trade.id}`}
                                      onClick={() => setConfirmDeleteTradeId(null)}
                                      className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors"
                                    >
                                      No
                                    </button>
                                  </div>
                                ) : (
                                  <>
                                    <button
                                      id={`btn-edit-trade-${trade.id}`}
                                      onClick={() => onEditTrade(trade)}
                                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                      title="Edit Trade details"
                                    >
                                      <Edit2 size={11} />
                                    </button>
                                    <button
                                      id={`btn-delete-trade-${trade.id}`}
                                      onClick={() => setConfirmDeleteTradeId(trade.id)}
                                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-rose-600 dark:hover:text-rose-450 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                                      title="Delete Trade"
                                    >
                                      <Trash2 size={11} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : (
          /* Transactions Tab (Deposits/Withdrawals) */
          transactions.length === 0 ? (
            <div id="empty-transactions-view" className="text-center py-12 text-slate-500">
              <ArrowDownLeft className="mx-auto mb-2.5 opacity-30" size={32} />
              <p className="text-xs font-semibold">No deposits or withdrawals yet.</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Use the Funding Ledger form on the right to manage your trading capital.</p>
            </div>
          ) : (
            <div id="transactions-log-list" className="space-y-1.5">
              {/* Calculating current balance log running states */}
              {(() => {
                // Calculate running balances in order (earliest to latest)
                const sortedTx = [...transactions].sort((a,b) => {
                  const dateA = a.date + "T" + (a.time || "00:00");
                  const dateB = b.date + "T" + (b.time || "00:00");
                  return dateA.localeCompare(dateB);
                });

                let runningBalance = 0;
                const txWithRunningBalances = sortedTx.map(tx => {
                  if (tx.type === "DEPOSIT") {
                    runningBalance += Number(tx.amount);
                  } else {
                    runningBalance -= Number(tx.amount);
                  }
                  return { ...tx, runningBalance };
                });

                // Reverse back to show most recent transactions at the top
                return txWithRunningBalances.reverse().map((tx) => {
                  const isDeposit = tx.type === "DEPOSIT";
                  return (
                    <div 
                      id={`tx-card-${tx.id}`}
                      key={tx.id} 
                      className="bg-slate-50 dark:bg-slate-950 border border-slate-205 dark:border-slate-800 rounded p-2.5 flex justify-between items-center hover:bg-slate-100/70 dark:hover:bg-slate-900 transition-colors"
                    >
                      <div id="tx-meta-left" className="flex items-center gap-2.5">
                        <div id="tx-indicator-icon" className={`p-1.5 rounded ${isDeposit ? "bg-emerald-100/10 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400" : "bg-amber-100/10 dark:bg-amber-950/30 text-amber-750 dark:text-amber-400"}`}>
                          {isDeposit ? <ArrowDownLeft size={13} /> : <ArrowUpRight size={13} />}
                        </div>
                        <div>
                          <div id="tx-tag-text" className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">{tx.type}</span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono">{tx.date} {tx.time}</span>
                          </div>
                          {tx.notes && <p id="tx-notes" className="text-[10px] text-slate-500 dark:text-slate-405 italic">"{tx.notes}"</p>}
                          <div id="tx-running-balance" className="text-[9px] text-slate-400 dark:text-slate-500 font-mono">
                            Running Balance: ${tx.runningBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                      </div>

                      <div id="tx-meta-right" className="flex items-center gap-2.5">
                        <span className={`font-mono text-xs font-bold ${isDeposit ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>
                          {isDeposit ? "+" : "-"}${tx.amount.toFixed(2)}
                        </span>
                        {confirmDeleteTxId === tx.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 dark:bg-rose-950/25 border border-rose-200 dark:border-rose-900 rounded p-0.5 animate-bounce-short">
                            <span className="text-[9px] text-rose-700 dark:text-rose-400 font-bold px-1 font-sans">Delete?</span>
                            <button
                              id={`btn-confirm-delete-tx-${tx.id}`}
                              onClick={() => {
                                onDeleteTransaction(tx.id);
                                setConfirmDeleteTxId(null);
                              }}
                              className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 rounded font-bold cursor-pointer transition-colors"
                            >
                              Yes
                            </button>
                            <button
                              id={`btn-cancel-delete-tx-${tx.id}`}
                              onClick={() => setConfirmDeleteTxId(null)}
                              className="text-[9px] bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-1.5 py-0.5 rounded font-semibold cursor-pointer transition-colors"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            id={`btn-delete-tx-${tx.id}`}
                            onClick={() => setConfirmDeleteTxId(tx.id)}
                            className="p-1 text-slate-400 dark:text-slate-550 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded transition-all cursor-pointer"
                            title="Delete funding record"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          )
        )}
      </div>
    </div>
  );
}
