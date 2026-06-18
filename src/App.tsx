import React, { useState, useEffect } from "react";
import { Trade, Transaction, UserState } from "./types";
import { getSampleState } from "./utils";
import DashboardSummary from "./components/DashboardSummary";
import TradeHistoryList from "./components/TradeHistoryList";
import TradeEntryForm from "./components/TradeEntryForm";
import AnalyticsDashboardView from "./components/AnalyticsDashboardView";
import BacktestingReplayView from "./components/BacktestingReplayView";
import CommunityHub from "./components/CommunityHub";
import AdminView from "./components/AdminView";
import DocumentationView from "./components/DocumentationView";
import MistakeTrackerView from "./components/MistakeTrackerView";
import RuleComplianceView from "./components/RuleComplianceView";
import CoachDashboardView from "./components/CoachDashboardView";
import AccountabilityGroupsView from "./components/AccountabilityGroupsView";
import { 
  BookOpen, 
  BarChart2, 
  HelpCircle, 
  ShieldAlert, 
  MessageSquare, 
  Lock, 
  LogOut, 
  UserPlus, 
  Play, 
  Sparkles, 
  Clock, 
  User, 
  Trophy,
  Loader2, 
  Eye,
  X,
  Sun,
  Moon,
  Brain,
  CheckSquare,
  Users
} from "lucide-react";

export default function App() {
  const [activeTab, setActiveTab] = useState<"journal" | "analytics" | "backtest" | "community" | "admin" | "security" | "mistakes" | "compliance" | "coach" | "alliance">("journal");

  // --- Auth States ---
  const [userEmail, setUserEmail] = useState<string | null>(() => localStorage.getItem("mm_user_email"));
  const [userDisplayName, setUserDisplayName] = useState<string | null>(() => localStorage.getItem("mm_user_name"));
  const [userRole, setUserRole] = useState<string | null>(() => localStorage.getItem("mm_user_role"));
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  
  // Auth Form Input States
  const [inputEmail, setInputEmail] = useState("");
  const [inputPassword, setInputPassword] = useState("");
  const [inputDisplayName, setInputDisplayName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // --- Core States ---
  const [trades, setTrades] = useState<Trade[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [confirmWipe, setConfirmWipe] = useState(false);
  
  // Cache for AI coaching text reports
  const [savedAIReport, setSavedAIReport] = useState<string>(() => {
    return localStorage.getItem("mm_cached_ai_report") || "";
  });

  // --- Theme State (Light & Dark Mode Support) ---
  const [theme, setTheme] = useState<"light" | "dark" | "">(() => {
    return (localStorage.getItem("mm_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    if (!theme) return;
    localStorage.setItem("mm_theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  // Current IST +5:30 Clock ticking
  const [istTimeStr, setIstTimeStr] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Calculate IST (constant UTC+5:30) offset clock from UTC time
      const ist = new Date(now.getTime() + 19800000); // UTC+5:30 = +5.5 hours = +19800000 ms
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][ist.getUTCDay()];
      const monthName = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][ist.getUTCMonth()];
      const day = String(ist.getUTCDate()).padStart(2, "0");
      const year = ist.getUTCFullYear();
      const hrsStr = String(ist.getUTCHours()).padStart(2, "0");
      const minsStr = String(ist.getUTCMinutes()).padStart(2, "0");
      const secsStr = String(ist.getUTCSeconds()).padStart(2, "0");
      
      setIstTimeStr(`${dayName}, ${day} ${monthName} ${year} ${hrsStr}:${minsStr}:${secsStr} (IST +5:30)`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Fetch or Load state depending on credentials
  const fetchStatePayload = async (email: string) => {
    let fetchedTrades: Trade[] = [];
    let fetchedTransactions: Transaction[] = [];
    let hasLoaded = false;

    try {
      const res = await fetch("/api/state", {
        headers: {
          "Authorization": `Bearer ${email}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.trades && data.transactions) {
          fetchedTrades = data.trades;
          fetchedTransactions = data.transactions;
          hasLoaded = true;
        }
      }
    } catch (err) {
      console.error("Could not fetch state backend logs. Falling back to local cache.", err);
    }

    if (!hasLoaded) {
      const localTrades = localStorage.getItem(`mm_trades_${email}`);
      const localTx = localStorage.getItem(`mm_tx_${email}`);
      if (localTrades || localTx) {
        fetchedTrades = localTrades ? JSON.parse(localTrades) : [];
        fetchedTransactions = localTx ? JSON.parse(localTx) : [];
      } else {
        const sample = getSampleState();
        fetchedTrades = sample.trades;
        fetchedTransactions = sample.transactions;
      }
    }

    // Filter out old pre-populated mock trade IDs to ensure clean slate
    const mockIds = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
    const mockTxIds = ["tr1", "tr2", "tr4"];

    const finalTrades = fetchedTrades.filter(t => !mockIds.includes(t.id));
    const finalTx = fetchedTransactions.filter(tr => !mockTxIds.includes(tr.id));

    setTrades(finalTrades);
    setTransactions(finalTx);

    // Persist empty slate back to cache if mock IDs were found
    if (fetchedTrades.length !== finalTrades.length || fetchedTransactions.length !== finalTx.length) {
      localStorage.setItem(`mm_trades_${email}`, JSON.stringify(finalTrades));
      localStorage.setItem(`mm_tx_${email}`, JSON.stringify(finalTx));
      try {
        await fetch("/api/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${email}`
          },
          body: JSON.stringify({ trades: finalTrades, transactions: finalTx })
        });
      } catch (err) {
        console.error("Failed to sync cleared trades to server", err);
      }
    }
  };

  useEffect(() => {
    if (userEmail) {
      fetchStatePayload(userEmail);
    } else {
      // Offline local sandbox states preview
      const offlineTrades = localStorage.getItem("mm_offline_trades");
      const offlineTx = localStorage.getItem("mm_offline_tx");
      
      let fetchedTrades: Trade[] = [];
      let fetchedTransactions: Transaction[] = [];

      if (offlineTrades || offlineTx) {
        fetchedTrades = offlineTrades ? JSON.parse(offlineTrades) : [];
        fetchedTransactions = offlineTx ? JSON.parse(offlineTx) : [];
      } else {
        const sample = getSampleState();
        fetchedTrades = sample.trades;
        fetchedTransactions = sample.transactions;
      }

      const mockIds = ["t1", "t2", "t3", "t4", "t5", "t6", "t7", "t8"];
      const mockTxIds = ["tr1", "tr2", "tr4"];

      const finalTrades = fetchedTrades.filter(t => !mockIds.includes(t.id));
      const finalTx = fetchedTransactions.filter(tr => !mockTxIds.includes(tr.id));

      setTrades(finalTrades);
      setTransactions(finalTx);

      if (fetchedTrades.length !== finalTrades.length || fetchedTransactions.length !== finalTx.length) {
        localStorage.setItem("mm_offline_trades", JSON.stringify(finalTrades));
        localStorage.setItem("mm_offline_tx", JSON.stringify(finalTx));
      }
    }
  }, [userEmail]);

  // Sync state to backend or local cache when updated
  const syncStatePayload = async (updatedTrades: Trade[], updatedTransactions: Transaction[]) => {
    if (userEmail) {
      // Local Storage scoped update
      localStorage.setItem(`mm_trades_${userEmail}`, JSON.stringify(updatedTrades));
      localStorage.setItem(`mm_tx_${userEmail}`, JSON.stringify(updatedTransactions));

      try {
        await fetch("/api/state", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${userEmail}`
          },
          body: JSON.stringify({ trades: updatedTrades, transactions: updatedTransactions })
        });
      } catch (err) {
        console.error("Failed to sync client trades state to server memory.", err);
      }
    } else {
      // Offline Sandbox Cache Scoped update
      localStorage.setItem("mm_offline_trades", JSON.stringify(updatedTrades));
      localStorage.setItem("mm_offline_tx", JSON.stringify(updatedTransactions));
    }
  };

  // Helper utility for calling secure authenticated endpoints effortlessly
  const handleFetchWithAuth = async (url: string, options: RequestInit = {}) => {
    const email = userEmail || "sandbox_guest";
    const headers = {
      ...options.headers,
      "Authorization": `Bearer ${email}`
    };
    const res = await fetch(url, { ...options, headers });
    return await res.json();
  };

  // --- Auth Handlers ---
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);

    if (!inputEmail || !inputPassword) {
      setAuthError("Email and password fields must be filled.");
      setAuthLoading(false);
      return;
    }

    try {
      const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload: any = { email: inputEmail, password: inputPassword };
      if (authMode === "register") {
        payload.displayName = inputDisplayName || inputEmail.split("@")[0];
      }

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (!response.ok) {
        setAuthError(data.error || "Authentication flow failed.");
      } else {
        // Sign-in successful
        localStorage.setItem("mm_user_email", data.email);
        localStorage.setItem("mm_user_name", data.displayName);
        localStorage.setItem("mm_user_role", data.role);
        
        setUserEmail(data.email);
        setUserDisplayName(data.displayName);
        setUserRole(data.role);

        alert(`Welcome back to MarketMinds, ${data.displayName}!`);
        
        // If they had mock/offline data, we can sync or just reload state
        fetchStatePayload(data.email);
      }
    } catch (err: any) {
      console.error(err);
      setAuthError("Could not reachauth server. Working in offline sandbox demo mode.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("mm_user_email");
    localStorage.removeItem("mm_user_name");
    localStorage.removeItem("mm_user_role");
    setUserEmail(null);
    setUserDisplayName(null);
    setUserRole(null);
    setTrades([]);
    setTransactions([]);
    setActiveTab("journal");
    alert("Logged out of profile successfully.");
  };

  // --- Action Core Handlers ---
  const handleAddTrade = (newTradeData: Omit<Trade, "id">) => {
    const newTrade: Trade = {
      ...newTradeData,
      id: "trade_" + Math.random().toString(36).substr(2, 9)
    };
    const nextTrades = [newTrade, ...trades];
    setTrades(nextTrades);
    syncStatePayload(nextTrades, transactions);
  };

  const handleUpdateTrade = (updatedTrade: Trade) => {
    const nextTrades = trades.map(t => t.id === updatedTrade.id ? updatedTrade : t);
    setTrades(nextTrades);
    syncStatePayload(nextTrades, transactions);
    setEditingTrade(null);
  };

  const handleDeleteTrade = (tradeId: string) => {
    const nextTrades = trades.filter(t => t.id !== tradeId);
    setTrades(nextTrades);
    syncStatePayload(nextTrades, transactions);
  };

  const handleAddTransaction = (newTxData: Omit<Transaction, "id">) => {
    const newTx: Transaction = {
      ...newTxData,
      id: "tx_" + Math.random().toString(36).substr(2, 9)
    };
    const nextTx = [newTx, ...transactions];
    setTransactions(nextTx);
    syncStatePayload(trades, nextTx);
  };

  const handleDeleteTransaction = (id: string) => {
    const nextTx = transactions.filter(t => t.id !== id);
    setTransactions(nextTx);
    syncStatePayload(trades, nextTx);
  };

  const handleExportDataCSV = () => {
    // Generate clean CSV of trades
    if (trades.length === 0) {
      alert("No trades to export.");
      return;
    }
    const headers = "ID,Symbol,Direction,Result,PnL,Lots,SetupDate,SetupTime,EntryDate,EntryTime,PriceIn,PriceOut,SL,TP,RR,Emotion,Score\n";
    const rows = trades.map(t => (
      `"${t.id}","${t.symbol}","${t.type}","${t.status}",${t.profitLoss},${t.size},"${t.setupDate}","${t.setupTime}","${t.entryDate}","${t.entryTime}",${t.entryPrice},${t.exitPrice},${t.stopLoss || ''},${t.takeProfit || ''},${t.riskRewardRatio || ''},"${t.emotionalState || ''}",${t.qualityScore || ''}`
    )).join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `MarketMinds_Trades_${userEmail || "Sandbox_Guest"}.csv`;
    a.click();
  };

  const handleWipeAccountData = () => {
    setConfirmWipe(true);
  };

  // Callback to execute Gemini report
  const handleGenerateAIInsights = async (): Promise<string> => {
    const res = await handleFetchWithAuth("/api/gemini/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades, transactions })
    });

    if (res && res.report) {
      setSavedAIReport(res.report);
      localStorage.setItem("mm_cached_ai_report", res.report);
      return res.report;
    } else {
      throw new Error(res.error || "Failed to parse coaching diagnostics.");
    }
  };

  if (!userEmail) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden transition-colors duration-300">
        {/* Glow Effects */}
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-pink-500/10 blur-[120px] pointer-events-none"></div>
        
        {/* Theme Toggle in top-right */}
        <div className="absolute top-4 right-4">
          <button
            id="btn-theme-toggle"
            onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors"
            title="Toggle Light / Dark Mode"
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>

        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center bg-indigo-605 text-white p-3.5 rounded-2xl shadow-lg shadow-indigo-650/20 mb-4">
            <BookOpen size={32} className="stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white font-sans">
            MarketMinds
          </h1>
          <p className="text-xs font-mono text-slate-500 dark:text-slate-400 mt-2">
            Institutional Setup Journaling & AI Analytics
          </p>
        </div>

        {/* Login/Register Card */}
        <div className="w-full max-w-md bg-white dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800/80 backdrop-blur-md rounded-2xl shadow-xl p-6 sm:p-8 space-y-6 transition-all duration-300">
          
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">
              {authMode === "login" ? "Welcome Back" : "Create Account"}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {authMode === "login" 
                ? "Enter your credentials to access your trading dashboard" 
                : "Register a synchronized profile to start tracking setups"}
            </p>
          </div>

          {authError && (
            <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 text-rose-600 dark:text-rose-400 p-3 rounded-xl text-xs text-center font-medium">
              {authError}
            </div>
          )}

          <form onSubmit={handleAuthSubmit} className="space-y-4">
            {authMode === "register" && (
              <div>
                <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Display Trader Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GoldTraderNick"
                  value={inputDisplayName}
                  onChange={(e) => setInputDisplayName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Trader Email Address</label>
              <input
                type="email"
                required
                placeholder="nick@marketminds.com"
                value={inputEmail}
                onChange={(e) => setInputEmail(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-mono text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-1">Secure Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={inputPassword}
                onChange={(e) => setInputPassword(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full bg-indigo-605 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl text-sm flex justify-center items-center gap-2 transition-all cursor-pointer shadow-lg shadow-indigo-600/20 active:scale-[0.98]"
            >
              {authLoading ? <Loader2 size={16} className="animate-spin" /> : <Lock size={14} />}
              {authMode === "login" ? "Login to Profile" : "Register Profile"}
            </button>
          </form>

          <div className="text-center pt-2 text-xs">
            {authMode === "login" ? (
              <p className="text-slate-500 dark:text-slate-400">
                New to MarketMinds?{" "}
                <button onClick={() => { setAuthMode("register"); setAuthError(""); }} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  Create a Profile
                </button>
              </p>
            ) : (
              <p className="text-slate-500 dark:text-slate-400">
                Already have a profile?{" "}
                <button onClick={() => { setAuthMode("login"); setAuthError(""); }} className="text-indigo-600 dark:text-indigo-400 font-bold hover:underline">
                  Login Securely
                </button>
              </p>
            )}
          </div>
        </div>

        {/* Footer info */}
        <p className="text-[10px] text-slate-400 dark:text-slate-550 mt-8 max-w-sm text-center leading-relaxed font-sans">
          💡 Registering with your system Owner Email initializes admin role diagnostics automatically.
        </p>
      </div>
    );
  }

  return (
    <div id="app-workspace-root" className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-850 dark:text-slate-105 flex flex-col selection:bg-indigo-100 selection:text-indigo-900 transition-colors duration-300">
      
      {/* 1. LUXURIOUS UNIVERSAL SYSTEM TOP HEADER */}
      <header id="app-navigation-header" className="bg-white dark:bg-slate-900 border-b border-slate-205 dark:border-slate-800 sticky top-0 z-40 px-4 py-2 flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Title logo and slogan */}
        <div id="header-branding" className="flex items-center gap-2.5">
          <div id="branding-circle" className="bg-indigo-600 p-2 rounded-lg text-white flex items-center justify-center">
            <BookOpen size={16} className="stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-1 leading-none">
              MarketMinds 
              <span className="text-[9px] bg-slate-100 dark:bg-slate-850 text-slate-600 dark:text-slate-350 border border-slate-205 dark:border-slate-800 rounded px-1.5 py-0.5 font-mono ml-0.5 font-semibold">
                V1.2
              </span>
            </h1>
            <p className="text-[9px] font-mono text-slate-405 dark:text-slate-500 mt-1 leading-none">Institutional Setup journaling & timing analytics</p>
          </div>
        </div>

        {/* Global Live IST +5:30 clock & Switcher */}
        <div className="flex items-center gap-2.5">
          <div id="header-utc-clock" className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-202 dark:border-slate-800 px-2.5 py-1 rounded text-[10px] font-mono text-slate-500 dark:text-slate-400">
            <Clock size={11} className="text-indigo-650 dark:text-indigo-400 animate-pulse" />
            <span>Time: <strong className="text-slate-800 dark:text-slate-200">{istTimeStr || "Syncing IST clock..."}</strong></span>
          </div>

          <button
            id="btn-theme-toggle"
            onClick={() => setTheme(prev => prev === "light" ? "dark" : "light")}
            className="p-1.5 rounded border border-slate-200 dark:border-slate-805 bg-white dark:bg-slate-950 text-slate-600 dark:text-amber-400 hover:bg-slate-100 dark:hover:bg-slate-900 cursor-pointer transition-colors"
            title="Toggle Light / Dark Mode"
          >
            {theme === "dark" ? <Sun size={13} /> : <Moon size={13} />}
          </button>
        </div>

        {/* Profile / Credentials Area */}
        <div id="header-user-badge" className="flex items-center gap-2">
          <div id="authenticated-profile" className="flex items-center gap-2.5">
            <div id="profile-assessment" className="text-right hidden sm:block">
              <span className="text-xs text-slate-800 dark:text-slate-200 font-semibold block leading-none">{userDisplayName}</span>
              <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono italic leading-none">{userEmail}</span>
            </div>
            <button 
              id="btn-signout"
              onClick={handleSignOut}
              className="bg-white dark:bg-slate-900 dark:hover:bg-slate-800 hover:bg-slate-50 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 text-[11px] py-1 px-2.5 rounded flex items-center gap-1 transition-all cursor-pointer"
              title="Sign out profile"
            >
              <LogOut size={11} />
              <span className="hidden sm:inline font-semibold">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* 3. APP NAVIGATION TABS CONTROLLER BAR */}
      <nav id="app-workspace-navigation" className="bg-slate-100 dark:bg-slate-900 border-b border-slate-205 dark:border-slate-800 px-4 sm:px-6 py-1.5 flex flex-wrap gap-1 items-center">
        <button
          id="tab-btn-journal"
          onClick={() => setActiveTab("journal")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "journal"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-650 dark:border-b-indigo-500 text-indigo-655 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <BookOpen size={13} /> Trading Journal
        </button>
        <button
          id="tab-btn-analytics"
          onClick={() => setActiveTab("analytics")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "analytics"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <BarChart2 size={13} /> Performance Analytics
        </button>
        <button
          id="tab-btn-backtest"
          onClick={() => setActiveTab("backtest")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "backtest"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Play size={13} /> Replay Backtesting
        </button>
        <button
          id="tab-btn-mistakes"
          onClick={() => setActiveTab("mistakes")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "mistakes"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Brain size={13} className="text-pink-500" /> Psychology & Mistakes
        </button>
        <button
          id="tab-btn-compliance"
          onClick={() => setActiveTab("compliance")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "compliance"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <CheckSquare size={13} className="text-emerald-500" /> Compliance Rules & Sim
        </button>
        <button
          id="tab-btn-coach"
          onClick={() => setActiveTab("coach")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "coach"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Sparkles size={13} className="text-amber-500" /> AI Coach DNA
        </button>
        <button
          id="tab-btn-alliance"
          onClick={() => setActiveTab("alliance")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "alliance"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <Users size={13} className="text-indigo-500" /> Alliance Squad
        </button>
        <button
          id="tab-btn-community"
          onClick={() => setActiveTab("community")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "community"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <MessageSquare size={13} /> Community Hub
        </button>
        
        {userRole === "admin" && (
          <button
            id="tab-btn-admin"
            onClick={() => setActiveTab("admin")}
            className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 border border-indigo-600/10 ${
              activeTab === "admin"
                ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-505 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
                : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
            }`}
          >
            <ShieldAlert size={13} className="text-indigo-600 animate-pulse" /> Admin Console
          </button>
        )}

        <button
          id="tab-btn-security"
          onClick={() => setActiveTab("security")}
          className={`px-3 py-1.5 text-xs font-mono rounded transition-all flex items-center gap-1.5 ${
            activeTab === "security"
              ? "bg-white dark:bg-slate-950 border border-slate-205 dark:border-slate-800 border-b-2 border-b-indigo-655 dark:border-b-indigo-500 text-indigo-660 dark:text-indigo-400 font-bold shadow-xs animate-none"
              : "text-slate-600 dark:text-slate-355 hover:bg-white/50 dark:hover:bg-slate-800/50"
          }`}
        >
          <HelpCircle size={13} /> Encryption & Rules Policy
        </button>
      </nav>

      {/* 4. MAIN CENTRAL SCREEN VIEWS SWITCHER */}
      <main id="app-workspace-content-canvas" className="flex-1 p-4 sm:p-5 w-full max-w-7xl mx-auto space-y-4">
        
        {/* JOURNAL VIEW (Trading Journal Dashboard metrics, stacked panels) */}
        {activeTab === "journal" && (
          <div id="tab-journal-workspace" className="space-y-4">
            
            {/* Summary metrics row in universal dashboard */}
            <DashboardSummary trades={trades} transactions={transactions} />

            {/* Log Trade Setup stacked ABOVE the Trades Log section */}
            <div id="journal-stacked-collateral-layout" className="flex flex-col gap-4">
              
              {/* Top Section: Isolated Manual Trade entry form scrolling */}
              <div 
                id="manual-entry-scrolling-container" 
                className="border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs flex flex-col hover:border-slate-350 dark:hover:border-slate-705 transition-all animate-none"
              >
                <TradeEntryForm 
                  onAddTrade={handleAddTrade}
                  onUpdateTrade={handleUpdateTrade}
                  onAddTransaction={handleAddTransaction}
                  editingTrade={editingTrade}
                  onCancelEdit={() => setEditingTrade(null)}
                />
              </div>

              {/* Bottom Section: Trade journal history dates grouped list */}
              <div 
                id="trade-log-scrolling-container" 
                className="border border-slate-250 dark:border-slate-800 rounded-lg overflow-hidden bg-white dark:bg-slate-900 shadow-xs h-[585px] flex flex-col hover:border-slate-350 dark:hover:border-slate-705 transition-all animate-none"
              >
                <TradeHistoryList 
                  trades={trades}
                  transactions={transactions}
                  onEditTrade={(t) => setEditingTrade(t)}
                  onDeleteTrade={handleDeleteTrade}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              </div>

            </div>

            {/* General Export Logs Row */}
            <div id="journal-export-row" className="bg-white dark:bg-slate-900 p-3.5 rounded-lg border border-slate-205 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between items-center text-slate-600 dark:text-slate-300 text-xs text-center sm:text-left">
              <div>
                <strong className="text-slate-800 dark:text-slate-150">Data Management Utilities:</strong> Exporting formatted journal CSV files is immediately supported.
              </div>
              <div className="flex gap-2.5">
                <button
                  id="btn-export-csv"
                  onClick={handleExportDataCSV}
                  className="bg-indigo-650 hover:bg-indigo-700 text-white text-xs px-3.5 py-1.5 rounded font-semibold pointer-events-auto cursor-pointer transition-colors"
                >
                  Export Trades to CSV
                </button>
                {confirmWipe ? (
                  <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-955/35 border border-rose-200 dark:border-rose-900 rounded px-2.5 py-1 select-none">
                    <span className="text-[10px] text-rose-700 dark:text-rose-400 font-bold font-mono">Erase all?</span>
                    <button
                      id="btn-confirm-wipe-yes"
                      onClick={() => {
                        setTrades([]);
                        setTransactions([]);
                        setSavedAIReport("");
                        localStorage.removeItem("mm_cached_ai_report");
                        syncStatePayload([], []);
                        setConfirmWipe(false);
                      }}
                      className="text-[9px] bg-rose-600 hover:bg-rose-700 text-white px-2 py-0.5 rounded font-bold cursor-pointer transition-colors animate-pulse"
                    >
                      Yes, Wipe
                    </button>
                    <button
                      id="btn-confirm-wipe-cancel"
                      onClick={() => setConfirmWipe(false)}
                      className="text-[9px] bg-slate-200 dark:bg-slate-850 text-slate-800 dark:text-slate-250 px-2 py-0.5 rounded font-semibold cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-wipe-data"
                    onClick={handleWipeAccountData}
                    className="bg-white dark:bg-slate-950 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-slate-200 dark:border-slate-800 text-rose-600 dark:text-rose-400 text-xs px-3.5 py-1.5 rounded font-semibold pointer-events-auto cursor-pointer transition-colors"
                  >
                    Wipe Log History
                  </button>
                )}
              </div>
            </div>

          </div>
        )}

        {/* PERFORMANCE ANALYTICS VIEW */}
        {activeTab === "analytics" && (
          <div id="tab-analytics-workspace">
            <AnalyticsDashboardView 
              trades={trades}
              transactions={transactions}
              onGenerateAIInsights={handleGenerateAIInsights}
              savedAIReport={savedAIReport}
            />
          </div>
        )}

        {/* PSYCHOLOGY & MISTAKES TRACKER VIEW */}
        {activeTab === "mistakes" && (
          <div id="tab-mistakes-workspace">
            <MistakeTrackerView trades={trades} />
          </div>
        )}

        {/* RULE COMPLIANCE & RISK SIM VIEW */}
        {activeTab === "compliance" && (
          <div id="tab-compliance-workspace">
            <RuleComplianceView trades={trades} transactions={transactions} />
          </div>
        )}

        {/* AI COACHING DNA INSIGHTS VIEW */}
        {activeTab === "coach" && (
          <div id="tab-coach-workspace">
            <CoachDashboardView 
              trades={trades}
              transactions={transactions}
              onGenerateAIInsights={handleGenerateAIInsights}
              savedAIReport={savedAIReport}
            />
          </div>
        )}

        {/* ALLIANCE ACCOUNTABILITY GROUPS VIEW */}
        {activeTab === "alliance" && (
          <div id="tab-alliance-workspace">
            <AccountabilityGroupsView userTrades={trades} userDisplayName={userDisplayName} />
          </div>
        )}

        {/* STRATEGY CANDLE REPLAY VIEW */}
        {activeTab === "backtest" && (
          <div id="tab-backtest-workspace">
            <BacktestingReplayView />
          </div>
        )}

        {/* COMMUNITY HUB VIEW */}
        {activeTab === "community" && (
          <div id="tab-community-workspace-outer">
            <CommunityHub userEmail={userEmail} userRole={userRole} onFetchWithAuth={handleFetchWithAuth} />
          </div>
        )}

        {/* SECURED ADMIN DIAL VIEW */}
        {activeTab === "admin" && userRole === "admin" && (
          <div id="tab-admin-workspace-outer">
            <AdminView onFetchWithAuth={handleFetchWithAuth} />
          </div>
        )}

        {/* SECURITY & RULES POLICY DOCK */}
        {activeTab === "security" && (
          <div id="tab-security-workspace">
            <DocumentationView />
          </div>
        )}

      </main>

      {/* 5. GENTLE SIMPLE FOOTER */}
      <footer id="app-workspace-footer" className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-4 text-center text-[10px] text-slate-500 dark:text-slate-400 space-y-1">
        <p>© 2026 MarketMinds Inc. Read-Only Secure Interface.</p>
        <p>This panel is designed to provide cognitive behavioral patterns and timing analysis. Use elite risk management practices in standard market systems.</p>
      </footer>

    </div>
  );
}
