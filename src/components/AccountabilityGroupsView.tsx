import React, { useState, useEffect } from "react";
import { MessageSquare, Users2, ShieldAlert, Trophy, ShieldCheck, Flame, TrendingUp, Loader2 } from "lucide-react";
import { Trade } from "../types";

interface GroupMember {
  name: string;
  avatar: string;
  winRate: number;
  obedience: number;
  netResult: number;
  streak: number;
  setupAccuracy: number; // %
  lastMistake: string;
}

interface AccountabilityGroupsViewProps {
  userTrades: Trade[];
  userDisplayName: string | null;
}

export default function AccountabilityGroupsView({ userTrades, userDisplayName }: AccountabilityGroupsViewProps) {
  const [groupName, setGroupName] = useState("Alpha Traders Alliance");
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);

  // Calculate currentUser stats on the fly
  const totalTrades = userTrades.length;
  const wins = userTrades.filter(t => t.status === "WIN").length;
  const userWinRate = totalTrades > 0 ? Math.round((wins / totalTrades) * 100) : 0;
  const userNetResult = userTrades.reduce((sum, t) => sum + (Number(t.profitLoss) || 0), 0);
  const userObedience = totalTrades > 0 
    ? Math.round((userTrades.filter(t => !t.mistakeTags || t.mistakeTags.length === 0).length / totalTrades) * 100)
    : 100;
  const userSetupAccuracy = userObedience;
  const userLastMistake = userTrades.length > 0 && userTrades[0].mistakeTags?.length 
    ? userTrades[0].mistakeTags[0] 
    : "None (Fully Obeying)";

  useEffect(() => {
    const fetchAllianceMembers = async () => {
      try {
        const res = await fetch("/api/community/leaderboard");
        if (res.ok) {
          const leaderboard = await res.json();
          
          // Map leaderboard users (except current user to avoid duplicates)
          const otherMembers = leaderboard
            .filter((m: any) => m.email.toLowerCase() !== (localStorage.getItem("mm_user_email") || "").toLowerCase())
            .map((m: any, idx: number) => ({
              name: m.displayName,
              avatar: `https://images.unsplash.com/photo-${1535713875000 + idx}?auto=format&fit=crop&q=80&w=150`, // semi-unique avatar placeholder
              winRate: m.winRate,
              obedience: m.consistency,
              netResult: m.netResult,
              streak: m.totalTrades > 0 ? Math.min(5, Math.ceil(m.totalTrades / 2)) : 0,
              setupAccuracy: m.consistency,
              lastMistake: m.consistency >= 80 ? "None (Fully Obeying)" : "Reviewing setup rules"
            }));

          // Current User
          const currentUser: GroupMember = {
            name: `${userDisplayName || "You (Trader)"}`,
            avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
            winRate: userWinRate,
            obedience: userObedience,
            netResult: userNetResult,
            streak: totalTrades > 0 ? Math.min(5, userTrades.filter(t => t.status === "WIN").length) : 0,
            setupAccuracy: userSetupAccuracy,
            lastMistake: userLastMistake
          };

          setMembers([currentUser, ...otherMembers]);
        }
      } catch (err) {
        console.error("Failed to load alliance members:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchAllianceMembers();
  }, [userTrades, userDisplayName]);

  // Standings sorting based on cumulative net results
  const standings = [...members].sort((a,b) => b.netResult - a.netResult);

  // Find most disciplined member
  const mostDisciplined = [...members].sort((a,b) => b.obedience - a.obedience)[0] || { name: "N/A", obedience: 100 };

  // Group Shared Leaks assessment from real data
  const groupLeakageCost = members
    .filter(m => m.netResult < 0)
    .reduce((sum, m) => sum + Math.abs(m.netResult), 0);
  
  const userMistakes = userTrades
    .flatMap(t => t.mistakeTags || [])
    .filter(Boolean);

  const getMostCommonMistake = () => {
    if (userMistakes.length === 0) return "No significant emotional leaks detected across real-time squad logs.";
    const counts: Record<string, number> = {};
    userMistakes.forEach(m => { counts[m] = (counts[m] || 0) + 1; });
    const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
    return `Excessive triggers of: ${sorted[0][0].toUpperCase()} (${sorted[0][1]} times)`;
  };

  const groupLeakageTheme = getMostCommonMistake();

  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center py-20 text-white space-y-4">
        <Loader2 className="animate-spin text-indigo-500" size={32} />
        <span className="text-sm font-mono text-slate-400">Syncing Alliance Squad Data...</span>
      </div>
    );
  }

  return (
    <div id="accountability-alliance-workspace" className="space-y-6">

      {/* 1. EXECUTIVE STANDINGS PANEL BANNER */}
      <div id="alliance-header-summary" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div id="alliance-badge" className="bg-indigo-500/10 p-3.5 rounded-xl text-indigo-455">
            <Users2 size={36} />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 font-mono block uppercase">Accountability Alliance Dock</span>
            <h3 className="text-sm font-bold text-slate-101 mt-1">Group Alliance: <span className="text-indigo-405">{groupName}</span></h3>
            <p className="text-xs text-slate-400 mt-1">Compare execution scores, discipline rates, and share optimal setup structures live.</p>
          </div>
        </div>

        <div className="bg-slate-950 p-4 border border-slate-850 rounded-xl text-center self-stretch md:self-auto min-w-[200px] flex flex-col justify-center">
          <span className="text-[9px] font-mono text-slate-500 block uppercase">Most Disciplined Member</span>
          <span className="text-sm font-bold font-mono text-emerald-400 block pt-1 flex items-center justify-center gap-1">
            <ShieldCheck size={14} />
            {mostDisciplined.name}
          </span>
          <span className="text-[10px] text-slate-500 italic mt-0.5">{mostDisciplined.obedience}% Obedience Rating</span>
        </div>
      </div>

      {/* 2. GROUP LEAKS WARNING DIAL */}
      <div className="bg-slate-900 border border-slate-850 p-4 rounded-xl text-white flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
            <ShieldAlert size={18} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-205 uppercase tracking-wide">Shared Group Leakage warning (Weekly target)</h4>
            <p className="text-xs text-slate-400 leading-normal mt-0.5">
              Theme: <strong className="text-rose-401 font-semibold">"{groupLeakageTheme}"</strong>
            </p>
          </div>
        </div>

        <div className="bg-slate-950 px-4 py-2 border border-rose-950/20 text-xs rounded-lg font-mono font-bold text-rose-450 self-stretch md:self-auto text-center">
          Cumulative leakage cost: -${groupLeakageCost}
        </div>
      </div>

      {/* 3. DETAILED SCORES STANDINGS BENTO GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-none">
        
        {/* Alliance leaderboard */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white space-y-4">
          <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 pb-2">
            Execution Ledger Board Standings
          </h4>

          <div id="standings-avatar-rows" className="space-y-3.5">
            {standings.map((m, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === standings.length - 1;
              
              return (
                <div key={idx} className="bg-slate-950 border border-slate-850 p-3 rounded-xl flex items-center justify-between hover:border-slate-750 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <img src={m.avatar} alt={m.name} className="w-9 h-9 rounded-full object-cover border border-slate-800" />
                      {isFirst && (
                        <span className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 text-slate-950 text-[8px] font-bold">
                          ★
                        </span>
                      )}
                    </div>
                    <div>
                      <span className="text-xs font-bold text-slate-200 block">{m.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Sequence Streak: {m.streak} active days
                      </span>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] bg-indigo-950 text-indigo-400 border border-indigo-900/50 px-2 py-0.5 rounded font-mono font-bold">
                      {m.obedience}% Compliance
                    </span>
                    <span className={`block font-mono text-xs font-bold mt-1 ${m.netResult >= 0 ? "text-emerald-400" : "text-rose-405"}`}>
                      {m.netResult >= 0 ? "+" : ""}${m.netResult}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Group accuracy stats scorecard */}
        <div className="bg-slate-900 border border-slate-850 p-5 rounded-xl text-white space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h4 className="text-xs font-semibold uppercase font-mono tracking-wider text-slate-400 border-b border-slate-800 pb-2">
              Setup Accuracy Metrics Across Group
            </h4>

            <div id="accuracy-radar-metrics" className="space-y-4">
              {members.map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-slate-300 font-semibold">{m.name}</span>
                    <span className="text-emerald-400 font-bold">{m.setupAccuracy}% Accuracy</span>
                  </div>
                  {/* Progress bar visual */}
                  <div className="bg-slate-950 rounded-full h-2 border border-slate-850 overflow-hidden">
                    <div 
                      className="bg-emerald-500 h-full opacity-80"
                      style={{ width: `${m.setupAccuracy}%` }}
                    />
                  </div>
                  <div className="text-[9px] text-slate-500 flex justify-between">
                    <span>Last Mistake trigger: {m.lastMistake}</span>
                    <span>Hold Ratio: Stable</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] text-slate-500 font-mono mt-4 leading-normal">
            🛡️ Group confluences provide healthy feedback loops. Challenge your members daily in the <strong>Discipline checklist panel</strong> to maintain cohesive accountability.
          </div>
        </div>

      </div>

    </div>
  );
}
