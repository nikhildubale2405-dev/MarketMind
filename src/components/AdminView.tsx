import React, { useState, useEffect, useMemo } from "react";
import {
  Shield,
  Users,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Search,
  DollarSign,
  Activity,
  Layers,
  Clock
} from "lucide-react";

interface AdminViewProps {
  onFetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
  userRole?: string | null;
  currentUserEmail?: string | null;
}

export default function AdminView({ onFetchWithAuth, userRole, currentUserEmail }: AdminViewProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [errorStr, setErrorStr] = useState("");
  const [selectedUserEmail, setSelectedUserEmail] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteTargetEmail, setDeleteTargetEmail] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const isAdmin = userRole === "admin";

  const fetchAdminData = async () => {
    setLoading(true);
    setErrorStr("");
    try {
      const data = await onFetchWithAuth("/api/admin/users");
      if (data && !data.error && Array.isArray(data)) {
        setUsers(data);
        if (data.length > 0 && (!selectedUserEmail || !data.find(u => u.email === selectedUserEmail))) {
          setSelectedUserEmail(data[0].email);
        }
      } else {
        setErrorStr(data?.error || "Failed to fetch admin dashboard. Admin privileges required.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorStr("Cannot load user management list. Make sure you are signed in with an admin account.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleDeleteUser = async (email: string) => {
    if (!isAdmin) return;
    setDeleting(true);
    try {
      const res = await onFetchWithAuth(`/api/admin/users/${encodeURIComponent(email)}`, {
        method: "DELETE"
      });

      if (res && res.success) {
        setToastMsg(`User ${email} deleted successfully.`);
        setTimeout(() => setToastMsg(""), 3000);
        setDeleteTargetEmail(null);
        // Refresh users list
        await fetchAdminData();
      } else {
        alert(res?.error || "Failed to delete user.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Error deleting user.");
    } finally {
      setDeleting(false);
    }
  };

  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      u => (u.displayName || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q)
    );
  }, [users, searchQuery]);

  const selectedUserData = users.find(u => u.email === selectedUserEmail);

  return (
    <div id="admin-workspace" className="space-y-6">

      {/* Admin Header */}
      <div id="admin-header-card" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-500/10 p-2.5 rounded-xl text-emerald-400 border border-emerald-500/20">
            <Shield size={22} />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-wide uppercase font-mono text-slate-200">
              System Administration Panel
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Manage registered accounts, monitor user trade metrics, and maintain platform security
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {toastMsg && (
            <span className="text-xs text-emerald-400 font-mono bg-emerald-950/40 border border-emerald-900/60 rounded px-2.5 py-1 animate-pulse">
              {toastMsg}
            </span>
          )}
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all font-mono text-slate-300 hover:text-white cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            Sync Users
          </button>
        </div>
      </div>

      {errorStr ? (
        <div className="bg-rose-500/10 border border-rose-500/20 text-rose-400 p-4 rounded-xl text-xs space-y-1.5">
          <p className="font-mono font-bold flex items-center gap-1.5">
            <AlertTriangle size={14} /> Admin Access Required
          </p>
          <p>{errorStr}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Left Column: Users Directory */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-white space-y-3 flex flex-col justify-between">
            <div className="space-y-3">
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-2">
                <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold flex items-center gap-1.5">
                  <Users size={13} className="text-emerald-400" />
                  Users Directory ({users.length})
                </span>
              </div>

              {/* Search input */}
              <div className="relative">
                <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search user name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-850 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500 font-sans"
                />
              </div>

              {/* Users List */}
              <div className="space-y-2 max-h-[420px] overflow-y-auto pr-0.5">
                {filteredUsers.length === 0 ? (
                  <p className="text-xs text-slate-600 text-center py-8">No matching users found.</p>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelected = selectedUserEmail === u.email;
                    const isSelf = currentUserEmail && u.email.toLowerCase() === currentUserEmail.toLowerCase();

                    return (
                      <div
                        key={u.email}
                        onClick={() => setSelectedUserEmail(u.email)}
                        className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? "bg-indigo-600/15 border-indigo-500/40 text-slate-100"
                            : "bg-slate-950 border-slate-850 text-slate-300 hover:border-slate-800"
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 truncate">{u.displayName || "Trader"}</span>
                            {isSelf && (
                              <span className="text-[8px] font-mono bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-bold">YOU</span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-500 font-mono block truncate mt-0.5">{u.email}</span>
                        </div>

                        <div className="text-right flex items-center gap-2 flex-shrink-0">
                          <div>
                            <span className={`text-[8px] font-mono uppercase px-1.5 py-0.5 rounded block text-center font-bold ${
                              u.role === "admin"
                                ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60"
                                : "bg-slate-900 text-slate-400"
                            }`}>
                              {u.role || "user"}
                            </span>
                            <span className="text-[10px] font-mono text-slate-500 block mt-1">
                              {u.tradesCount || 0}t
                            </span>
                          </div>

                          {/* Delete button (Admin only, cannot delete own self) */}
                          {isAdmin && !isSelf && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteTargetEmail(u.email);
                              }}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-900 rounded transition-colors"
                              title={`Delete user ${u.email}`}
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Selected User Deep Dive Details */}
          <div className="lg:col-span-2 bg-slate-900 border border-slate-800 p-5 rounded-xl text-white space-y-4">
            {selectedUserData ? (
              <div className="space-y-5">
                {/* User Header & Delete Action */}
                <div className="flex flex-wrap justify-between items-start gap-3 border-b border-slate-800/80 pb-3">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest block">User Account Profile</span>
                    <h4 className="text-base font-bold text-slate-100 mt-0.5 flex items-center gap-2">
                      {selectedUserData.displayName || "Trader"}
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded uppercase font-bold ${
                        selectedUserData.role === "admin" ? "bg-emerald-950 text-emerald-400 border border-emerald-900/60" : "bg-slate-950 text-slate-400 border border-slate-800"
                      }`}>
                        {selectedUserData.role || "user"}
                      </span>
                    </h4>
                    <span className="text-xs font-mono text-slate-400 mt-0.5 block">{selectedUserData.email}</span>
                  </div>

                  {/* Admin-only Delete Button */}
                  {isAdmin && (!currentUserEmail || selectedUserData.email.toLowerCase() !== currentUserEmail.toLowerCase()) && (
                    <div>
                      {deleteTargetEmail === selectedUserData.email ? (
                        <div className="flex items-center gap-1.5 bg-rose-950/60 border border-rose-900/80 rounded-lg p-1.5">
                          <span className="text-[10px] font-mono text-rose-300 font-bold px-1">Delete this user?</span>
                          <button
                            onClick={() => handleDeleteUser(selectedUserData.email)}
                            disabled={deleting}
                            className="text-[10px] bg-rose-600 hover:bg-rose-700 text-white px-2.5 py-1 rounded font-bold cursor-pointer transition-colors"
                          >
                            {deleting ? "Deleting..." : "Yes, Delete"}
                          </button>
                          <button
                            onClick={() => setDeleteTargetEmail(null)}
                            className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-1 rounded font-semibold cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteTargetEmail(selectedUserData.email)}
                          className="bg-rose-950/40 hover:bg-rose-900/50 border border-rose-900/60 text-rose-400 text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-mono cursor-pointer transition-colors"
                        >
                          <Trash2 size={13} /> Delete User
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Metrics Grid */}
                {(() => {
                  const userTrades = selectedUserData.state?.trades || [];
                  const txs = selectedUserData.state?.transactions || [];

                  const totalDeposits = txs
                    .filter((t: any) => t.type === "DEPOSIT")
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

                  const totalWithdrawals = txs
                    .filter((t: any) => t.type === "WITHDRAWAL")
                    .reduce((sum: number, t: any) => sum + Number(t.amount || 0), 0);

                  const wins = userTrades.filter((t: any) => Number(t.profitLoss) > 0);
                  const losses = userTrades.filter((t: any) => Number(t.profitLoss) < 0);

                  const totalProfit = wins.reduce((sum: number, t: any) => sum + Number(t.profitLoss), 0);
                  const totalLoss = losses.reduce((sum: number, t: any) => sum + Math.abs(Number(t.profitLoss)), 0);
                  const netPnL = totalProfit - totalLoss;
                  const currentEquity = totalDeposits - totalWithdrawals + netPnL;
                  const winRate = userTrades.length > 0 ? Math.round((wins.length / userTrades.length) * 100) : 0;

                  return (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Account Equity</span>
                          <span className="text-base font-bold font-mono text-emerald-400">${currentEquity.toFixed(2)}</span>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Net Trade PnL</span>
                          <span className={`text-base font-bold font-mono ${netPnL >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                            {netPnL >= 0 ? "+" : ""}${netPnL.toFixed(2)}
                          </span>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Win Rate</span>
                          <span className="text-base font-bold font-mono text-indigo-400">{winRate}%</span>
                        </div>

                        <div className="bg-slate-950 border border-slate-850 p-3 rounded-xl">
                          <span className="text-[9px] font-mono text-slate-500 uppercase block">Total Trades</span>
                          <span className="text-base font-bold font-mono text-slate-200">{userTrades.length}</span>
                        </div>
                      </div>

                      {/* Recent User Trades Table */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-2.5">
                        <span className="text-[10px] font-mono text-slate-400 uppercase font-semibold block">
                          User Trades History ({userTrades.length})
                        </span>

                        {userTrades.length === 0 ? (
                          <p className="text-xs text-slate-600 py-6 text-center">No trades logged by this user yet.</p>
                        ) : (
                          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1">
                            {userTrades.slice(0, 15).map((t: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex justify-between items-center text-xs py-1.5 px-2.5 rounded bg-slate-900 border border-slate-850"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-200">{t.symbol}</span>
                                  <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded font-bold ${
                                    t.type === "BUY" ? "bg-emerald-950 text-emerald-400" : "bg-rose-950 text-rose-400"
                                  }`}>
                                    {t.type}
                                  </span>
                                  <span className="text-[10px] font-mono text-slate-500">{t.entryDate}</span>
                                </div>

                                <span className={`font-mono font-bold ${Number(t.profitLoss) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
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
              <div className="text-center py-16 text-slate-600">
                <Users size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs">Select a user from the directory to review their detailed profile and trading performance.</p>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}
