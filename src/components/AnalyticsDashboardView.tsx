import React, { useState } from "react";
import { Trade, Transaction, HourlyStats } from "../types";
import { getTradingSession } from "../utils";
import { Calendar as CalendarIcon, Clock, Award, ShieldAlert, Zap, TrendingUp, TrendingDown, Target, BrainCircuit, Loader2, Sparkles, AlertCircle } from "lucide-react";

interface AnalyticsDashboardViewProps {
  trades: Trade[];
  transactions: Transaction[];
  onGenerateAIInsights: () => Promise<string>;
  savedAIReport: string;
}

export default function AnalyticsDashboardView({
  trades,
  transactions,
  onGenerateAIInsights,
  savedAIReport
}: AnalyticsDashboardViewProps) {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const [aiLoading, setAiLoading] = useState(false);
  const [aiReport, setAiReport] = useState(savedAIReport);
  const [aiError, setAiError] = useState("");

  const handleRunAICoach = async () => {
    setAiLoading(true);
    setAiError("");
    try {
      const report = await onGenerateAIInsights();
      setAiReport(report);
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Could not generate AI report. Please check your Gemini API configuration.");
    } finally {
      setAiLoading(false);
    }
  };

  // 1. Group trades by calendar date (entryDate) to calculate daily statistics
  const getDailyTransactions = (dateStr: string) => {
    const dailyTrades = trades.filter(t => t.entryDate === dateStr);
    const wins = dailyTrades.filter(t => Number(t.profitLoss) > 0);
    const losses = dailyTrades.filter(t => Number(t.profitLoss) < 0);
    const totalProfit = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
    const totalLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);
    const netResult = totalProfit - totalLoss;
    const winRate = dailyTrades.length > 0 ? (wins.length / dailyTrades.length) * 100 : 0;

    return {
      trades: dailyTrades,
      tradesCount: dailyTrades.length,
      totalProfit,
      totalLoss,
      netResult,
      winRate
    };
  };

  // Generate date list of the current month to show in Trading Calendar
  const getCalendarDays = () => {
    const days = [];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11
    
    const getLocalDateString = (d: Date) => {
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
    };

    // First day of current month
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sunday, etc.
    
    // Total days in current month
    const totalDays = new Date(year, month + 1, 0).getDate();

    // Pad previous month offset days
    for (let i = startOffset; i > 0; i--) {
      const prevDate = new Date(year, month, 1 - i);
      days.push({
        dateStr: getLocalDateString(prevDate),
        dayNumber: prevDate.getDate(),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const curDate = new Date(year, month, i);
      days.push({
        dateStr: getLocalDateString(curDate),
        dayNumber: i,
        isCurrentMonth: true
      });
    }

    return days;
  };

  const calendarDays = getCalendarDays();
  const selectedDayInfo = getDailyTransactions(selectedCalendarDate);

  // 2. TIME-BASED TRADE ANALYSIS (HOURLY)
  // Calculate hourly win/loss stats based on ENTRY TIME hour (0..23)
  const calculateHourlyStats = (): HourlyStats[] => {
    const hours: Record<number, { trades: Trade[] }> = {};
    for (let h = 0; h < 24; h++) {
      hours[h] = { trades: [] };
    }

    trades.forEach(t => {
      if (t.entryTime) {
        const hour = parseInt(t.entryTime.split(":")[0]);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hours[hour].trades.push(t);
        }
      }
    });

    return Object.keys(hours).map(hStr => {
      const hour = parseInt(hStr);
      const hTrades = hours[hour].trades;
      const wins = hTrades.filter(t => Number(t.profitLoss) > 0);
      const losses = hTrades.filter(t => Number(t.profitLoss) < 0);
      const winRate = hTrades.length > 0 ? (wins.length / hTrades.length) * 100 : 0;
      
      const totalProfit = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
      const totalLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);
      const netResult = totalProfit - totalLoss;

      const avgProfit = wins.length > 0 ? totalProfit / wins.length : 0;
      const avgLoss = losses.length > 0 ? totalLoss / losses.length : 0;

      return {
        hour,
        tradesCount: hTrades.length,
        winsCount: wins.length,
        lossesCount: losses.length,
        winRate: Math.round(winRate),
        netResult,
        avgProfit,
        avgLoss
      };
    });
  };

  const hourlyStats = calculateHourlyStats();

  // Find Best and Worst Trading Hour
  const hourlyStatsWithTrades = hourlyStats.filter(h => h.tradesCount > 0);
  
  const bestHourObj = hourlyStatsWithTrades.length > 0 
    ? [...hourlyStatsWithTrades].sort((a,b) => b.netResult - a.netResult)[0] 
    : null;

  const worstHourObj = hourlyStatsWithTrades.length > 0 
    ? [...hourlyStatsWithTrades].sort((a,b) => a.netResult - b.netResult)[0] 
    : null;

  // 3. SESSION-BASED ANALYSIS
  // Group trades into market sessions based on ENTRY TIME
  const getSessionStats = () => {
    const sessions = {
      Asian: { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, riskRewards: [] as number[] },
      London: { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, riskRewards: [] as number[] },
      NewYork: { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, riskRewards: [] as number[] },
      Overlap: { count: 0, wins: 0, totalProfit: 0, totalLoss: 0, riskRewards: [] as number[] }
    };

    trades.forEach(t => {
      const session = getTradingSession(t.entryTime);
      const pnl = Number(t.profitLoss) || 0;
      const rr = Number(tradeRiskReward(t)) || 0;

      const increment = (s: typeof sessions.Asian) => {
        s.count++;
        if (pnl > 0) {
          s.wins++;
          s.totalProfit += pnl;
        } else if (pnl < 0) {
          s.totalLoss += Math.abs(pnl);
        }
        if (rr > 0) s.riskRewards.push(rr);
      };

      if (session === "Asian") increment(sessions.Asian);
      if (session === "London") increment(sessions.London);
      if (session === "New York") increment(sessions.NewYork);
      if (session === "London-NY Overlap") increment(sessions.Overlap);
    });

    const formatObj = (s: typeof sessions.Asian) => {
      const winRate = s.count > 0 ? (s.wins / s.count) * 100 : 0;
      const netResult = s.totalProfit - s.totalLoss;
      const avgRR = s.riskRewards.length > 0 
        ? s.riskRewards.reduce((sum, val) => sum + val, 0) / s.riskRewards.length 
        : 1.5; // Default reference

      return {
        count: s.count,
        winRate: Math.round(winRate),
        totalProfit: s.totalProfit,
        totalLoss: s.totalLoss,
        netResult,
        avgRiskReward: Number(avgRR.toFixed(1))
      };
    };

    return {
      Asian: formatObj(sessions.Asian),
      London: formatObj(sessions.London),
      NewYork: formatObj(sessions.NewYork),
      Overlap: formatObj(sessions.Overlap)
    };
  };

  const sessionStats = getSessionStats();

  // Helper helper to handle individual trades' RR safely
  function tradeRiskReward(t: Trade): number {
    if (t.riskRewardRatio) return t.riskRewardRatio;
    if (t.entryPrice && t.stopLoss && t.takeProfit) {
      const risk = Math.abs(t.entryPrice - t.stopLoss);
      const reward = Math.abs(t.takeProfit - t.entryPrice);
      return risk > 0 ? reward / risk : 1.5;
    }
    return 1.5;
  }

  // 4. SETUP TIME PATTERN ANALYSIS
  // Group setups by hours to evaluate identified opportunity quality
  const getSetupTimeAnalytics = () => {
    const hourlySetups: Record<number, { count: 0, wins: 0 }> = {};
    for (let h = 0; h < 24; h++) {
      hourlySetups[h] = { count: 0, wins: 0 };
    }

    trades.forEach(t => {
      if (t.setupTime) {
        const hour = parseInt(t.setupTime.split(":")[0]);
        if (!isNaN(hour) && hour >= 0 && hour < 24) {
          hourlySetups[hour].count++;
          if (Number(t.profitLoss) > 0) {
            hourlySetups[hour].wins++;
          }
        }
      }
    });

    // Format and sort to find highest/lowest win-rate clusters
    const formatted = Object.entries(hourlySetups)
      .map(([hStr, data]) => {
        const hour = parseInt(hStr);
        const winRate = data.count > 0 ? (data.wins / data.count) * 100 : 0;
        return {
          hour,
          count: data.count,
          winRate: Math.round(winRate)
        };
      })
      .filter(item => item.count > 0);

    const profitableSetups = [...formatted].sort((a,b) => b.winRate - a.winRate);
    const unprofitableSetups = [...formatted].sort((a,b) => a.winRate - b.winRate);

    return {
      profitable: profitableSetups.slice(0, 3), // Top 3
      unprofitable: unprofitableSetups.slice(0, 3) // Bottom 3
    };
  };

  const setupTimePatterns = getSetupTimeAnalytics();

  // Best Session Identification
  const getBestSession = () => {
    const arr = [
      { name: "Asian", net: sessionStats.Asian.netResult, rate: sessionStats.Asian.winRate, count: sessionStats.Asian.count },
      { name: "London", net: sessionStats.London.netResult, rate: sessionStats.London.winRate, count: sessionStats.London.count },
      { name: "New York", net: sessionStats.NewYork.netResult, rate: sessionStats.NewYork.winRate, count: sessionStats.NewYork.count },
      { name: "London-NY Overlap", net: sessionStats.Overlap.netResult, rate: sessionStats.Overlap.winRate, count: sessionStats.Overlap.count }
    ].filter(s => s.count > 0);

    if (arr.length === 0) return { name: "N/A", rate: 0, profit: 0 };
    const sorted = [...arr].sort((a,b) => b.net - a.net);
    return {
      name: sorted[0].name,
      rate: sorted[0].rate,
      profit: sorted[0].net
    };
  };

  const bestSession = getBestSession();

  // Worst Session Identification
  const getWorstSession = () => {
    const arr = [
      { name: "Asian", net: sessionStats.Asian.netResult, rate: sessionStats.Asian.winRate, count: sessionStats.Asian.count },
      { name: "London", net: sessionStats.London.netResult, rate: sessionStats.London.winRate, count: sessionStats.London.count },
      { name: "New York", net: sessionStats.NewYork.netResult, rate: sessionStats.NewYork.winRate, count: sessionStats.NewYork.count },
      { name: "London-NY Overlap", net: sessionStats.Overlap.netResult, rate: sessionStats.Overlap.winRate, count: sessionStats.Overlap.count }
    ].filter(s => s.count > 0);

    if (arr.length === 0) return { name: "N/A", rate: 0, loss: 0 };
    const sorted = [...arr].sort((a,b) => a.net - b.net);
    return {
      name: sorted[0].name,
      rate: sorted[0].rate,
      loss: sorted[0].net
    };
  };

  const worstSession = getWorstSession();

  // Overall statistics
  const overallTotalTrades = trades.length;
  const overallWins = trades.filter(t => Number(t.profitLoss) > 0).length;
  const overallLosses = trades.filter(t => Number(t.profitLoss) < 0).length;
  const overallWinRate = overallTotalTrades > 0 ? (overallWins / overallTotalTrades) * 100 : 0;

  return (
    <div id="analytics-grid-workspace" className="space-y-6">

      {/* 0. OVERALL PERFORMANCE METRICS */}
      <div id="overall-performance-metrics" className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Total Trades</span>
          <span className="text-2xl font-bold font-mono text-white">{overallTotalTrades}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Overall Win Rate</span>
          <span className="text-2xl font-bold font-mono text-emerald-400">{Math.round(overallWinRate)}%</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Winning Trades</span>
          <span className="text-2xl font-bold font-mono text-emerald-500">{overallWins}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col justify-center items-center text-center">
          <span className="text-[10px] font-mono text-slate-500 uppercase block mb-1">Losing Trades</span>
          <span className="text-2xl font-bold font-mono text-rose-500">{overallLosses}</span>
        </div>
      </div>
      
      {/* 1. THE TRADING CALENDAR VIEW */}
      <div id="calendar-analytics-card" className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-white">
        
        {/* Left Side: Calendar Month View */}
        <div id="calendar-month-grid-column" className="lg:col-span-2">
          <div id="calendar-header" className="flex justify-between items-center mb-4">
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono flex items-center gap-2">
              <CalendarIcon size={16} className="text-emerald-400" />
              Trading Calendar Summary
            </h3>
            <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
              {new Date().toLocaleString("en-US", { month: "long", year: "numeric" })}
            </span>
          </div>

          <div id="calendar-week-labels" className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-slate-500 font-semibold mb-2">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          <div id="calendar-days-month-grid" className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const dayPnLData = getDailyTransactions(day.dateStr);
              const hasTrades = dayPnLData.tradesCount > 0;
              const isSelected = selectedCalendarDate === day.dateStr;

              let bgColor = "bg-slate-950/40 hover:bg-slate-800 text-slate-400";
              let borderColor = "border-transparent";

              if (day.isCurrentMonth) {
                bgColor = "bg-slate-950 hover:bg-slate-850 text-slate-200";
              }

              if (hasTrades) {
                if (dayPnLData.netResult > 0) {
                  bgColor = "bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400";
                } else if (dayPnLData.netResult < 0) {
                  bgColor = "bg-rose-500/10 hover:bg-rose-500/20 text-rose-400";
                } else {
                  bgColor = "bg-slate-800 hover:bg-slate-750 text-slate-300";
                }
              }

              if (isSelected) {
                borderColor = "border-emerald-400 ring-1 ring-emerald-500/50";
              }

              return (
                <button
                  id={`btn-calendar-day-${day.dateStr}`}
                  key={idx}
                  onClick={() => setSelectedCalendarDate(day.dateStr)}
                  className={`aspect-square rounded-lg p-1.5 flex flex-col justify-between border ${borderColor} text-left transition-all ${bgColor}`}
                >
                  <span className="text-[10px] font-mono font-bold leading-none">{day.dayNumber}</span>
                  {hasTrades && (
                    <span className="text-[9px] font-mono font-bold leading-none truncate max-w-full text-right mt-1" title={`Net: $${dayPnLData.netResult}`}>
                      {dayPnLData.netResult > 0 ? "+" : ""}{Math.round(dayPnLData.netResult)}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Side: Day Details & Daily Analytics */}
        <div id="calendar-day-details-column" className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col h-full justify-between">
          <div>
            <div id="selected-day-header" className="border-b border-slate-800/80 pb-2 mb-4">
              <span className="text-[11px] font-mono text-slate-500 tracking-widest block uppercase">Selected Date Summary</span>
              <h4 className="text-base font-bold text-slate-250 mt-0.5">{selectedCalendarDate}</h4>
            </div>

            {selectedDayInfo.tradesCount === 0 ? (
              <div id="selected-day-empty-info" className="text-center py-10 text-slate-600">
                <AlertCircle className="mx-auto mb-2 opacity-30" size={28} />
                <p className="text-xs">No setups entered for this date.</p>
                <p className="text-[10px] mt-1 text-slate-700">Click on other highlights or days with setups.</p>
              </div>
            ) : (
                <div id="selected-day-analytics-list" className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Trades Executed</span>
                      <span className="text-base font-bold font-mono">{selectedDayInfo.tradesCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Day Win Rate</span>
                      <span className="text-base font-bold font-mono text-emerald-400">{Math.round(selectedDayInfo.winRate)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Profit Sum</span>
                      <span className="text-sm font-bold font-mono text-emerald-500">+${selectedDayInfo.totalProfit.toFixed(1)}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Loss Sum</span>
                      <span className="text-sm font-bold font-mono text-rose-500">-${selectedDayInfo.totalLoss.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Day Result</span>
                      <span className={`text-base font-mono font-bold ${selectedDayInfo.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {selectedDayInfo.netResult >= 0 ? "+" : ""}${selectedDayInfo.netResult.toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
            )}
          </div>

          <div id="executed-trades-scroller" className="mt-4 border-t border-slate-800/80 pt-3 max-h-[140px] overflow-y-auto">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">Trades list:</span>
            {selectedDayInfo.trades.map((t, idx) => (
              <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-900 last:border-0">
                <span className="font-semibold text-slate-200">{t.symbol} ({t.type})</span>
                <span className={`font-mono ${Number(t.profitLoss) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {Number(t.profitLoss) >= 0 ? "+" : ""}${Number(t.profitLoss).toFixed(1)}
                </span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* 2. BEST / WORST TIMING CARDS */}
      <div id="best-worst-timing-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Best Performance Card */}
        <div id="card-best-hour" className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-start gap-4 text-white">
          <div id="badge-best" className="bg-emerald-500/10 p-3 rounded-xl text-emerald-400">
            <Award size={24} />
          </div>
          <div>
            <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Best Session & Time Analysis</h4>
            {bestHourObj ? (
              <div id="best-metrics" className="mt-2 space-y-1">
                <p className="text-2xl font-bold tracking-tight text-white focus:outline-none">
                  {bestHourObj.hour}:00 – {bestHourObj.hour + 1}:00 IST +5:30
                </p>
                <div id="best-stats-pills" className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                  <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-lg">Win Rate: {bestHourObj.winRate}%</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">Total Net: +${bestHourObj.netResult.toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  💫 Best performing trading session is: <strong>{bestSession.name}</strong> (+${bestSession.profit.toFixed(2)})
                </p>
              </div>
            ) : (
                <p className="text-xs text-slate-500 mt-2">Create some journal trades to evaluate your golden trading hours.</p>
            )}
          </div>
        </div>

        {/* Worst Performance Card */}
        <div id="card-worst-hour" className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-start gap-4 text-white">
          <div id="badge-worst" className="bg-rose-500/10 p-3 rounded-xl text-rose-500">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h4 className="text-xs font-mono text-slate-500 uppercase tracking-widest">Worst Performance Pitfalls</h4>
            {worstHourObj ? (
              <div id="worst-metrics" className="mt-2 space-y-1">
                <p className="text-2xl font-bold tracking-tight text-white">
                  {worstHourObj.hour}:00 – {worstHourObj.hour + 1}:00 IST +5:30
                </p>
                <div id="worst-stats-pills" className="flex flex-wrap items-center gap-2 text-xs text-slate-300 pt-1">
                  <span className="bg-rose-500/10 text-rose-400 px-2 py-0.5 rounded-lg">Loss Rate: {100 - worstHourObj.winRate}%</span>
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded-lg">Total Net: -${Math.abs(worstHourObj.netResult).toFixed(2)}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  ⚠️ Worst performing trading session is: <strong>{worstSession.name}</strong> (${worstSession.loss.toFixed(2)})
                </p>
              </div>
            ) : (
                <p className="text-xs text-slate-500 mt-2">Journal trades will reveal your performance pitfalls.</p>
            )}
          </div>
        </div>
      </div>

      {/* 3. HOURLY TRADE PERFORMANCE CHART BAR HEATMAP */}
      <div id="hourly-performance-chart-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Clock size={14} className="text-emerald-400" />
          Trade Performance By Hour (IST +5:30)
        </h4>

        {trades.length === 0 ? (
          <div id="chart-empty-info" className="py-12 text-center text-slate-600">
            <p className="text-xs">No trade history logs found to display hourly breakdown.</p>
          </div>
        ) : (
          <div id="hourly-chart-bars" className="space-y-2">
            {hourlyStats.map((stat, idx) => {
              // Only display some statistics for scannability, let's filter to hours with trades or render a nice timeline
              if (stat.tradesCount === 0) return null;
              
              const pctOfMax = 100; // default length
              const barColor = stat.netResult >= 0 ? "bg-emerald-500" : "bg-rose-500";

              return (
                <div id={`hour-row-${stat.hour}`} key={idx} className="flex items-center gap-3 text-xs">
                  <span className="w-16 font-mono text-slate-400 text-right">{String(stat.hour).padStart(2, "0")}:00 IST+5:30</span>
                  
                  {/* Visual Bar representation */}
                  <div className="flex-1 bg-slate-950 rounded-full h-4 overflow-hidden relative border border-slate-850 flex items-center">
                    <div 
                      className={`h-full ${barColor} opacity-20`}
                      style={{ width: `${Math.min(100, Math.max(15, stat.winRate))}%` }}
                    />
                    <div className="absolute left-2 text-[10px] font-mono text-slate-300 font-bold">
                      {stat.tradesCount} {stat.tradesCount === 1 ? "trade" : "trades"} • Win Rate: {stat.winRate}%
                    </div>
                  </div>

                  <span className={`w-24 text-right font-mono font-bold ${stat.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {stat.netResult >= 0 ? "+" : ""}${stat.netResult.toFixed(2)}
                  </span>
                </div>
              );
            })}
            <p className="text-[10px] text-slate-500 font-mono text-center pt-2">Rows only generated for active execution hours.</p>
          </div>
        )}
      </div>

      {/* 4. SESSIONS STATISTICS BAR METERS */}
      <div id="sessions-breakdown-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Target size={14} className="text-emerald-400" />
          Market Sessions Statistics
        </h4>

        <div id="sessions-cards-grid" className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            { tag: "Asian", range: "05:30 – 14:30 IST +5:30", data: sessionStats.Asian, color: "border-blue-500/25 text-blue-400" },
            { tag: "London", range: "13:30 – 21:30 IST +5:30", data: sessionStats.London, color: "border-emerald-500/25 text-emerald-400" },
            { tag: "New York", range: "18:30 – 02:30 IST +5:30", data: sessionStats.NewYork, color: "border-amber-500/25 text-amber-400" },
            { tag: "LDN-NY Overlap", range: "18:30 – 21:30 IST +5:30", data: sessionStats.Overlap, color: "border-purple-500/25 text-purple-405" }
          ].map((sess, idx) => (
            <div id={`session-cell-${sess.tag}`} key={idx} className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-100 text-sm">{sess.tag} Session</span>
                  <span className="text-[9px] text-slate-500 font-mono mt-0.5">{sess.range}</span>
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-400">Trades:</span>
                  <span className="text-xs font-semibold font-mono text-slate-100">{sess.data.count}</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">Win Rate:</span>
                  <span className="text-xs font-semibold font-mono text-emerald-400">{sess.data.winRate}%</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-400">Avg Risk-Reward:</span>
                  <span className="text-xs font-semibold font-mono text-slate-300">{sess.data.avgRiskReward}:1</span>
                </div>
              </div>

              <div id="sessions-balance-results" className="mt-4 pt-2 border-t border-slate-800/80">
                <span className="text-[10px] text-slate-500 font-mono block">Net Result</span>
                <span className={`text-sm font-bold font-mono ${sess.data.netResult >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                  {sess.data.netResult >= 0 ? "+" : ""}${sess.data.netResult.toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. SETUP TIME PATTERN ANALYSIS */}
      <div id="setup-time-pattern-analysis" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 mb-4 flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-400" />
          Setup Discovery Time Pattern Analysis
        </h4>

        {trades.length === 0 ? (
          <p className="text-xs text-slate-500 py-4 text-center">Setup timing records must be entered to evaluate identified patterns.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-3">
                <TrendingUp size={14} /> Only Profitable Setup Hours
              </span>
              <div className="space-y-3">
                {setupTimePatterns.profitable.map((pattern, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-mono font-semibold">{pattern.hour}:00 Setup Hour</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">{pattern.count} opportunities</span>
                      <span className="bg-emerald-500/10 text-emerald-400 font-mono px-2 py-0.5 rounded font-bold">{pattern.winRate}% Win-Rate</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-850">
              <span className="text-xs font-semibold text-rose-400 flex items-center gap-1.5 mb-3">
                <TrendingDown size={14} /> High-Risk Unprofitable Setup Hours
              </span>
              <div className="space-y-3">
                {setupTimePatterns.unprofitable.map((pattern, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-slate-300 font-mono font-semibold">{pattern.hour}:00 Setup Hour</span>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">{pattern.count} opportunities</span>
                      <span className="bg-rose-500/10 text-rose-400 font-mono px-2 py-0.5 rounded font-bold">{pattern.winRate}% Win-Rate</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 6. AI PERFORMANCE GRADINGS & REPORTS SECTION */}
      <div id="ai-performance-coach-section" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono flex items-center gap-2">
              <BrainCircuit size={16} className="text-emerald-400" />
              Elite AI Performance & Habit Coach
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Evaluate setup quality, entry timing, and psychological emotional bias tendencies.</p>
          </div>
          <button
            id="btn-run-ai-coach"
            onClick={handleRunAICoach}
            disabled={aiLoading || trades.length === 0}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all self-stretch sm:self-auto disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer pointer-events-auto"
          >
            {aiLoading ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Coaching Diagnostics Running...
              </>
            ) : (
                <>
                  <Sparkles size={14} />
                  Run AI Coach Audit
                </>
            )}
          </button>
        </div>

        {aiError && (
          <div id="ai-error-banner" className="bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-lg p-3 text-xs mb-3 flex items-start gap-2">
            <ShieldAlert size={16} className="flex-shrink-0 mt-0.5" />
            <span>{aiError}</span>
          </div>
        )}

        <div id="ai-report-box" className="bg-slate-950 rounded-xl p-5 border border-slate-850">
          {aiReport ? (
            <div id="ai-report-markdown-content" className="prose prose-invert prose-xs max-w-none text-slate-300 space-y-4">
              {aiReport.split("\n").map((line, idx) => {
                // Inline rendering support for headers, bullet points, and clean lists
                if (line.startsWith("###")) {
                  return <h5 key={idx} className="text-slate-100 font-bold border-b border-slate-850 pb-1 mt-4 text-xs font-mono uppercase">{line.replace("###", "").trim()}</h5>;
                }
                if (line.startsWith("##")) {
                  return <h4 key={idx} className="text-emerald-400 font-bold border-b border-slate-800 pb-1.5 mt-4 text-sm uppercase">{line.replace("##", "").trim()}</h4>;
                }
                if (line.startsWith("#")) {
                  return <h3 key={idx} className="text-emerald-400 font-bold text-base tracking-wider uppercase">{line.replace("#", "").trim()}</h3>;
                }
                if (line.startsWith("-") || line.startsWith("*")) {
                  // Format with highlights
                  const txt = line.replace(/^[-*]\s*/, "").trim();
                  return (
                    <li key={idx} className="list-disc ml-4 text-xs font-sans text-slate-300">
                      {txt.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-white font-semibold">{tok}</strong> : tok)}
                    </li>
                  );
                }
                // Paragraph text
                return (
                  <p key={idx} className="text-xs text-slate-300 leading-relaxed font-sans">
                    {line.split("**").map((tok, tIdx) => tIdx % 2 === 1 ? <strong key={tIdx} className="text-slate-100">{tok}</strong> : tok)}
                  </p>
                );
              })}
            </div>
          ) : (
            <div id="ai-coach-placeholder" className="text-center py-12 text-slate-500">
              <Sparkles className="mx-auto mb-3 text-slate-650 opacity-40 animate-pulse" size={32} />
              <p className="text-xs">No audit report run yet.</p>
              <p className="text-[11px] text-slate-600 mt-1">Click "Run AI Coach Audit" above to analyze revenge trades, patterns, and timing habits.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
