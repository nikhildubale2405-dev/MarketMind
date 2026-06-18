import React, { useState, useEffect } from "react";
import { Shield, Users, LineChart, TrendingUp, Sparkles, RefreshCw, Layers } from "lucide-react";

interface AdminViewProps {
  onFetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
}

export default function AdminView({ onFetchWithAuth }: AdminViewProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [errorStr, setErrorStr] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorStr("");
    try {
      const data = await onFetchWithAuth("/api/admin/users");
      if (data && !data.error) {
        setUsers(data);
        if (data.length > 0 && !selectedUserEmail) {
          setSelectedUserEmail(data[0].email);
        }
      } else {
        setErrorStr(data?.error || "Failed to fetch admin dashboard. Admin privileges required.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorStr("Cannot load admin list. Make sure you are signed in with the correct system-owner account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const selectedUserData = users.find(u => u.email === selectedUserEmail);

  return (
    <div id="admin-workspace" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-6">
      
      {/* Admin header */}
      <div id="admin-control-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-3">
        <div id="admin-header-left" className="flex items-center gap-2">
          <Shield size={20} className="text-emerald-400 animate-pulse" />
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase font-mono">System-Owner Administrative Panel</h3>
            <p className="text-[10px] text-slate-500">Full read-only monitoring into user profiles, progress, and trade histories.</p>
          </div>
        </div>

        <button
          id="btn-refresh-admin-dashboard"
          onClick={fetchAdminData}
          disabled={loading}
          className="bg-slate-800 hover:bg-slate-750 text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 transition-all font-mono pointer-events-auto cursor-pointer"
        >
          <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
          Sync Profiles
        </button>
      </div>

      {errorStr ? (
        <div id="admin-unauthorized-alert" className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs space-y-2">
          <p className="font-mono font-bold">⛔ ADMIN ACCESS DECLINED</p>
          <p>{errorStr}</p>
          <p className="text-slate-500 text-[10px]">Note: The email and password matching ADMIN_EMAIL and ADMIN_PASSWORD configured in the server environment must be used to access this console.</p>
        </div>
      ) : (
        <div id="admin-split-layout" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Registered Users list */}
          <div id="admin-users-list-column" className="bg-slate-950 p-4 rounded-xl border border-slate-850">
            <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block mb-3">Registered Users Directory ({users.length})</span>
            
            <div id="admin-users-scroller" className="space-y-2 max-h-[350px] overflow-y-auto">
              {users.map(u => (
                <button
                  id={`btn-select-user-${u.email}`}
                  key={u.email}
                  onClick={() => setSelectedUserEmail(u.email)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    selectedUserEmail === u.email
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      : "bg-slate-900 border-slate-850 text-slate-300 hover:bg-slate-850"
                  }`}
                >
                  <div>
                    <span className="font-bold block text-slate-200">{u.displayName}</span>
                    <span className="text-[10px] text-slate-500 font-mono italic">{u.email}</span>
                  </div>

                  <div className="text-right">
                    <span className="bg-slate-800 text-slate-400 px-2 py-0.5 rounded text-[9px] font-mono uppercase block w-max ml-auto">
                      {u.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      {u.tradesCount} trades
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Right Columns: Selected User Deep Dive Analysis */}
          <div id="admin-user-details-column" className="lg:col-span-2 bg-slate-950 p-5 rounded-xl border border-slate-850 space-y-4">
            {selectedUserData ? (
              <div id="user-deep-dive-card" className="space-y-4">
                <div id="deep-dive-header" className="border-b border-slate-850 pb-3">
                  <span className="text-[9px] font-mono text-slate-500 tracking-widest block uppercase">User Profile Assessment</span>
                  <h4 className="text-lg font-bold text-slate-200 mt-0.5">{selectedUserData.displayName}</h4>
                  <p className="text-xs text-slate-405 font-mono italic">{selectedUserData.email} • Assigned Role: {selectedUserData.role}</p>
                </div>

                {/* User Statistics Overview */}
                {(() => {
                  const trades = selectedUserData.state?.trades || [];
                  const txs = selectedUserData.state?.transactions || [];

                  const totalInvestment = txs
                    .filter((t: any) => t.type === "DEPOSIT")
                    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

                  const totalWithdrawals = txs
                    .filter((t: any) => t.type === "WITHDRAWAL")
                    .reduce((sum: number, t: any) => sum + Number(t.amount), 0);

                  const totalProfit = trades
                    .filter((t: any) => Number(t.profitLoss) > 0)
                    .reduce((sum: number, t: any) => sum + Number(t.profitLoss), 0);

                  const totalLoss = trades
                    .filter((t: any) => Number(t.profitLoss) < 0)
                    .reduce((sum: number, t: any) => sum + Math.abs(Number(t.profitLoss)), 0);

                  const currentEquity = totalInvestment + totalProfit - totalLoss - totalWithdrawals;

                  // Simple mock coordinate string to represent curve
                  const currentPnL = totalProfit - totalLoss;

                  return (
                    <div id="assessment-details" className="space-y-4">
                      {/* Stats grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">Total Equity</span>
                          <span className="text-sm font-bold font-mono text-emerald-400">${currentEquity.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">Total Seeded</span>
                          <span className="text-sm font-bold font-mono text-blue-400">${totalInvestment.toFixed(2)}</span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">Trading PnP</span>
                          <span className={`text-sm font-bold font-mono ${currentPnL >= 0 ? "text-emerald-405" : "text-rose-400"}`}>
                            {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)}
                          </span>
                        </div>
                        <div className="bg-slate-900 border border-slate-800 p-3 rounded-lg">
                          <span className="text-[9px] text-slate-500 font-mono uppercase block">Cashouts</span>
                          <span className="text-sm font-bold font-mono text-amber-500">${totalWithdrawals.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Equity Curve indicator bar */}
                      <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl">
                        <span className="text-[10px] text-slate-400 font-mono block mb-2 flex items-center gap-1.5">
                          <LineChart size={13} className="text-emerald-400" />
                          Account Balance Assessment History curve
                        </span>
                        
                        <div className="h-2.5 bg-slate-950 rounded-full overflow-hidden flex">
                          <div 
                            className="bg-blue-400" 
                            style={{ width: `${Math.min(100, Math.max(10, (totalInvestment / (currentEquity || 1)) * 50))}%` }} 
                            title="Capital portion"
                          />
                          <div 
                            className="bg-emerald-400 ml-0.5" 
                            style={{ width: `${Math.min(100, Math.max(0, (totalProfit / (currentEquity || 1)) * 50))}%` }} 
                            title="Profit portion"
                          />
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500 font-mono mt-1.5">
                          <span>Investment baseline capital</span>
                          <span className="text-emerald-400">Total Profit Growth: ${totalProfit.toFixed(1)}</span>
                        </div>
                      </div>

                      {/* Selected user raw trades history list */}
                      <div className="border-t border-slate-850 pt-3">
                        <span className="text-[10px] text-slate-400 font-mono block mb-2 uppercase">Complete trade logging history entries:</span>
                        {trades.length === 0 ? (
                          <p className="text-xs text-slate-600 italic">User has not registered any setups.</p>
                        ) : (
                          <div className="max-h-[150px] overflow-y-auto space-y-1.5">
                            {trades.map((t: any, idx: number) => (
                              <div key={idx} className="bg-slate-900 px-3 py-1.5 rounded text-xs flex justify-between items-center">
                                <div>
                                  <span className="font-bold text-slate-200">{t.symbol}</span>
                                  <span className="text-[10px] text-slate-500 font-mono block">{t.entryDate} {t.entryTime} • {t.type} • {t.size}L</span>
                                </div>
                                <span className={`font-mono font-bold ${Number(t.profitLoss) >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                                  {Number(t.profitLoss) >= 0 ? "+" : ""}${Number(t.profitLoss).toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

              </div>
            ) : (
              <p className="text-xs text-slate-500 py-10 text-center">No platform users registered yet.</p>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
