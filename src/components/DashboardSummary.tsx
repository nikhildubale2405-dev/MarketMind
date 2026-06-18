import { Trade, Transaction } from "../types";
import { TrendingUp, TrendingDown, DollarSign, Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

interface DashboardSummaryProps {
  trades: Trade[];
  transactions: Transaction[];
}

export default function DashboardSummary({ trades, transactions }: DashboardSummaryProps) {
  // Deposit amount increases available balance.
  // Deposit amount shall increase Total Investment.
  const totalInvestment = transactions
    .filter(t => t.type === "DEPOSIT")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalWithdrawals = transactions
    .filter(t => t.type === "WITHDRAWAL")
    .reduce((sum, t) => sum + Number(t.amount), 0);

  const totalProfit = trades
    .filter(t => Number(t.profitLoss) > 0)
    .reduce((sum, t) => sum + Number(t.profitLoss), 0);

  // Profit/Loss can be negative. Let's make sure it represents the loss magnitude correctly
  const totalLoss = trades
    .filter(t => Number(t.profitLoss) < 0)
    .reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);

  // Formula: Current Equity = Total Investment + Total Trading Profit − Total Trading Loss − Total Withdrawals
  const currentEquity = totalInvestment + totalProfit - totalLoss - totalWithdrawals;

  return (
    <div id="dashboard-summary" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 mb-4">
      {/* Total Equity */}
      <div id="card-equity" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-md p-3.5 shadow-xs text-slate-850 dark:text-slate-105 flex items-center justify-between hover:shadow-sm transition-shadow">
        <div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Equity</p>
          <p className="text-xl font-extrabold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5 animate-none">
            ${currentEquity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Current account value</p>
        </div>
        <div id="icon-equity" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-2.5 rounded-md">
          <Wallet size={18} />
        </div>
      </div>

      {/* Total Investment */}
      <div id="card-investment" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-md p-3.5 shadow-xs text-slate-850 dark:text-slate-105 flex items-center justify-between hover:shadow-sm transition-shadow">
        <div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Investment</p>
          <p className="text-xl font-bold tracking-tight text-indigo-650 dark:text-indigo-400 mt-0.5 animate-none">
            ${totalInvestment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Total deposited amount</p>
        </div>
        <div id="icon-investment" className="bg-indigo-50 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 p-2.5 rounded-md">
          <ArrowDownLeft size={18} />
        </div>
      </div>

      {/* Total Profit */}
      <div id="card-profit" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-md p-3.5 shadow-xs text-slate-850 dark:text-slate-105 flex items-center justify-between hover:shadow-sm transition-shadow">
        <div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Profit</p>
          <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400 mt-0.5 animate-none">
            +${totalProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Sum of won closed trades</p>
        </div>
        <div id="icon-profit" className="bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 p-2.5 rounded-md">
          <TrendingUp size={18} />
        </div>
      </div>

      {/* Total Loss */}
      <div id="card-loss" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-md p-3.5 shadow-xs text-slate-850 dark:text-slate-105 flex items-center justify-between hover:shadow-sm transition-shadow">
        <div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Loss</p>
          <p className="text-xl font-bold tracking-tight text-rose-600 dark:text-rose-455 mt-0.5 animate-none">
            -${totalLoss.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Sum of lost closed trades</p>
        </div>
        <div id="icon-loss" className="bg-rose-50 dark:bg-rose-950/30 text-rose-650 dark:text-rose-400 p-2.5 rounded-md">
          <TrendingDown size={18} />
        </div>
      </div>

      {/* Total Withdrawals */}
      <div id="card-withdrawals" className="bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-md p-3.5 shadow-xs text-slate-850 dark:text-slate-105 flex items-center justify-between hover:shadow-sm transition-shadow">
        <div>
          <p className="text-[10px] font-mono text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total Withdrawals</p>
          <p className="text-xl font-bold tracking-tight text-amber-600 dark:text-amber-450 mt-0.5 animate-none">
            -${totalWithdrawals.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Asset capital cashouts</p>
        </div>
        <div id="icon-withdrawals" className="bg-amber-50 dark:bg-amber-950/30 text-amber-650 dark:text-amber-400 p-2.5 rounded-md">
          <ArrowUpRight size={18} />
        </div>
      </div>
    </div>
  );
}
