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
  images?: string[]; // Up to 2 base64 image URLs / strings
  ruleComplianceResult?: {
    followed: string[];
    broken: string[];
  };
  tradeScore?: number; // Overall quality score derived or evaluated (1-100)

  // My Edge & Playbook Integration
  playbookStrategyId?: string;
  playbookCompliance?: 'YES' | 'PARTIALLY' | 'NO';
  violatedRule?: string;
  tradeFeatures?: TradeFeatures;
}

export interface TradeFeatures {
  tradeId: string;
  instrument?: string;
  direction?: 'BUY' | 'SELL';
  session?: string;
  setupFamily?: string;
  setupVariant?: string;
  marketCondition?: string[];
  liquidityEvent?: string[];
  structureEvent?: string[];
  confirmationEvent?: string[];
  entryTrigger?: string;
  entryTiming?: string;
  exitReason?: string;
  stopPlacement?: string;
  targetLogic?: string;
  emotionalState?: string[];
  cognitiveState?: string[];
  mistakes?: string[];
  confidence?: number;
  descriptionQuality?: number;
  tags?: string[];
  aiExtracted: boolean;
  extractionVersion: string;
}

export interface StrategyEvidence {
  tradeCount: number;
  wins: number;
  losses: number;
  winRate: number; // 0..100
  expectancyR: number; // e.g. +0.91R
  profitFactor: number;
  netPnL: number;
  avgWin: number;
  avgLoss: number;
  maxDrawdown?: number;
  sampleCoverage?: {
    descriptionCoverage: number;
    setupCoverage: number;
    emotionCoverage: number;
    riskDataCoverage: number;
  };
}

export interface StrategyVersion {
  version: number;
  createdAt: string;
  changeSummary: string;
  conditions: string[];
  entryRules: string[];
  riskRules: string[];
  avoidConditions: string[];
  evidenceSnapshot: StrategyEvidence;
}

export interface Strategy {
  id: string;
  userId?: string;
  name: string;
  description: string;
  status: 'candidate' | 'active' | 'archived' | 'rejected';
  confidenceLevel: 'insufficient' | 'exploratory' | 'developing' | 'established';
  evidence: StrategyEvidence;
  preferredInstruments: string[];
  preferredSessions: string[];
  conditions: string[];
  entryRules: string[];
  exitRules?: string[];
  riskRules: string[];
  avoidConditions: string[];
  observedPatterns: string[];
  inferredPatterns: string[];
  recommendations: string[];
  weaknesses: string[];
  limitations: string[];
  sourceTradeIds: string[];
  checklist: string[];
  version: number;
  history?: StrategyVersion[];
  createdAt: string;
  updatedAt: string;
}

export interface DataSufficiency {
  tradeCount: number;
  minimumRequired: number; // default 30
  level: 'insufficient' | 'exploratory' | 'developing' | 'established';
  descriptionCoveragePercent: number;
  setupCoveragePercent: number;
  emotionCoveragePercent: number;
  riskDataCoveragePercent: number;
  missingFields: string[];
}

export interface EdgeAnalysisResult {
  analysisId: string;
  analysisDate: string;
  dataSufficiency: DataSufficiency;
  topSetups: {
    setupName: string;
    tradeCount: number;
    winRate: number;
    expectancyR: number;
    profitFactor: number;
    confidenceLevel: 'insufficient' | 'exploratory' | 'developing' | 'established';
    sampleCoverage: number;
    evidenceSummary: string;
  }[];
  observedPatterns: string[];
  inferredPatterns: string[];
  strategyCandidates: Strategy[];
  dataLimitations: string[];
  journalQualityScore: number;
  journalImprovementTips: string[];
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
  strategies?: Strategy[];
  lastEdgeAnalysis?: EdgeAnalysisResult;
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

