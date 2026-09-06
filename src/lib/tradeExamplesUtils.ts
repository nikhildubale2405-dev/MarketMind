import { Trade, Strategy, TradeExampleData, ExecutionQuality, TradeClassification, ScreenshotCoverageStats } from "../types";

/**
 * Calculates Execution Quality (0-100), Quality Level (GOOD, ACCEPTABLE, POOR),
 * and 2D Win/Loss Classification (Good Win 🟢, Bad Win 🟡, Good Loss 🔵, Bad Loss 🔴)
 */
export function calculateExecutionQuality(trade: Trade): TradeExampleData {
  let score = 70; // neutral base score
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const ruleCompliance: string[] = [];
  const mistakes: string[] = trade.mistakeTags || [];

  // Playbook Compliance
  if (trade.playbookCompliance === "YES") {
    score += 20;
    strengths.push("Followed Playbook Strategy rules strictly");
    ruleCompliance.push("Full Playbook Rule Compliance");
  } else if (trade.playbookCompliance === "PARTIALLY") {
    score += 5;
    weaknesses.push(`Partially followed playbook rules ${trade.violatedRule ? `(Violated: ${trade.violatedRule})` : ""}`);
  } else if (trade.playbookCompliance === "NO") {
    score -= 25;
    weaknesses.push(`Violated Playbook Plan: ${trade.violatedRule || "Unplanned execution"}`);
  }

  // Quality score stars (1-5)
  if (trade.qualityScore && trade.qualityScore >= 4) {
    score += (trade.qualityScore - 3) * 5;
    strengths.push(`High Setup Discipline Rating (${trade.qualityScore}/5 ⭐)`);
  } else if (trade.qualityScore && trade.qualityScore <= 2) {
    score -= (3 - trade.qualityScore) * 8;
    weaknesses.push(`Low Discipline Rating (${trade.qualityScore}/5 ⭐)`);
  }

  // Risk Reward Ratio
  if (trade.riskRewardRatio && trade.riskRewardRatio >= 2.0) {
    score += 5;
    strengths.push(`Favorable Risk-to-Reward Ratio (${trade.riskRewardRatio.toFixed(1)}R)`);
  }

  // Psychology: Confidence, Stress, Fear
  if (trade.psychConfidence && trade.psychConfidence >= 7) {
    score += 5;
    strengths.push(`High Mental Confidence (${trade.psychConfidence}/10)`);
  }
  if (trade.psychStress && trade.psychStress >= 7) {
    score -= 8;
    weaknesses.push(`Elevated Stress Level during execution (${trade.psychStress}/10)`);
  }
  if (trade.psychFear && trade.psychFear >= 7) {
    score -= 8;
    weaknesses.push(`Elevated Fear Level during entry (${trade.psychFear}/10)`);
  }

  // Mistake Tags Penalty
  if (mistakes.length > 0) {
    score -= mistakes.length * 12;
    mistakes.forEach(m => weaknesses.push(`Triggered Mistake: ${m}`));
  }

  // Emotional state penalty/bonus
  if (trade.emotionalState === "calm" || trade.emotionalState === "confident") {
    score += 5;
    strengths.push(`Maintained ${trade.emotionalState} psychological state`);
  } else if (trade.emotionalState === "fomo" || trade.emotionalState === "revenge" || trade.emotionalState === "greedy") {
    score -= 10;
    weaknesses.push(`Executed under ${trade.emotionalState.toUpperCase()} emotional pressure`);
  }

  // Clamp score 0 - 100
  const finalScore = Math.max(0, Math.min(100, Math.round(score)));

  // Quality Level
  let quality: ExecutionQuality = "ACCEPTABLE";
  if (finalScore >= 75) {
    quality = "GOOD";
  } else if (finalScore < 48) {
    quality = "POOR";
  }

  // 2D Win/Loss Classification
  let classification: TradeClassification = "BREAKEVEN";
  if (trade.status === "WIN") {
    classification = quality === "POOR" ? "BAD_WIN" : "GOOD_WIN";
  } else if (trade.status === "LOSS") {
    classification = quality === "POOR" ? "BAD_LOSS" : "GOOD_LOSS";
  }

  // AI-like concise lesson synthesis
  let lesson = "";
  if (classification === "GOOD_WIN") {
    lesson = "Textbook execution. Setup, entry timing, and risk management aligned perfectly with your trading plan.";
  } else if (classification === "BAD_WIN") {
    lesson = "Resulted in profit, but involved execution flaws or rule violations. Beware of rewarding bad habits.";
  } else if (classification === "GOOD_LOSS") {
    lesson = "Valid strategy execution. The trade followed your playbook, but hit Stop Loss due to normal probability distribution.";
  } else if (classification === "BAD_LOSS") {
    lesson = "Execution error. The trade violated playbook rules or suffered from emotional triggers. Focus on process discipline.";
  } else {
    lesson = "Breakeven trade outcome. Execution risk was preserved cleanly.";
  }

  return {
    trade,
    executionScore: finalScore,
    quality,
    classification,
    reasons: {
      strengths,
      weaknesses,
      ruleCompliance,
      mistakes
    },
    lesson
  };
}

/**
 * Calculates Screenshot Journaling Coverage Stats across historical trades
 */
export function calculateScreenshotCoverage(trades: Trade[]): ScreenshotCoverageStats {
  const totalTrades = trades.length;
  const tradesWithScreenshots = trades.filter(t => t.images && t.images.length > 0).length;
  const overallCoveragePercent = totalTrades > 0 ? Math.round((tradesWithScreenshots / totalTrades) * 100) : 0;

  const winningTrades = trades.filter(t => t.status === "WIN");
  const winningWithScreenshots = winningTrades.filter(t => t.images && t.images.length > 0).length;
  const winningCoveragePercent = winningTrades.length > 0 ? Math.round((winningWithScreenshots / winningTrades.length) * 100) : 0;

  const losingTrades = trades.filter(t => t.status === "LOSS");
  const losingWithScreenshots = losingTrades.filter(t => t.images && t.images.length > 0).length;
  const losingCoveragePercent = losingTrades.length > 0 ? Math.round((losingWithScreenshots / losingTrades.length) * 100) : 0;

  return {
    totalTrades,
    tradesWithScreenshots,
    overallCoveragePercent,
    winningTradesCount: winningTrades.length,
    winningWithScreenshots,
    winningCoveragePercent,
    losingTradesCount: losingTrades.length,
    losingWithScreenshots,
    losingCoveragePercent
  };
}

/**
 * Extracts Statistical Separators comparing Winning vs Losing Trades
 */
export function extractWinningVsLosingSeparators(trades: Trade[]) {
  const screenshotTrades = trades.filter(t => t.images && t.images.length > 0);
  const winners = screenshotTrades.filter(t => t.status === "WIN");
  const losers = screenshotTrades.filter(t => t.status === "LOSS");

  const calcPct = (arr: Trade[], predicate: (t: Trade) => boolean) => {
    if (arr.length === 0) return 0;
    return Math.round((arr.filter(predicate).length / arr.length) * 100);
  };

  const winningStats = {
    playbookFollowedPct: calcPct(winners, t => t.playbookCompliance === "YES"),
    highDisciplinePct: calcPct(winners, t => (t.qualityScore || 0) >= 4),
    calmOrConfidentPct: calcPct(winners, t => t.emotionalState === "calm" || t.emotionalState === "confident"),
    noMistakesPct: calcPct(winners, t => !t.mistakeTags || t.mistakeTags.length === 0),
    londonOrNySessionPct: calcPct(winners, t => t.session === "London" || t.session === "New York" || t.session === "London-NY Overlap")
  };

  const losingStats = {
    playbookViolatedPct: calcPct(losers, t => t.playbookCompliance === "NO"),
    mistakeTriggeredPct: calcPct(losers, t => !!t.mistakeTags && t.mistakeTags.length > 0),
    fomoOrRevengePct: calcPct(losers, t => t.emotionalState === "fomo" || t.emotionalState === "revenge"),
    lowDisciplinePct: calcPct(losers, t => (t.qualityScore || 0) <= 2),
    highStressOrFearPct: calcPct(losers, t => (t.psychStress || 0) >= 6 || (t.psychFear || 0) >= 6)
  };

  const keyDifferences: string[] = [];
  if (winningStats.playbookFollowedPct >= 50) {
    keyDifferences.push(`${winningStats.playbookFollowedPct}% of winning trades strictly followed Playbook rules.`);
  }
  if (losingStats.mistakeTriggeredPct >= 20) {
    keyDifferences.push(`${losingStats.mistakeTriggeredPct}% of losing trades contained behavioral mistakes (e.g. FOMO, early exit).`);
  }
  if (winningStats.calmOrConfidentPct >= 40) {
    keyDifferences.push(`${winningStats.calmOrConfidentPct}% of winning trades were executed with a calm or confident state.`);
  }
  if (losingStats.fomoOrRevengePct >= 15) {
    keyDifferences.push(`${losingStats.fomoOrRevengePct}% of losing trades suffered from FOMO or revenge trading pressure.`);
  }

  return {
    winningStats,
    losingStats,
    keyDifferences,
    sampleSizes: {
      winning: winners.length,
      losing: losers.length,
      total: screenshotTrades.length
    }
  };
}

/**
 * Automatically selects Ideal Execution vs Common Error examples for a Playbook Strategy
 */
export function selectPlaybookExamples(strategy: Strategy, trades: Trade[]) {
  const stratNameLower = strategy.name.toLowerCase();

  // Find trades matching this strategy
  const stratTrades = trades.filter(t => {
    if (t.playbookStrategyId === strategy.id) return true;
    if (t.setupType && stratNameLower.includes(t.setupType.toLowerCase())) return true;
    if (strategy.preferredInstruments && strategy.preferredInstruments.includes(t.symbol)) return true;
    return false;
  }).map(calculateExecutionQuality);

  // Filter trades that have screenshots
  const screenshotExamples = stratTrades.filter(ex => ex.trade.images && ex.trade.images.length > 0);

  // Ideal Examples: Good Wins / Good Losses (highest execution score)
  const idealExamples = screenshotExamples
    .filter(ex => ex.quality === "GOOD" || ex.trade.playbookCompliance === "YES")
    .sort((a, b) => b.executionScore - a.executionScore)
    .slice(0, 3)
    .map(ex => ex.trade);

  // Common Mistakes / Failure Examples: Bad Losses / Bad Wins (lowest execution score)
  const mistakeExamples = screenshotExamples
    .filter(ex => ex.quality === "POOR" || ex.trade.status === "LOSS" || ex.trade.playbookCompliance === "NO")
    .sort((a, b) => a.executionScore - b.executionScore)
    .slice(0, 3)
    .map(ex => ex.trade);

  return {
    idealExamples,
    mistakeExamples
  };
}
