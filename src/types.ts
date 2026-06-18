export interface Trade {
  id: string;
  symbol: string; // e.g. "XAU/USD", "USOIL"
  type: 'BUY' | 'SELL';
  status: 'WIN' | 'LOSS' | 'BREAK_EVEN';
  profitLoss: number; // profit is +ve, loss is -ve details (or just absolute depending on calc, but it's easier to keep positive for profit, negative for loss, or separate)
  entryDate: string; // YYYY-MM-DD
  entryTime: string; // HH:MM
  setupDate: string; // YYYY-MM-DD
  setupTime: string; // HH:MM
  exitDate?: string; // YYYY-MM-DD
  exitTime?: string; // HH:MM
  size: number; // lots
  entryPrice: number;
  exitPrice: number;
  stopLoss?: number;
  takeProfit?: number;
  riskRewardRatio?: number; // Target or actual
  emotionalState?: string; // calm, anxious, greedy, fomo, revenge, confident
  notes?: string;
  qualityScore?: number; // 1-5 setup quality
  
  // Advanced Coach & Analytics fields
  setupType?: 'Breakout' | 'Pullback' | 'Reversal' | 'Liquidity Sweep' | 'Trend Continuation' | 'Other';
  session?: 'Asian' | 'London' | 'New York' | 'London-NY Overlap' | 'Unknown';
  psychConfidence?: number; // 1-10
  psychStress?: number; // 1-10
  psychFear?: number; // 1-10
  psychFocus?: number; // 1-10
  psychEnergy?: number; // 1-10
  mistakeTags?: ('FOMO' | 'Revenge trade' | 'Overtrading' | 'Early exit' | 'Late entry' | 'Ignored stop loss' | 'News trade' | 'Emotional trade')[];
  screenshotNotes?: string;
  annotations?: string; // JSON representation of marked-up lines, circles, zones
  ruleComplianceResult?: {
    followed: string[];
    broken: string[];
  };
  tradeScore?: number; // Overall quality score derived or evaluated (1-100)
}

export interface Transaction {
  id: string;
  type: 'DEPOSIT' | 'WITHDRAWAL';
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  notes?: string;
}

export interface UserState {
  trades: Trade[];
  transactions: Transaction[];
}

export interface SessionStats {
  tradesCount: number;
  winRate: number;
  totalProfit: number;
  totalLoss: number;
  netResult: number;
  avgRiskReward: number;
}

export interface HourlyStats {
  hour: number; // 0..23
  tradesCount: number;
  winsCount: number;
  lossesCount: number;
  winRate: number;
  netResult: number;
  avgProfit: number;
  avgLoss: number;
}
