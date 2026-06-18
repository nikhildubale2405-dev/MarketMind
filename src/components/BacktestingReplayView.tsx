import React, { useState } from "react";
import { Play, SkipForward, RotateCcw, AlertTriangle, TrendingUp, TrendingDown, RefreshCw, BarChart2 } from "lucide-react";

interface SimulatedTrade {
  type: "BUY" | "SELL";
  price: number;
  sl: number;
  tp: number;
  status: "ACTIVE" | "WIN" | "LOSS";
  pnl: number;
}

export default function BacktestingReplayView() {
  const [symbol, setSymbol] = useState("XAU/USD");
  const [timeframe, setTimeframe] = useState("1H");
  const [running, setRunning] = useState(false);
  const [simIndex, setSimIndex] = useState(0);

  // Simulation setup states
  const [lotSize, setLotSize] = useState(0.1);
  const [stopLossPts, setStopLossPts] = useState(50); // Points
  const [takeProfitPts, setTakeProfitPts] = useState(100); // Points

  // Active simulated trade State
  const [activeTrade, setActiveTrade] = useState<SimulatedTrade | null>(null);

  // Replay Stats
  const [simulationHistory, setSimulationHistory] = useState<SimulatedTrade[]>([]);

  // Generated candle data mock list for stepping
  // Each candle contains: open, high, low, close
  const [candles, setCandles] = useState<any[]>([]);

  const handleStartBacktest = () => {
    // Generate some reasonable mock candles based on selected symbol
    let basePrice = 2000;
    if (symbol.includes("USOIL")) basePrice = 75;
    if (symbol.includes("BTC")) basePrice = 65000;
    if (symbol.includes("AUD")) basePrice = 0.65;

    const mockCandles = [];
    let currentPrice = basePrice;
    
    // Generate 30 candles
    for (let i = 0; i < 40; i++) {
      const volatility = basePrice * 0.003;
      const change = (Math.random() - 0.48) * volatility;
      const o = currentPrice;
      const c = currentPrice + change;
      const high = Math.max(o, c) + Math.random() * volatility * 0.4;
      const low = Math.min(o, c) - Math.random() * volatility * 0.4;
      
      mockCandles.push({ open: o, high, low, close: c });
      currentPrice = c;
    }

    setCandles(mockCandles);
    setSimIndex(5); // Start with 5 candles as historical
    setRunning(true);
    setActiveTrade(null);
    setSimulationHistory([]);
  };

  const handleResetBacktest = () => {
    setRunning(false);
    setCandles([]);
    setSimIndex(0);
    setActiveTrade(null);
    setSimulationHistory([]);
  };

  // ADVANCE CANDLE STEPPING
  const handleNextCandle = () => {
    if (simIndex >= candles.length - 1) {
      alert("End of historical candle sequence reached. Replay simulation complete.");
      return;
    }

    const nextIndex = simIndex + 1;
    const currentCandle = candles[nextIndex];
    setSimIndex(nextIndex);

    // If there is an active simulated trade, check if high/low touched Stop Loss or Take Profit
    if (activeTrade && activeTrade.status === "ACTIVE") {
      let isStopped = false;
      let isTargeted = false;

      const High = currentCandle.high;
      const Low = currentCandle.low;

      if (activeTrade.type === "BUY") {
        if (Low <= activeTrade.sl) {
          isStopped = true;
        } else if (High >= activeTrade.tp) {
          isTargeted = true;
        }
      } else {
        // SELL order
        if (High >= activeTrade.sl) {
          isStopped = true;
        } else if (Low <= activeTrade.tp) {
          isTargeted = true;
        }
      }

      if (isStopped) {
        const pnl = -(stopLossPts * lotSize * 10); // Loss based on points
        const updated = { ...activeTrade, status: "LOSS" as const, pnl };
        setActiveTrade(null);
        setSimulationHistory(prev => [...prev, updated]);
        alert("🚨 Simulation Trade STOP LOSS triggered! loss recorded.");
      } else if (isTargeted) {
        const pnl = (takeProfitPts * lotSize * 10); // Profit
        const updated = { ...activeTrade, status: "WIN" as const, pnl };
        setActiveTrade(null);
        setSimulationHistory(prev => [...prev, updated]);
        alert("🎯 Simulation Trade TAKE PROFIT triggered! Profit recorded.");
      }
    }
  };

  const handlePlaceOrder = (type: "BUY" | "SELL") => {
    if (activeTrade) {
      alert("You already have an active simulated position. Close or step it first.");
      return;
    }

    const entryPrice = candles[simIndex]?.close || 2000;
    
    // Calculate Pips/Points modifiers
    let pointDelta = 1; // absolute dollar change representing 100 points
    if (symbol.includes("BTC")) pointDelta = 100;
    if (symbol.includes("XAU")) pointDelta = 5;
    if (symbol.includes("AUD")) pointDelta = 0.005;

    // SL / TP price levels
    const stopLossPrice = type === "BUY" 
      ? entryPrice - (stopLossPts * 0.01 * pointDelta) 
      : entryPrice + (stopLossPts * 0.01 * pointDelta);

    const takeProfitPrice = type === "BUY" 
      ? entryPrice + (takeProfitPts * 0.01 * pointDelta) 
      : entryPrice - (takeProfitPts * 0.01 * pointDelta);

    const newTrade: SimulatedTrade = {
      type,
      price: Number(entryPrice.toFixed(4)),
      sl: Number(stopLossPrice.toFixed(4)),
      tp: Number(takeProfitPrice.toFixed(4)),
      status: "ACTIVE",
      pnl: 0
    };

    setActiveTrade(newTrade);
    alert(`Simulated mock ${type} position opened at ${newTrade.price}. Click "Step Forward 🕯️" to advance candles.`);
  };

  // End Summary States calculation
  const totalSims = simulationHistory.length;
  const winsSims = simulationHistory.filter(s => s.status === "WIN");
  const winRateSims = totalSims > 0 ? (winsSims.length / totalSims) * 100 : 0;
  const netPnLSims = simulationHistory.reduce((sum, s) => sum + s.pnl, 0);

  return (
    <div id="backtesting-workspace" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-6">
      
      {/* Dashboard header */}
      <div id="backtest-header" className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-800 pb-3">
        <div>
          <h3 className="font-bold text-sm tracking-wide uppercase font-mono flex items-center gap-2">
            <BarChart2 className="text-emerald-400" size={18} />
            Strategy Candles Replay / Backtesting Surface
          </h3>
          <p className="text-[10px] text-slate-500">Test setups and execution mechanics live with step-by-step mock candles speed controls.</p>
        </div>
      </div>

      {!running ? (
        /* Configuration Screen */
        <div id="backtest-config-banner" className="bg-slate-950 p-6 rounded-xl border border-slate-850 space-y-4 max-w-2xl mx-auto">
          <span className="text-[10px] font-mono text-emerald-400 tracking-wider uppercase block">Replay Sandbox Configuration</span>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Asset Symbol</label>
              <select
                id="select-backtest-symbol"
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              >
                <option value="XAU/USD">XAU/USD (Gold)</option>
                <option value="USOIL">USOIL (Crude)</option>
                <option value="BTC/USD">BTC/USD (Bitcoin)</option>
                <option value="AUD/USD">AUD/USD (Forex)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Testing Timeframe</label>
              <select
                id="select-backtest-timeframe"
                value={timeframe}
                onChange={(e) => setTimeframe(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              >
                <option value="15M">15 Minutes</option>
                <option value="1H">1 Hour</option>
                <option value="4H">4 Hours</option>
                <option value="D">Daily Chart</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5">
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Position Size</label>
              <input
                id="input-backtest-lots"
                type="number"
                step="0.01"
                min="0.01"
                value={lotSize}
                onChange={(e) => setLotSize(parseFloat(e.target.value) || 0.1)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Stop Loss (Points)</label>
              <input
                id="input-backtest-sl"
                type="number"
                min="10"
                value={stopLossPts}
                onChange={(e) => setStopLossPts(parseInt(e.target.value) || 50)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-mono text-slate-400 mb-1">Take Profit (Points)</label>
              <input
                id="input-backtest-tp"
                type="number"
                min="10"
                value={takeProfitPts}
                onChange={(e) => setTakeProfitPts(parseInt(e.target.value) || 100)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono"
              />
            </div>
          </div>

          <button
            id="btn-trigger-backtest"
            onClick={handleStartBacktest}
            className="w-full bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 transition-all pointer-events-auto cursor-pointer"
          >
            <Play size={14} /> Start Candle Replay Reconstruct
          </button>
        </div>
      ) : (
        /* Backtest Replay chart and simulator controls */
        <div id="backtest-live-workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Columns: Interactive Candlestick Chart preview */}
          <div className="lg:col-span-2 bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col justify-between">
            <div className="flex justify-between items-center mb-4 text-xs font-mono text-slate-400">
              <span>Backtesting active: <strong>{symbol} • {timeframe}</strong></span>
              <span>Candles processed: <strong>{simIndex}/{candles.length}</strong></span>
            </div>

            {/* Simulated Candle Canvas */}
            <div id="candle-rendered-stage" className="bg-slate-900/60 border border-slate-850 rounded-xl h-52 p-4 flex items-end justify-center gap-2 relative">
              {candles.slice(0, simIndex).slice(-15).map((candle, idx) => {
                const isGreen = candle.close >= candle.open;
                const bodyY = isGreen ? candle.open : candle.close;
                const bodyHeight = Math.abs(candle.close - candle.open);
                const totalRange = candle.high - candle.low || 1;

                // Scale for render
                const scale = 220; // px
                const highScaled = ((candle.high - bodyY) / totalRange) * 50;
                
                return (
                  <div key={idx} className="flex flex-col items-center flex-1 max-w-[20px]">
                    {/* Upper wick */}
                    <div className="w-[1.5px] h-3 bg-slate-450" />
                    <div className={`w-full rounded-sm ${isGreen ? "bg-emerald-500" : "bg-rose-500"}`} style={{ height: `${Math.max(12, Math.round(bodyHeight * 100))}px` }} />
                    {/* Lower wick */}
                    <div className="w-[1.5px] h-3 bg-slate-450" />
                  </div>
                );
              })}

              {/* Active position target guidelines */}
              {activeTrade && (
                <div id="guideline-markers" className="absolute right-4 top-4 bg-slate-950/95 border border-slate-800 p-2 text-[10px] font-mono rounded space-y-0.5">
                  <span className="text-blue-400 font-bold block uppercase">{activeTrade.type} position open</span>
                  <span>Entry: ${activeTrade.price}</span>
                  <span className="text-emerald-400 block">TP limit: ${activeTrade.tp}</span>
                  <span className="text-rose-450 block">SL guard: ${activeTrade.sl}</span>
                </div>
              )}
            </div>

            {/* Stepping and order management controls */}
            <div id="replay-stepper-panel" className="mt-5 pt-3 border-t border-slate-850 flex flex-wrap gap-3 items-center justify-between">
              <div className="flex gap-2.5">
                <button
                  id="btn-order-buy"
                  onClick={() => handlePlaceOrder("BUY")}
                  className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer pointer-events-auto"
                >
                  BUY Setups (Long)
                </button>
                <button
                  id="btn-order-sell"
                  onClick={() => handlePlaceOrder("SELL")}
                  className="bg-rose-500 hover:bg-rose-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg cursor-pointer pointer-events-auto"
                >
                  SELL Setups (Short)
                </button>
              </div>

              <div id="candle-trigger-controls" className="flex gap-2">
                <button
                  id="btn-step-candle"
                  onClick={handleNextCandle}
                  className="bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold px-4 py-2 rounded-lg flex items-center gap-1.5 pointer-events-auto cursor-pointer"
                >
                  <SkipForward size={14} /> Step Forward 🕯️
                </button>

                <button
                  id="btn-terminate-backtest"
                  onClick={handleResetBacktest}
                  className="bg-slate-805/40 text-rose-400 hover:bg-rose-950 hover:text-white text-xs px-3 py-2 rounded-lg pointer-events-auto cursor-pointer"
                  title="Force Reset backtest"
                >
                  <RotateCcw size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Simulation Live stats assessments */}
          <div id="backtest-live-stats-col" className="bg-slate-950 p-4 border border-slate-850 rounded-xl flex flex-col justify-between">
            <div id="stats-summary-header" className="space-y-4">
              <div className="border-b border-slate-850 pb-2">
                <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">Live simulation stats</span>
                <h4 className="text-sm font-bold text-slate-200">Execution Scorecard</h4>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs">
                  <span className="text-slate-50 relative block font-mono text-[9px] uppercase">Win count</span>
                  <span className="text-base font-bold font-mono text-emerald-400">{winsSims.length}/{totalSims}</span>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded-lg text-xs">
                  <span className="text-slate-50 relative block font-mono text-[9px] uppercase">Sim Win Rate</span>
                  <span className="text-base font-bold font-mono text-blue-400">{Math.round(winRateSims)}%</span>
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-850 p-3 rounded-lg">
                <span className="text-[9px] text-slate-500 font-mono block uppercase">Cumulative Simulation Net</span>
                <span className={`text-base font-bold font-mono ${netPnLSims >= 0 ? "text-emerald-400" : "text-rose-405"}`}>
                  {netPnLSims >= 0 ? "+" : ""}${netPnLSims.toFixed(2)}
                </span>
              </div>
            </div>

            <div id="sim-history-log-scroller" className="border-t border-slate-850 pt-3 mt-4 flex-1 max-h-[160px] overflow-y-auto">
              <span className="text-[10px] font-mono text-slate-500 block mb-1">Trades Log:</span>
              {simulationHistory.length === 0 ? (
                <p className="text-[11px] text-slate-650 italic">Open position and step to execute live simulation history.</p>
              ) : (
                simulationHistory.map((sh, index) => (
                  <div key={index} className="flex justify-between items-center text-xs py-1 border-b border-slate-900 last:border-0">
                    <span className="text-slate-300 font-semibold">{sh.type} Order @ {sh.price}</span>
                    <span className={`font-mono font-bold ${sh.status === "WIN" ? "text-emerald-400" : "text-rose-400"}`}>
                      {sh.status === "WIN" ? "WIN" : "LOSS"} (${sh.pnl})
                    </span>
                  </div>
                ))
              )}
            </div>

            <div id="replay-safety-advise" className="text-[10px] text-slate-600 font-mono border-t border-slate-850 pt-2 flex items-center gap-1.5">
              <AlertTriangle size={12} className="text-slate-650 flex-shrink-0" />
              <span>Backtesting is closed sandbox. Financial safety verified.</span>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
