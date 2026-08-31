import React, { useState, useMemo } from "react";
import { Trade, Transaction, HourlyStats } from "../types";
import { getTradingSession } from "../utils";
import {
  Calendar as CalendarIcon,
  Clock,
  Award,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  Target,
  Sparkles,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  History,
  CheckCircle2
} from "lucide-react";

interface AnalyticsDashboardViewProps {
  trades: Trade[];
  transactions: Transaction[];
  onGenerateAIInsights?: () => Promise<string>;
  savedAIReport?: string;
}

// Helper to calculate pips for a single trade: 1 $ movement = 10 pips
// BUY: (exitPrice - entryPrice) * 10
// SELL: (entryPrice - exitPrice) * 10
export const calculateTradePips = (t: Trade): number => {
  const ep = Number(t.entryPrice);
  const xp = Number(t.exitPrice);
  if (isNaN(ep) || isNaN(xp) || ep === 0 || xp === 0) {
    return 0;
  }
  const diff = t.type === "SELL" ? (ep - xp) : (xp - ep);
  return Number((diff * 10).toFixed(2));
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

export default function AnalyticsDashboardView({
  trades,
  transactions,
}: AnalyticsDashboardViewProps) {
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => new Date());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>(() => {
    const d = new Date();
    const offset = d.getTimezoneOffset();
    return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0]; // YYYY-MM-DD
  });

  const handlePrevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    const now = new Date();
    setCurrentMonthDate(now);
    const offset = now.getTimezoneOffset();
    setSelectedCalendarDate(new Date(now.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0]);
  };

  const handleSelectMonth = (monthIdx: number) => {
    setCurrentMonthDate(new Date(currentMonthDate.getFullYear(), monthIdx, 1));
    setSelectedCalendarDate("");
  };

  const handleSelectYear = (year: number) => {
    setCurrentMonthDate(new Date(year, currentMonthDate.getMonth(), 1));
    setSelectedCalendarDate("");
  };

  const handleSelectSpecificMonth = (ymStr: string) => {
    const [y, m] = ymStr.split("-").map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      setCurrentMonthDate(new Date(y, m - 1, 1));
      setSelectedCalendarDate("");
    }
  };

  const currentMonthPrefix = `${currentMonthDate.getFullYear()}-${String(currentMonthDate.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthName = currentMonthDate.toLocaleString("en-US", { month: "long", year: "numeric" });

  // Extract all historical months that have trades recorded
  const monthsWithTrades = useMemo(() => {
    const monthMap: Record<string, number> = {};
    trades.forEach(t => {
      if (t.entryDate && t.entryDate.length >= 7) {
        const ym = t.entryDate.substring(0, 7);
        monthMap[ym] = (monthMap[ym] || 0) + 1;
      }
    });
    return Object.entries(monthMap)
      .map(([ym, count]) => ({
        ym,
        count,
        label: new Date(`${ym}-01T00:00:00`).toLocaleString("en-US", { month: "short", year: "numeric" }),
        fullLabel: new Date(`${ym}-01T00:00:00`).toLocaleString("en-US", { month: "long", year: "numeric" })
      }))
      .sort((a, b) => b.ym.localeCompare(a.ym));
  }, [trades]);

  // Available year choices based on trade history
  const availableYears = useMemo(() => {
    const years = new Set<number>([new Date().getFullYear()]);
    trades.forEach(t => {
      if (t.entryDate && t.entryDate.length >= 4) {
        const y = parseInt(t.entryDate.substring(0, 4));
        if (!isNaN(y)) years.add(y);
      }
    });
    return Array.from(years).sort((a, b) => b - a);
  }, [trades]);

  // 1. Group trades by calendar date (entryDate) to calculate daily statistics
  const getDailyTransactions = (dateStr: string) => {
    if (!dateStr) {
      return {
        trades: [],
        tradesCount: 0,
        totalProfit: 0,
        totalLoss: 0,
        netResult: 0,
        winRate: 0,
        totalPipsCaptured: 0,
        totalPipsLost: 0,
        netPipsCaptured: 0
      };
    }

    const dailyTrades = trades.filter(t => t.entryDate === dateStr);
    const wins = dailyTrades.filter(t => Number(t.profitLoss) > 0);
    const losses = dailyTrades.filter(t => Number(t.profitLoss) < 0);
    const totalProfit = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
    const totalLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);
    const netResult = totalProfit - totalLoss;
    const winRate = dailyTrades.length > 0 ? (wins.length / dailyTrades.length) * 100 : 0;

    let totalPipsCaptured = 0;
    let totalPipsLost = 0;

    dailyTrades.forEach(t => {
      const pips = calculateTradePips(t);
      if (pips > 0) {
        totalPipsCaptured += pips;
      } else if (pips < 0) {
        totalPipsLost += Math.abs(pips);
      }
    });

    const netPipsCaptured = totalPipsCaptured - totalPipsLost;

    return {
      trades: dailyTrades,
      tradesCount: dailyTrades.length,
      totalProfit,
      totalLoss,
      netResult,
      winRate,
      totalPipsCaptured,
      totalPipsLost,
      netPipsCaptured
    };
  };

  // Group trades for the entire active viewing month
  const getMonthlyStats = (monthPrefix: string) => {
    const monthlyTrades = trades.filter(t => t.entryDate && t.entryDate.startsWith(monthPrefix));
    const wins = monthlyTrades.filter(t => Number(t.profitLoss) > 0);
    const losses = monthlyTrades.filter(t => Number(t.profitLoss) < 0);
    const totalProfit = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
    const totalLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);
    const netResult = totalProfit - totalLoss;
    const winRate = monthlyTrades.length > 0 ? (wins.length / monthlyTrades.length) * 100 : 0;

    let totalPipsCaptured = 0;
    let totalPipsLost = 0;

    monthlyTrades.forEach(t => {
      const pips = calculateTradePips(t);
      if (pips > 0) {
        totalPipsCaptured += pips;
      } else if (pips < 0) {
        totalPipsLost += Math.abs(pips);
      }
    });

    const netPipsCaptured = totalPipsCaptured - totalPipsLost;

    return {
      trades: monthlyTrades,
      tradesCount: monthlyTrades.length,
      totalProfit,
      totalLoss,
      netResult,
      winRate,
      totalPipsCaptured,
      totalPipsLost,
      netPipsCaptured
    };
  };

  // Generate date list of the current viewing month to show in Trading Calendar
  const getCalendarDays = () => {
    const days = [];
    const year = currentMonthDate.getFullYear();
    const month = currentMonthDate.getMonth(); // 0-11
    
    const getLocalDateString = (d: Date) => {
      const offset = d.getTimezoneOffset();
      return new Date(d.getTime() - (offset * 60 * 1000)).toISOString().split("T")[0];
    };

    // First day of current viewing month
    const firstDay = new Date(year, month, 1);
    const startOffset = firstDay.getDay(); // 0 is Sunday, etc.
    
    // Total days in current viewing month
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
  const monthlyInfo = getMonthlyStats(currentMonthPrefix);

  // When no date is selected OR the selected date has 0 trades:
  // display the whole month's information and pips!
  const isShowingMonthlyStats = !selectedCalendarDate || selectedDayInfo.tradesCount === 0;
  const activeDisplayInfo = isShowingMonthlyStats ? monthlyInfo : selectedDayInfo;

  // 2. TIME-BASED TRADE ANALYSIS (HOURLY)
  // Calculate hourly win/loss stats based on ENTRY TIME hour (0..23)
  const calculateHourlyStats = (): (HourlyStats & { totalPips: number; winsCount: number; lossesCount: number })[] => {
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

      let hourPips = 0;
      hTrades.forEach(t => {
        hourPips += calculateTradePips(t);
      });

      return {
        hour,
        tradesCount: hTrades.length,
        winsCount: wins.length,
        lossesCount: losses.length,
        winRate: Math.round(winRate),
        netResult,
        avgProfit,
        avgLoss,
        totalPips: Number(hourPips.toFixed(1))
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

  // SORT ACTIVE HOURS BY ACCURACY (Win Rate % descending, then Net Result)
  // while keeping the 24-hour timeline at the top in chronological order
  const activeHoursSortedByAccuracy = useMemo(() => {
    return [...hourlyStatsWithTrades].sort((a, b) => {
      if (b.winRate !== a.winRate) {
        return b.winRate - a.winRate; // Primary: Accuracy (win rate %)
      }
      if (b.netResult !== a.netResult) {
        return b.netResult - a.netResult; // Secondary: Net Profit
      }
      return b.tradesCount - a.tradesCount;
    });
  }, [hourlyStatsWithTrades]);

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

  // Helper to handle individual trades' RR safely
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
      profitable: profitableSetups.slice(0, 3),
      unprofitable: unprofitableSetups.slice(0, 3)
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
      
      {/* 1. THE TRADING CALENDAR VIEW WITH PAST MONTHS SELECTOR */}
      <div id="calendar-analytics-card" className="grid grid-cols-1 lg:grid-cols-3 gap-6 bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm text-white">
        
        {/* Left Side: Calendar Month View */}
        <div id="calendar-month-grid-column" className="lg:col-span-2 space-y-3">
          
          {/* Header Row: Title & Month Navigation Controls */}
          <div id="calendar-header" className="flex flex-wrap justify-between items-center gap-2">
            <h3 className="text-sm font-semibold tracking-wide uppercase font-mono flex items-center gap-2">
              <CalendarIcon size={16} className="text-emerald-400" />
              Trading Calendar Summary
            </h3>
            
            {/* Direct Month & Year Dropdown Selectors */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 border border-slate-800 p-1 rounded-lg">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                title="Previous Month"
              >
                <ChevronLeft size={14} />
              </button>

              {/* Month Dropdown */}
              <select
                value={currentMonthDate.getMonth()}
                onChange={(e) => handleSelectMonth(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono px-2 py-0.5 rounded focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {MONTH_NAMES.map((name, idx) => (
                  <option key={idx} value={idx}>{name}</option>
                ))}
              </select>

              {/* Year Dropdown */}
              <select
                value={currentMonthDate.getFullYear()}
                onChange={(e) => handleSelectYear(parseInt(e.target.value))}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono px-2 py-0.5 rounded focus:outline-none focus:border-indigo-500 cursor-pointer"
              >
                {availableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>

              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors"
                title="Next Month"
              >
                <ChevronRight size={14} />
              </button>

              <button
                onClick={handleCurrentMonth}
                className="text-[10px] font-mono text-emerald-400 hover:bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 transition-colors ml-0.5"
                title="Jump to Today's Month"
              >
                Today
              </button>
            </div>
          </div>

          {/* Quick Jump Bar for Past Months With Recorded Trades */}
          {monthsWithTrades.length > 0 && (
            <div id="past-months-quick-bar" className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <span className="text-[10px] font-mono text-slate-500 flex items-center gap-1 whitespace-nowrap">
                <History size={11} className="text-slate-400" /> Past Months:
              </span>
              {monthsWithTrades.map((mItem, idx) => {
                const isActive = currentMonthPrefix === mItem.ym;
                return (
                  <button
                    key={idx}
                    onClick={() => handleSelectSpecificMonth(mItem.ym)}
                    className={`px-2 py-0.5 rounded text-[10px] font-mono whitespace-nowrap transition-all flex items-center gap-1 ${
                      isActive
                        ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold"
                        : "bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850 hover:text-slate-200"
                    }`}
                  >
                    <span>{mItem.label}</span>
                    <span className="text-[9px] opacity-75">({mItem.count}t)</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Weekday Labels */}
          <div id="calendar-week-labels" className="grid grid-cols-7 gap-1 text-center font-mono text-[10px] text-slate-500 font-semibold pt-1">
            <span>SUN</span><span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span>
          </div>

          {/* Days Grid */}
          <div id="calendar-days-month-grid" className="grid grid-cols-7 gap-1.5">
            {calendarDays.map((day, idx) => {
              const dayPnLData = getDailyTransactions(day.dateStr);
              const hasTrades = dayPnLData.tradesCount > 0;
              const isSelected = selectedCalendarDate === day.dateStr;

              let bgColor = "bg-slate-950/40 hover:bg-slate-800 text-slate-500";
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
                  onClick={() => {
                    if (!day.isCurrentMonth) {
                      const [y, m] = day.dateStr.split("-").map(Number);
                      setCurrentMonthDate(new Date(y, m - 1, 1));
                    }
                    setSelectedCalendarDate(day.dateStr);
                  }}
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

        {/* Right Side: Day Details & Daily/Monthly Analytics */}
        <div id="calendar-day-details-column" className="bg-slate-950/60 rounded-xl p-4 border border-slate-800 flex flex-col h-full justify-between">
          <div>
            <div id="selected-day-header" className="border-b border-slate-800/80 pb-2 mb-4 flex justify-between items-start">
              <div>
                <span className="text-[11px] font-mono text-slate-500 tracking-widest block uppercase">
                  {isShowingMonthlyStats ? "Monthly Summary" : "Selected Date Summary"}
                </span>
                <h4 className="text-base font-bold text-slate-200 mt-0.5">
                  {isShowingMonthlyStats ? currentMonthName : selectedCalendarDate}
                </h4>
                {selectedCalendarDate && isShowingMonthlyStats && (
                  <span className="text-[10px] font-mono text-amber-400/90 block mt-0.5">
                    No trades on {selectedCalendarDate} — showing {currentMonthName} summary
                  </span>
                )}
              </div>
              {selectedCalendarDate && !isShowingMonthlyStats && (
                <button
                  onClick={() => setSelectedCalendarDate("")}
                  className="text-[10px] font-mono text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-2 py-1 rounded transition-colors cursor-pointer"
                  title="View Full Month"
                >
                  View Month
                </button>
              )}
            </div>

            {activeDisplayInfo.tradesCount === 0 ? (
              <div id="selected-day-empty-info" className="text-center py-6 text-slate-600">
                <AlertCircle className="mx-auto mb-2 opacity-30" size={28} />
                <p className="text-xs">No trades found for {currentMonthName}.</p>
                <p className="text-[10px] mt-1 text-slate-700">Enter setups in the journal or select another month above.</p>
                
                {/* Even when 0 trades in month, show 0.0 pip breakdown */}
                <div className="mt-4 border-t border-slate-850/80 pt-3 text-left">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">Pip Metrics ({currentMonthName})</span>
                    <span className="text-[9px] font-mono text-slate-500">$1 = 10 pips</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Total Pips Captured</span>
                      <span className="text-sm font-bold font-mono text-slate-400">0.0 pips</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Total Pips Lost</span>
                      <span className="text-sm font-bold font-mono text-slate-400">0.0 pips</span>
                    </div>
                  </div>
                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg mt-2 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Pips Captured</span>
                      <span className="text-base font-mono font-bold text-slate-300">0.0 pips</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
                <div id="selected-day-analytics-list" className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">
                        {isShowingMonthlyStats ? "Month Trades" : "Trades Executed"}
                      </span>
                      <span className="text-base font-bold font-mono">{activeDisplayInfo.tradesCount}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">
                        {isShowingMonthlyStats ? "Month Win Rate" : "Day Win Rate"}
                      </span>
                      <span className="text-base font-bold font-mono text-emerald-400">{Math.round(activeDisplayInfo.winRate)}%</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Profit Sum</span>
                      <span className="text-sm font-bold font-mono text-emerald-500">+{activeDisplayInfo.totalProfit.toFixed(1)}</span>
                    </div>
                    <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                      <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Loss Sum</span>
                      <span className="text-sm font-bold font-mono text-rose-500">-${activeDisplayInfo.totalLoss.toFixed(1)}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono text-slate-500 uppercase block">
                        {isShowingMonthlyStats ? "Net Month Result" : "Net Day Result"}
                      </span>
                      <span className={`text-base font-mono font-bold ${activeDisplayInfo.netResult >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {activeDisplayInfo.netResult >= 0 ? "+" : ""}${activeDisplayInfo.netResult.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Pip Performance Metrics */}
                  <div className="border-t border-slate-850/80 pt-3 space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400">
                        {isShowingMonthlyStats ? `Pip Metrics (${currentMonthName})` : "Pip Metrics"}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">$1 movement = 10 pips</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Total Pips Captured</span>
                        <span className="text-sm font-bold font-mono text-emerald-400">+{activeDisplayInfo.totalPipsCaptured.toFixed(1)} pips</span>
                      </div>
                      <div className="bg-slate-900 border border-slate-850 p-2.5 rounded-lg">
                        <span className="text-[9px] font-mono text-slate-500 uppercase block font-medium">Total Pips Lost</span>
                        <span className="text-sm font-bold font-mono text-rose-400">-{activeDisplayInfo.totalPipsLost.toFixed(1)} pips</span>
                      </div>
                    </div>

                    <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg flex justify-between items-center">
                      <div>
                        <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Pips Captured</span>
                        <span className={`text-base font-mono font-bold ${activeDisplayInfo.netPipsCaptured >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                          {activeDisplayInfo.netPipsCaptured >= 0 ? "+" : ""}{activeDisplayInfo.netPipsCaptured.toFixed(1)} pips
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
            )}
          </div>

          <div id="executed-trades-scroller" className="mt-4 border-t border-slate-800/80 pt-3 max-h-[140px] overflow-y-auto">
            <span className="text-[10px] font-mono text-slate-500 block mb-1">
              {isShowingMonthlyStats ? `Trades in ${currentMonthName}:` : "Trades list:"}
            </span>
            {activeDisplayInfo.trades.length === 0 ? (
              <p className="text-[11px] text-slate-600 italic">No trades logged.</p>
            ) : (
              activeDisplayInfo.trades.map((t, idx) => {
                const tradePips = calculateTradePips(t);
                return (
                  <div key={idx} className="flex justify-between items-center text-xs py-1 border-b border-slate-900 last:border-0">
                    <div className="flex items-center gap-1.5 truncate mr-2">
                      <span className="font-semibold text-slate-200">{t.symbol} ({t.type})</span>
                      {isShowingMonthlyStats && t.entryDate && (
                        <span className="text-[9px] font-mono text-slate-500">[{t.entryDate.substring(5)}]</span>
                      )}
                      <span className={`text-[10px] font-mono ${tradePips >= 0 ? "text-emerald-400/80" : "text-rose-400/80"}`}>
                        ({tradePips >= 0 ? "+" : ""}{tradePips.toFixed(1)} pips)
                      </span>
                    </div>
                    <span className={`font-mono flex-shrink-0 ${Number(t.profitLoss) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                      {Number(t.profitLoss) >= 0 ? "+" : ""}${Number(t.profitLoss).toFixed(1)}
                    </span>
                  </div>
                );
              })
            )}
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

      {/* 3. HOURLY TRADE PERFORMANCE SECTION (SORTED BY ACCURACY) */}
      <div id="hourly-performance-chart-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
          <div>
            <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-300 flex items-center gap-2">
              <Clock size={15} className="text-emerald-400" />
              Trade Performance By Hour (IST +5:30)
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">Execution volume, win rates, pip yield, and PnL breakdown — ranked by accuracy</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono bg-slate-950 border border-slate-800 text-slate-400 px-2.5 py-1 rounded-lg">
              Active Windows: <strong className="text-emerald-400 font-bold">{hourlyStatsWithTrades.length}</strong> / 24
            </span>
          </div>
        </div>

        {trades.length === 0 ? (
          <div id="chart-empty-info" className="py-12 text-center text-slate-600">
            <Clock className="mx-auto mb-2 opacity-30" size={32} />
            <p className="text-xs">No trade history logs found to display hourly breakdown.</p>
            <p className="text-[10px] text-slate-700 mt-1">Log trades with entry times to analyze performance by hour.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 24-Hour Visual Timeline Ribbon (Unchanged Chronological Day Timeline: 00:00 to 23:00) */}
            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-850">
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider font-semibold">24-Hour Day Timeline (00:00 – 23:00 IST)</span>
                <div className="flex items-center gap-3 text-[9px] font-mono text-slate-500">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Profitable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-rose-500"></span> Unprofitable</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-800"></span> Inactive</span>
                </div>
              </div>
              
              <div className="grid grid-cols-12 sm:grid-cols-24 gap-1">
                {hourlyStats.map((stat, idx) => {
                  const hasTrades = stat.tradesCount > 0;
                  let bgCol = "bg-slate-900 hover:bg-slate-850 text-slate-500 border border-transparent";
                  if (hasTrades) {
                    bgCol = stat.netResult >= 0 
                      ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30" 
                      : "bg-rose-500/20 hover:bg-rose-500/30 text-rose-400 border border-rose-500/30";
                  }
                  return (
                    <div
                      key={idx}
                      title={`${String(stat.hour).padStart(2, "0")}:00 IST – ${stat.tradesCount} trade(s) (${stat.winRate}% win rate), Net: $${stat.netResult.toFixed(1)}, Pips: ${stat.totalPips}`}
                      className={`h-9 rounded flex flex-col items-center justify-center text-[9px] font-mono font-bold transition-all cursor-default ${bgCol}`}
                    >
                      <span>{String(stat.hour).padStart(2, "0")}</span>
                      {hasTrades && (
                        <span className="text-[8px] opacity-90 leading-none">
                          {stat.tradesCount}t
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Grid of Active Hour Cards — SORTED BY ACCURACY (Win Rate % Descending) */}
            <div>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 size={13} className="text-emerald-400" />
                  Hourly Performance Ranked by Accuracy
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Highest Win Rate first
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {activeHoursSortedByAccuracy.map((stat, idx) => {
                  const sessionName = getTradingSession(`${String(stat.hour).padStart(2, "0")}:00`);
                  const isProfitable = stat.netResult >= 0;

                  return (
                    <div
                      id={`hour-card-accuracy-${stat.hour}`}
                      key={idx}
                      className="bg-slate-950 border border-slate-800 hover:border-slate-700/80 rounded-xl p-3.5 flex flex-col justify-between transition-all relative overflow-hidden"
                    >
                      <div>
                        {/* Top Row: Rank Tag & Accuracy Win Rate */}
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="text-[9px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-1.5 py-0.2 rounded font-bold">
                                #{idx + 1}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-200">
                                {String(stat.hour).padStart(2, "0")}:00 – {String((stat.hour + 1) % 24).padStart(2, "0")}:00 <span className="text-[10px] text-slate-500">IST</span>
                              </span>
                            </div>
                            <span className="text-[9px] font-mono text-indigo-400/90 block mt-0.5">
                              {sessionName}
                            </span>
                          </div>

                          <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                            stat.winRate >= 50 ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}>
                            {stat.winRate}% WR
                          </span>
                        </div>

                        {/* Trades Count & Win/Loss Breakdown */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                          <span>{stat.tradesCount} {stat.tradesCount === 1 ? "trade" : "trades"}</span>
                          <span className="font-mono text-[10px] text-slate-300">
                            <strong className="text-emerald-400">{stat.winsCount}W</strong> / <strong className="text-rose-400">{stat.lossesCount}L</strong>
                          </span>
                        </div>

                        {/* Visual Win Rate Progress Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden flex mb-3">
                          <div
                            className="bg-emerald-500 h-full transition-all"
                            style={{ width: `${stat.winRate}%` }}
                          />
                          <div
                            className="bg-rose-500 h-full transition-all"
                            style={{ width: `${100 - stat.winRate}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Result Row: PnL and Pips */}
                      <div className="border-t border-slate-900 pt-2.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Net PnL</span>
                          <span className={`font-mono font-bold ${isProfitable ? "text-emerald-400" : "text-rose-400"}`}>
                            {isProfitable ? "+" : ""}${stat.netResult.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Pips</span>
                          <span className={`font-mono font-bold ${stat.totalPips >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {stat.totalPips >= 0 ? "+" : ""}{stat.totalPips.toFixed(1)} pips
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
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

            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
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

    </div>
  );
}
