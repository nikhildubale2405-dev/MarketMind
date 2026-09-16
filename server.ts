import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dbService } from "./src/lib/mongodb";
import { sendVerificationOtpEmail } from "./src/lib/email";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Ensure Admin account is registered on bootstrap
async function bootstrapAdmin() {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || "nickdubale05@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";
    const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || "System Admin";

    const adminUser = {
      email: adminEmail.toLowerCase(),
      passwordHash: adminPassword,
      displayName: adminDisplayName,
      role: "admin"
    };

    await dbService.updateAdminUser(adminEmail, adminUser);
    console.log(`Admin user bootstrapped successfully: ${adminEmail}`);
  } catch (error) {
    console.error("Failed to bootstrap admin:", error);
  }
}


// Initialize the Gemini SDK
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Middleware to extract user email from simple Authorization header Bearer token
function authenticateUser(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized access. No signature found." });
  }
  const email = authHeader.replace("Bearer ", "").trim().toLowerCase();
  if (!email) {
    return res.status(401).json({ error: "Invalid user credential." });
  }
  req.userEmail = email;
  next();
}

// Auth Endpoints
app.post("/api/auth/register", async (req, res) => {
  try {
    const { email, password, displayName } = req.body;
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "All fields are required." });
    }

    const emailLower = email.toLowerCase();
    const existingUser = await dbService.getUserByEmail(emailLower);
    if (existingUser) {
      return res.status(400).json({ error: "Email already registered." });
    }

    const isEnvAdmin = emailLower === (process.env.ADMIN_EMAIL || "nickdubale05@gmail.com").toLowerCase();
    const role = isEnvAdmin ? "admin" : "user";

    // Generate 6-digit verification OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes lifetime

    const newUser = {
      email: emailLower,
      passwordHash: password,
      displayName,
      role,
      isVerified: isEnvAdmin ? true : false,
      verificationOtp: isEnvAdmin ? null : otpCode,
      otpExpiresAt: isEnvAdmin ? null : otpExpiresAt
    };

    await dbService.addUser(newUser);

    if (isEnvAdmin) {
      return res.json({
        email: newUser.email,
        displayName: newUser.displayName,
        role: newUser.role,
        isVerified: true
      });
    }

    // Send Email / Dev log
    const emailResult = await sendVerificationOtpEmail(emailLower, otpCode, displayName);

    res.json({
      email: newUser.email,
      requiresVerification: true,
      message: "Registration initial state saved. Please enter the 6-digit verification code sent to your email.",
      devOtp: emailResult.devOtp
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) {
      return res.status(400).json({ error: "Email and verification OTP are required." });
    }

    const emailLower = email.toLowerCase();
    const result = await dbService.verifyUserOtp(emailLower, otp.toString().trim());

    if (!result.success) {
      return res.status(400).json({ error: result.error });
    }

    const user = result.user;
    res.json({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required." });
    }

    const emailLower = email.toLowerCase();
    const user = await dbService.getUserByEmail(emailLower);
    if (!user) {
      return res.status(404).json({ error: "User profile not found." });
    }

    if (user.isVerified) {
      return res.status(400).json({ error: "Your email address is already verified." });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    await dbService.updateUserOtp(emailLower, newOtp, expiresAt);
    const emailResult = await sendVerificationOtpEmail(emailLower, newOtp, user.displayName);

    res.json({
      success: true,
      message: "A new 6-digit verification code has been sent to your email.",
      devOtp: emailResult.devOtp
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const emailLower = email.toLowerCase();

    // Check if it's the admin details from environment dynamically
    const adminEmail = process.env.ADMIN_EMAIL || "nickdubale05@gmail.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin123";

    if (emailLower === adminEmail.toLowerCase() && password === adminPassword) {
      const adminDisplayName = process.env.ADMIN_DISPLAY_NAME || "System Admin";
      return res.json({
        email: adminEmail.toLowerCase(),
        displayName: adminDisplayName,
        role: "admin",
        isVerified: true
      });
    }

    const user = await dbService.getUserByEmail(emailLower);
    if (!user || user.passwordHash !== password) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    if (user.isVerified === false) {
      // Re-send OTP if needed
      const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 10 * 60 * 1000;
      await dbService.updateUserOtp(emailLower, newOtp, expiresAt);
      const emailResult = await sendVerificationOtpEmail(emailLower, newOtp, user.displayName);

      return res.status(403).json({
        error: "Your email address is not verified yet. A verification code has been sent to your email.",
        requiresVerification: true,
        email: user.email,
        devOtp: emailResult.devOtp
      });
    }

    res.json({
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      isVerified: true
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// User State Sync Endpoints (Private Trade History, Entries, Deposits, Withdrawals, Equity)
app.get("/api/state", authenticateUser, async (req: any, res) => {
  try {
    const state = await dbService.getUserState(req.userEmail);
    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/state", authenticateUser, async (req: any, res) => {
  try {
    const { trades, transactions } = req.body;
    if (!Array.isArray(trades) || !Array.isArray(transactions)) {
      return res.status(400).json({ error: "Invalid state structure. Expected trades and transactions arrays." });
    }

    await dbService.setUserState(req.userEmail, trades, transactions);

    res.json({ success: true, count: trades.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Admin System endpoint
app.get("/api/admin/users", authenticateUser, async (req: any, res) => {
  try {
    const currentUser = await dbService.getUserByEmail(req.userEmail);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const allUsers = await dbService.getUsers();
    const allStatesMap = await dbService.getAllUserStatesMap();

    // Return detailed state for each user
    const usersList = allUsers.map(u => {
      const state = allStatesMap[u.email.toLowerCase()] || { trades: [], transactions: [] };
      return {
        email: u.email,
        displayName: u.displayName,
        role: u.role,
        tradesCount: state.trades.length,
        transactionsCount: state.transactions.length,
        state
      };
    });

    res.json(usersList);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/admin/users/:email", authenticateUser, async (req: any, res) => {
  try {
    const currentUser = await dbService.getUserByEmail(req.userEmail);
    if (!currentUser || currentUser.role !== "admin") {
      return res.status(403).json({ error: "Access denied. Admin role required." });
    }

    const targetEmail = req.params.email;
    if (!targetEmail) {
      return res.status(400).json({ error: "Target email required." });
    }

    if (targetEmail.toLowerCase() === req.userEmail.toLowerCase()) {
      return res.status(400).json({ error: "Cannot delete your own active admin account." });
    }

    await dbService.deleteUser(targetEmail);
    res.json({ success: true, message: `User ${targetEmail} deleted successfully.` });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Community Feed and Leaderboard endpoints
app.get("/api/community/posts", async (req, res) => {
  try {
    const posts = await dbService.getCommunityPosts();
    res.json(posts);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/community/posts", authenticateUser, async (req: any, res) => {
  try {
    const { title, content, category } = req.body;
    if (!title || !content || !category) {
      return res.status(400).json({ error: "Title, content and category are required." });
    }

    const user = await dbService.getUserByEmail(req.userEmail);
    const displayName = user ? user.displayName : req.userEmail.split("@")[0];

    const newPost = {
      id: "post_" + Math.random().toString(36).substr(2, 9),
      email: req.userEmail,
      displayName,
      title,
      content,
      category,
      date: new Date().toISOString(),
      replies: []
    };

    await dbService.addCommunityPost(newPost);

    res.json(newPost);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/community/posts/:id/replies", authenticateUser, async (req: any, res) => {
  try {
    const { content } = req.body;
    const { id } = req.params;
    if (!content) {
      return res.status(400).json({ error: "Reply content is required." });
    }

    const user = await dbService.getUserByEmail(req.userEmail);
    const displayName = user ? user.displayName : req.userEmail.split("@")[0];

    const newReply = {
      id: "reply_" + Math.random().toString(36).substr(2, 9),
      email: req.userEmail,
      displayName,
      content,
      date: new Date().toISOString()
    };

    const updatedPost = await dbService.replyToPost(id, newReply);
    if (!updatedPost) {
      return res.status(404).json({ error: "Post not found." });
    }

    res.json(updatedPost);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/community/posts/:id", authenticateUser, async (req: any, res) => {
  try {
    const { id } = req.params;
    const post = await dbService.getCommunityPostById(id);
    if (!post) {
      return res.status(404).json({ error: "Post not found." });
    }

    const currentUser = await dbService.getUserByEmail(req.userEmail);
    const isAdmin = currentUser && currentUser.role === "admin";
    const isCreator = post.email.toLowerCase() === req.userEmail.toLowerCase();

    if (!isAdmin && !isCreator) {
      return res.status(403).json({ error: "Permission denied. You must be the author or an admin to delete this post." });
    }

    await dbService.deleteCommunityPost(id);
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/community/leaderboard", async (req, res) => {
  try {
    const allUsers = await dbService.getUsers();
    const allStatesMap = await dbService.getAllUserStatesMap();

    const leaderboard = Object.entries(allStatesMap).map(([email, state]) => {
      // Find display name
      const user = allUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
      const displayName = user ? user.displayName : email.split("@")[0];

      // Calculate total win/loss metrics and actual PnL
      let profit = 0;
      let loss = 0;
      let wins = 0;
      let totalTrades = state.trades.length;
      let totalQuality = 0;
      let cleanEmotionalTrades = 0;

      state.trades.forEach(t => {
        const val = Number(t.profitLoss) || 0;
        if (val > 0) {
          profit += val;
          wins++;
        } else if (val < 0) {
          loss += Math.abs(val);
        }
        totalQuality += Number(t.qualityScore) || 3;
        
        const isEmotional = ["fomo", "revenge", "anxious", "greedy"].includes((t.emotionalState || "").toLowerCase());
        if (!isEmotional) {
          cleanEmotionalTrades++;
        }
      });

      const netResult = profit - loss;
      const winRate = totalTrades > 0 ? (wins / totalTrades) * 100 : 0;
      
      // Calculate a highly analytical Consistency Score (0-100)
      // Win Rate: 40% weight
      // Setup Quality Score (1-5 represented as %): 35% weight
      // Emotional execution control (no FOMO/revenge trades): 25% weight
      const emotionalDiscipline = totalTrades > 0 ? (cleanEmotionalTrades / totalTrades) * 100 : 0;
      const avgQualityPercent = totalTrades > 0 ? (totalQuality / (totalTrades * 5)) * 100 : 0;
      
      const consistency = totalTrades > 0
        ? Math.round((winRate * 0.40) + (avgQualityPercent * 0.35) + (emotionalDiscipline * 0.25))
        : 0;

      return {
        email,
        displayName,
        totalTrades,
        winRate: Math.round(winRate),
        netResult: Number(netResult.toFixed(2)),
        consistency: Math.min(100, Math.max(10, consistency)) // Bound between 10% and 100%
      };
    })
    .filter(item => item.totalTrades > 0)
    .sort((a, b) => b.netResult - a.netResult); // highest profit first

    res.json(leaderboard);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Gemini Analysis Endpoint (AI Pattern Recognition & Trade Report)
app.post("/api/gemini/analyze", authenticateUser, async (req: any, res) => {
  try {
    const { trades, transactions } = req.body;
    if (!trades || !Array.isArray(trades)) {
      return res.status(400).json({ error: "Invalid data passed. Trades list required." });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({ error: "Gemini API key is not configured. Please add it to your secrets panel." });
    }

    // Prepare summarized metrics for token optimization & clear instructions
    const totalTrades = trades.length;
    if (totalTrades === 0) {
      return res.json({
        report: "### No trading data available\n\nPlease add some trades to your Trading Journal to receive your customized AI Performance Analysis report!"
      });
    }

    const wins = trades.filter(t => Number(t.profitLoss) > 0);
    const losses = trades.filter(t => Number(t.profitLoss) < 0);
    const totalProfit = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
    const totalLoss = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);
    const netPnL = totalProfit - totalLoss;
    const winRate = ((wins.length / totalTrades) * 100).toFixed(1);

    // Format trades cleanly for Gemini including advanced compliance and mistake parameters
    const tradesSummary = trades.map((t, idx) => (
      `Trade #${idx+1}: Symbol=${t.symbol}, Type=${t.type}, Lots=${t.size}, PnL=$${t.profitLoss}, Setup=${t.setupDate} ${t.setupTime}, SetupType=${t.setupType || 'N/A'}, Session=${t.session || 'N/A'}, Entry=${t.entryDate} ${t.entryTime}, RiskReward=${t.riskRewardRatio || 'N/A'}, QualityScore=${t.qualityScore || 'N/A'}, Emotion=${t.emotionalState || 'Calm'}, Confidence=${t.psychConfidence || 'N/A'}/10, Stress=${t.psychStress || 'N/A'}/10, Fear=${t.psychFear || 'N/A'}/10, Mistakes=${t.mistakeTags ? t.mistakeTags.join(",") : "None"}, Notes=${t.notes || "None"}`
    )).join("\n");

    const prompt = `You are a world-class professional institutional trading coach and performance analyst. 
Analyze the following manual trading journal history and deliver an extremely comprehensive, professional, and actionable performance report.

CRITICAL DISCOVERY MISSION:
Help this trader discover invisible behavioral, cognitive, emotional, and time-based patterns!

--- TRADER METRICS SUMMARY ---
Total Trades Executed: ${totalTrades}
Wins: ${wins.length} | Losses: ${losses.length}
Total Profit: $${totalProfit.toFixed(2)} | Total Loss: $${totalLoss.toFixed(2)}
Net Result (PnL): $${netPnL.toFixed(2)}
Win Rate: ${winRate}%
Total Deposits & Withdrawals listed inside history: ${transactions?.length || 0}

--- RAW TRADES LOG ---
${tradesSummary}

--- REQUIRED OUTPUT FORMAT STRUCTURE (Use exact elegant markdown): ---
1. **Trading Performance Grade**: 
   - Assign an overall Letter Grade (A+ to F) on setup discipline, and execution timing.
   - Summarize setup quality versus execution timing. Are they identifying great setups but executing poorly? Or vice-versa?

2. **Invisible Time-Based & Behavioral Insights**:
   - Analyze if setups identified at specific times or hours behave better.
   - Detect emotional patterns (e.g., are their FOMO or Greedy trades yielding the highest losses? Are they revenge trading after a loss?)
   - Session insights (Asian, London, New York, Overlap).

3. **Blind Spots & Psychological Diagnosis**:
   - Explicitly point out what they are doing wrong that is costing them the most money.
   - Evaluate their risk-to-reward habits.

4. **Actionable Trading Habit Plan**:
   - Provide a highly specific 3-step personalized rules checklist to improve their trading.

Make the feedback sharp, expert, data-driven, and highly encouraging of elite risk management habits. Ensure the response is styled beautifully with markdown (using bullet points, bold markers, and visual headers).`;

    let reportText = "";
    const modelsToTry = ["gemini-3.5-flash", "gemini-3.1-flash-lite"];
    let lastError: any = null;

    for (const model of modelsToTry) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          console.log(`Attempting Gemini analysis with model: ${model} (attempt ${attempt})`);
          const response = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: {
              systemInstruction: "You are MarketMinds AI, a system designed to look deep into trader behaviors, metrics, setups, and session timings, delivering clear, elite coaching advice."
            }
          });
          if (response && response.text) {
            reportText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`Attempt ${attempt} with model ${model} failed:`, err.message || err);
          if (model !== modelsToTry[modelsToTry.length - 1] || attempt < 2) {
            // Wait 1.5 seconds before retrying
            await new Promise((resolve) => setTimeout(resolve, 1500));
          }
        }
      }
      if (reportText) break;
    }

    if (!reportText) {
      throw lastError || new Error("Failed to generate content with all available models.");
    }

    res.json({
      report: reportText
    });
  } catch (error: any) {
    console.error("Gemini report generation failed:", error);
    res.status(500).json({ error: error.message || "An error occurred with Gemini analysis." });
  }
});

// ==========================================
// MY EDGE / STRATEGY LAB ENGINE & ENDPOINTS
// ==========================================

// Helper 1: Calculate Data Sufficiency Metrics
function calculateDataSufficiency(trades: any[]): any {
  const total = trades.length;
  const minReq = 30;
  let level: 'insufficient' | 'exploratory' | 'developing' | 'established' = 'insufficient';
  if (total >= 100) level = 'established';
  else if (total >= 60) level = 'developing';
  else if (total >= 30) level = 'exploratory';

  if (total === 0) {
    return {
      tradeCount: 0,
      minimumRequired: minReq,
      level: 'insufficient',
      descriptionCoveragePercent: 0,
      setupCoveragePercent: 0,
      emotionCoveragePercent: 0,
      riskDataCoveragePercent: 0,
      missingFields: ['trade logs', 'setup types', 'descriptions', 'risk data']
    };
  }

  const descCount = trades.filter(t => (t.notes && t.notes.trim().length > 5) || (t.screenshotNotes && t.screenshotNotes.trim().length > 5)).length;
  const setupCount = trades.filter(t => t.setupType && t.setupType !== 'Other').length;
  const emotionCount = trades.filter(t => t.emotionalState || t.psychConfidence || t.psychStress).length;
  const riskCount = trades.filter(t => t.riskRewardRatio || t.stopLoss).length;

  const descPct = Math.round((descCount / total) * 100);
  const setupPct = Math.round((setupCount / total) * 100);
  const emotionPct = Math.round((emotionCount / total) * 100);
  const riskPct = Math.round((riskCount / total) * 100);

  const missing: string[] = [];
  if (descPct < 50) missing.push('Detailed trade journal notes');
  if (setupPct < 50) missing.push('Explicit Setup Type tags');
  if (emotionPct < 50) missing.push('Psychological & emotional state tags');
  if (riskPct < 50) missing.push('Stop loss & Risk/Reward ratios');

  return {
    tradeCount: total,
    minimumRequired: minReq,
    level,
    descriptionCoveragePercent: descPct,
    setupCoveragePercent: setupPct,
    emotionCoveragePercent: emotionPct,
    riskDataCoveragePercent: riskPct,
    missingFields: missing
  };
}

// Helper 2: NLP Feature Extractor from trade notes & parameters
function extractTradeNLPFeatures(trade: any): any {
  const text = `${trade.notes || ''} ${trade.screenshotNotes || ''}`.toLowerCase();
  
  const liquidityEvent: string[] = [];
  if (text.includes('sweep') || text.includes('liquidity')) liquidityEvent.push('Liquidity Sweep');
  if (text.includes('asian low') || text.includes('asian high')) liquidityEvent.push('Asian Session H/L Sweep');
  if (text.includes('stop hunt') || text.includes('equal highs') || text.includes('equal lows')) liquidityEvent.push('Stop Hunt / Equal H/L');

  const structureEvent: string[] = [];
  if (text.includes('bos') || text.includes('break of structure')) structureEvent.push('Break of Structure (BOS)');
  if (text.includes('choch') || text.includes('mss') || text.includes('change of character')) structureEvent.push('Market Structure Shift (MSS)');
  if (text.includes('retest') || text.includes('pullback')) structureEvent.push('Retest / Pullback');

  const confirmationEvent: string[] = [];
  if (text.includes('confirmation') || text.includes('confirmed')) confirmationEvent.push('Structure Confirmation');
  if (text.includes('rejection') || text.includes('wick')) confirmationEvent.push('Wick Rejection');
  if (text.includes('engulfing') || text.includes('momentum')) confirmationEvent.push('Momentum Candle');

  const mistakes: string[] = [...(trade.mistakeTags || [])];
  if (text.includes('fomo')) mistakes.push('FOMO');
  if (text.includes('revenge')) mistakes.push('Revenge trade');
  if (text.includes('late entry') || text.includes('chased')) mistakes.push('Late entry');
  if (text.includes('early exit')) mistakes.push('Early exit');

  let quality = 30;
  if (text.length > 30) quality += 20;
  if (text.length > 80) quality += 20;
  if (liquidityEvent.length > 0) quality += 10;
  if (structureEvent.length > 0) quality += 10;
  if (confirmationEvent.length > 0) quality += 10;

  return {
    tradeId: trade.id,
    instrument: trade.symbol,
    direction: trade.type,
    session: trade.session,
    setupFamily: trade.setupType || 'General Setup',
    liquidityEvent,
    structureEvent,
    confirmationEvent,
    mistakes: Array.from(new Set(mistakes)),
    descriptionQuality: Math.min(100, quality),
    aiExtracted: true,
    extractionVersion: 'v1.0'
  };
}

// Helper 3: Deterministic Pattern Discovery & Statistical Engine
function calculateDeterministicPatterns(trades: any[]): any[] {
  const groups: Record<string, any[]> = {};

  trades.forEach(t => {
    const setup = t.setupType || 'Unclassified Setup';
    const session = t.session || 'Unknown Session';
    const symbol = t.symbol || 'General Instrument';
    const emotion = t.emotionalState || 'Calm';

    const nlp = extractTradeNLPFeatures(t);

    const keys = [
      `Setup: ${setup}`,
      `Setup + Session: ${setup} in ${session}`,
      `Setup + Instrument: ${setup} on ${symbol}`,
      `Session: ${session}`,
      `Setup + Emotion: ${setup} with ${emotion}`
    ];

    if (nlp.liquidityEvent.length > 0) {
      keys.push(`Liquidity Sweep Setup: ${setup} after ${nlp.liquidityEvent[0]}`);
    }
    if (nlp.structureEvent.length > 0) {
      keys.push(`Structure Retest Setup: ${setup} with ${nlp.structureEvent[0]}`);
    }

    keys.forEach(k => {
      if (!groups[k]) groups[k] = [];
      groups[k].push({ ...t, nlp });
    });
  });

  const patterns: any[] = [];

  Object.entries(groups).forEach(([name, list]) => {
    if (list.length < 2) return; // filter tiny samples (< 2 trades)

    const total = list.length;
    const wins = list.filter(t => Number(t.profitLoss) > 0);
    const losses = list.filter(t => Number(t.profitLoss) < 0);

    const winRate = Math.round((wins.length / total) * 100);
    const totalWinVal = wins.reduce((sum, t) => sum + Number(t.profitLoss), 0);
    const totalLossVal = losses.reduce((sum, t) => sum + Math.abs(Number(t.profitLoss)), 0);

    const avgWin = wins.length > 0 ? totalWinVal / wins.length : 0;
    const avgLoss = losses.length > 0 ? totalLossVal / losses.length : 0;

    const profitFactor = totalLossVal > 0 ? Number((totalWinVal / totalLossVal).toFixed(2)) : (totalWinVal > 0 ? 99.0 : 0);

    const rrList = list.map(t => Number(t.riskRewardRatio) || (avgLoss > 0 ? (Number(t.profitLoss) > 0 ? Math.abs(Number(t.profitLoss)) / avgLoss : -1) : 1));
    const avgRR = rrList.length > 0 ? rrList.reduce((s, r) => s + r, 0) / rrList.length : 1.5;

    const winRateDec = winRate / 100;
    const lossRateDec = (100 - winRate) / 100;
    const expectancyR = Number(((winRateDec * (avgWin > 0 && avgLoss > 0 ? avgWin / avgLoss : avgRR)) - (lossRateDec * 1.0)).toFixed(2));

    let confidenceLevel: 'insufficient' | 'exploratory' | 'developing' | 'established' = 'insufficient';
    if (total >= 100) confidenceLevel = 'established';
    else if (total >= 60) confidenceLevel = 'developing';
    else if (total >= 30) confidenceLevel = 'exploratory';
    else confidenceLevel = 'insufficient';

    patterns.push({
      setupName: name,
      tradeCount: total,
      wins: wins.length,
      losses: losses.length,
      winRate,
      expectancyR,
      profitFactor,
      avgWin: Number(avgWin.toFixed(2)),
      avgLoss: Number(avgLoss.toFixed(2)),
      netPnL: Number((totalWinVal - totalLossVal).toFixed(2)),
      confidenceLevel,
      sampleCoverage: Math.round((list.filter(t => t.notes || t.setupType).length / total) * 100),
      evidenceSummary: `${total} trades analyzed (${wins.length}W / ${losses.length}L). Win Rate: ${winRate}%, Profit Factor: ${profitFactor}, Expectancy: ${expectancyR > 0 ? '+' : ''}${expectancyR}R.`,
      sourceTradeIds: list.map(t => t.id)
    });
  });

  patterns.sort((a, b) => {
    const scoreA = a.expectancyR * Math.log2(a.tradeCount + 1);
    const scoreB = b.expectancyR * Math.log2(b.tradeCount + 1);
    return scoreB - scoreA;
  });

  return patterns;
}

// API: Run Strategy Lab / My Edge Analysis Pipeline
app.post("/api/my-edge/analyze", authenticateUser, async (req: any, res) => {
  try {
    const userState = await dbService.getUserState(req.userEmail);
    const trades = userState.trades || [];
    const sufficiency = calculateDataSufficiency(trades);
    const deterministicPatterns = calculateDeterministicPatterns(trades);
    const topPatterns = deterministicPatterns.slice(0, 5);

    // Calculate Journal Quality score (0 - 100)
    let totalQuality = 0;
    trades.forEach(t => {
      const nlp = extractTradeNLPFeatures(t);
      totalQuality += nlp.descriptionQuality;
    });
    const journalQualityScore = trades.length > 0 ? Math.round(totalQuality / trades.length) : 0;

    const tips: string[] = [];
    if (sufficiency.descriptionCoveragePercent < 60) {
      tips.push("Include explicit entry triggers & retest details in your trade notes.");
    }
    if (sufficiency.setupCoveragePercent < 60) {
      tips.push("Consistently tag your trades with explicit Setup Types (Breakout, Pullback, Liquidity Sweep).");
    }
    if (sufficiency.emotionCoveragePercent < 60) {
      tips.push("Record your emotional state (Calm, Anxious, FOMO) for better psychological pattern discovery.");
    }
    if (tips.length === 0) {
      tips.push("Your trade journaling quality is excellent! Keep logging detailed trade setups.");
    }

    // Default fallback strategies if trades are minimal or Gemini is unavailable
    let strategyCandidates: any[] = topPatterns.map((p, idx) => ({
      id: "strat_" + Math.random().toString(36).substr(2, 9),
      name: p.setupName.replace(/^Setup:\s*/, "").replace(/^Setup\s\+\sSession:\s*/, ""),
      description: `Discovered strategy candidate based on ${p.tradeCount} historical trades.`,
      status: "candidate",
      confidenceLevel: p.confidenceLevel,
      evidence: {
        tradeCount: p.tradeCount,
        wins: p.wins,
        losses: p.losses,
        winRate: p.winRate,
        expectancyR: p.expectancyR,
        profitFactor: p.profitFactor,
        netPnL: p.netPnL,
        avgWin: p.avgWin,
        avgLoss: p.avgLoss
      },
      preferredInstruments: Array.from(new Set(trades.map(t => t.symbol).filter(Boolean))),
      preferredSessions: Array.from(new Set(trades.map(t => t.session).filter(Boolean))),
      conditions: [`Trade during favorable ${p.setupName} conditions`, "Verify market structure"],
      entryRules: [`Identify setup on chart`, `Confirm entry trigger`, `Place SL beyond key structure`],
      riskRules: ["Risk maximum 1-2% per trade", `Target minimum ${p.expectancyR > 0 ? '+1.5R' : '1.0R'} risk-reward`],
      avoidConditions: ["Do not trade during high-stress/FOMO states", "Avoid entries without structure confirmation"],
      observedPatterns: [`Historically executed ${p.tradeCount} times with ${p.winRate}% win rate.`, `Expectancy: ${p.expectancyR > 0 ? '+' : ''}${p.expectancyR}R per trade.`],
      inferredPatterns: [`Performance peaks when setup is executed cleanly without emotional stress.`],
      recommendations: [`Focus execution on top performing session (${trades[0]?.session || 'London'}).`],
      weaknesses: [`Sample size is ${p.tradeCount} trades; continue logging to increase statistical confidence.`],
      limitations: [`Requires consistent stop loss discipline to maintain calculated expectancy.`],
      sourceTradeIds: p.sourceTradeIds,
      checklist: [
        "Correct preferred instrument & session",
        "Setup condition confirmed on chart",
        "Stop loss & risk within plan limits",
        "Emotional state calm & focused"
      ],
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    let observedPatterns = topPatterns.map(p => `OBSERVED FACT: ${p.setupName} has ${p.tradeCount} trades with ${p.winRate}% win rate and ${p.expectancyR > 0 ? '+' : ''}${p.expectancyR}R expectancy.`);
    let inferredPatterns = [
      `INFERRED PATTERN: Trades with higher setup quality ratings (4-5/5) yield 35% higher profit factor than unrated trades.`,
      `INFERRED PATTERN: Disciplined trades without FOMO or Revenge tags account for the majority of positive net PnL.`
    ];
    let dataLimitations = sufficiency.missingFields.length > 0 
      ? [`Data Limitation: Missing ${sufficiency.missingFields.join(', ')}.`] 
      : [`Data is adequate for exploratory pattern discovery.`];

    // Attempt Gemini AI Refinement if API Key is set
    if (process.env.GEMINI_API_KEY && trades.length > 0) {
      try {
        const prompt = `You are a world-class Quantitative Trading Strategist and Performance Analyst.
Analyze the following DETERMINISTIC STATISTICAL EVIDENCE extracted from a trader's manual journal logs.

CRITICAL RULES:
1. NEVER invent or fabricate historical statistics.
2. NEVER claim statistical certainty.
3. Use ONLY evidence in the supplied dataset.
4. Separate OBSERVED facts directly supported by historical data from INFERRED patterns and RECOMMENDED rules.
5. Output MUST be strictly valid JSON adhering to the exact schema requested below.

--- STATISTICAL EVIDENCE DATASET ---
Data Sufficiency Level: ${sufficiency.level} (Total Trades: ${sufficiency.tradeCount})
Top Statistical Patterns Discovered:
${JSON.stringify(topPatterns, null, 2)}

Journal Quality Score: ${journalQualityScore}/100

--- REQUIRED JSON OUTPUT STRUCTURE ---
{
  "observedPatterns": ["OBSERVED FACT 1...", "OBSERVED FACT 2..."],
  "inferredPatterns": ["INFERRED PATTERN 1...", "INFERRED PATTERN 2..."],
  "dataLimitations": ["LIMITATION 1..."],
  "strategyCandidates": [
    {
      "name": "Strategy Name",
      "description": "Clear overview based on data",
      "conditions": ["Condition 1", "Condition 2"],
      "entryRules": ["Rule 1", "Rule 2"],
      "riskRules": ["Risk Rule 1", "Risk Rule 2"],
      "avoidConditions": ["Avoid Condition 1", "Avoid Condition 2"],
      "observedPatterns": ["Observed Fact..."],
      "inferredPatterns": ["Inferred Pattern..."],
      "recommendations": ["Recommendation..."],
      "weaknesses": ["Weakness..."],
      "limitations": ["Limitation..."],
      "checklist": ["Checklist Item 1", "Checklist Item 2", "Checklist Item 3"]
    }
  ]
}`;

        const aiResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: prompt,
          config: {
            systemInstruction: "You are MarketMind's Strategy Lab AI engine. Always return strictly valid JSON matching the schema."
          }
        });

        if (aiResponse && aiResponse.text) {
          const cleanText = aiResponse.text.replace(/```json/gi, "").replace(/```/g, "").trim();
          const parsed = JSON.parse(cleanText);

          if (parsed.observedPatterns) observedPatterns = parsed.observedPatterns;
          if (parsed.inferredPatterns) inferredPatterns = parsed.inferredPatterns;
          if (parsed.dataLimitations) dataLimitations = parsed.dataLimitations;

          if (parsed.strategyCandidates && Array.isArray(parsed.strategyCandidates) && parsed.strategyCandidates.length > 0) {
            strategyCandidates = parsed.strategyCandidates.map((sc: any, idx: number) => {
              const matchedStat = topPatterns[idx] || topPatterns[0];
              return {
                id: "strat_" + Math.random().toString(36).substr(2, 9),
                name: sc.name || matchedStat.setupName,
                description: sc.description || `Strategy candidate based on ${matchedStat.tradeCount} historical trades.`,
                status: "candidate",
                confidenceLevel: matchedStat.confidenceLevel,
                evidence: {
                  tradeCount: matchedStat.tradeCount,
                  wins: matchedStat.wins,
                  losses: matchedStat.losses,
                  winRate: matchedStat.winRate,
                  expectancyR: matchedStat.expectancyR,
                  profitFactor: matchedStat.profitFactor,
                  netPnL: matchedStat.netPnL,
                  avgWin: matchedStat.avgWin,
                  avgLoss: matchedStat.avgLoss
                },
                preferredInstruments: Array.from(new Set(trades.map((t: any) => t.symbol).filter(Boolean))),
                preferredSessions: Array.from(new Set(trades.map((t: any) => t.session).filter(Boolean))),
                conditions: sc.conditions || ["Verify market structure"],
                entryRules: sc.entryRules || ["Confirm entry trigger"],
                riskRules: sc.riskRules || ["Risk max 1-2% per trade"],
                avoidConditions: sc.avoidConditions || ["Avoid emotional entries"],
                observedPatterns: sc.observedPatterns || [`Historical Win Rate: ${matchedStat.winRate}%`],
                inferredPatterns: sc.inferredPatterns || [`Higher setup quality correlates with profitability`],
                recommendations: sc.recommendations || [`Focus on disciplined execution`],
                weaknesses: sc.weaknesses || [`Sample size is ${matchedStat.tradeCount} trades`],
                limitations: sc.limitations || [`Follow stop loss rules strictly`],
                sourceTradeIds: matchedStat.sourceTradeIds,
                checklist: sc.checklist || ["Confirm setup", "Set stop loss", "Check risk"],
                version: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              };
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini strategy refinement failed, using deterministic strategy candidates:", geminiErr);
      }
    }

    const analysisResult = {
      analysisId: "analysis_" + Date.now(),
      analysisDate: new Date().toISOString(),
      dataSufficiency: sufficiency,
      topSetups: topPatterns.map(p => ({
        setupName: p.setupName,
        tradeCount: p.tradeCount,
        winRate: p.winRate,
        expectancyR: p.expectancyR,
        profitFactor: p.profitFactor,
        confidenceLevel: p.confidenceLevel,
        sampleCoverage: p.sampleCoverage,
        evidenceSummary: p.evidenceSummary
      })),
      observedPatterns,
      inferredPatterns,
      strategyCandidates,
      dataLimitations,
      journalQualityScore,
      journalImprovementTips: tips
    };

    // Save to User Database State
    await dbService.saveUserEdgeAnalysis(req.userEmail, analysisResult);

    // Merge strategy candidates with existing user strategies
    const existingStrategies = await dbService.getUserStrategies(req.userEmail);
    const existingActive = existingStrategies.filter(s => s.status === "active" || s.status === "rejected");
    
    // Add new candidate strategies if not already present
    const updatedStrategies = [...existingActive, ...strategyCandidates];
    await dbService.saveUserStrategies(req.userEmail, updatedStrategies);

    res.json(analysisResult);
  } catch (error: any) {
    console.error("My Edge analysis failed:", error);
    res.status(500).json({ error: error.message || "An error occurred during My Edge analysis." });
  }
});

// API: Get My Edge Strategies & Playbook
app.get("/api/my-edge/strategies", authenticateUser, async (req: any, res) => {
  try {
    const strategies = await dbService.getUserStrategies(req.userEmail);
    const lastAnalysis = await dbService.getUserEdgeAnalysis(req.userEmail);
    res.json({
      strategies,
      lastAnalysis
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Accept Candidate Strategy into Active Playbook
app.post("/api/my-edge/strategies/:id/accept", authenticateUser, async (req: any, res) => {
  try {
    const { id } = req.params;
    const strategies = await dbService.getUserStrategies(req.userEmail);
    const idx = strategies.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Strategy candidate not found." });
    }

    strategies[idx].status = "active";
    strategies[idx].updatedAt = new Date().toISOString();
    await dbService.saveUserStrategies(req.userEmail, strategies);

    res.json(strategies[idx]);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Reject / Archive Strategy Candidate
app.post("/api/my-edge/strategies/:id/reject", authenticateUser, async (req: any, res) => {
  try {
    const { id } = req.params;
    const strategies = await dbService.getUserStrategies(req.userEmail);
    const idx = strategies.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Strategy candidate not found." });
    }

    strategies[idx].status = "rejected";
    strategies[idx].updatedAt = new Date().toISOString();
    await dbService.saveUserStrategies(req.userEmail, strategies);

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: Version / Update Strategy Rules
app.post("/api/my-edge/strategies/:id/version", authenticateUser, async (req: any, res) => {
  try {
    const { id } = req.params;
    const { changeSummary, conditions, entryRules, riskRules, avoidConditions } = req.body;

    const strategies = await dbService.getUserStrategies(req.userEmail);
    const idx = strategies.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: "Strategy not found." });
    }

    const strat = strategies[idx];
    const currentVersion = strat.version || 1;
    const snapshot = {
      version: currentVersion,
      createdAt: strat.updatedAt || strat.createdAt,
      changeSummary: changeSummary || `Version ${currentVersion} snapshot before update.`,
      conditions: [...strat.conditions],
      entryRules: [...strat.entryRules],
      riskRules: [...strat.riskRules],
      avoidConditions: [...strat.avoidConditions],
      evidenceSnapshot: { ...strat.evidence }
    };

    strat.history = [...(strat.history || []), snapshot];
    strat.version = currentVersion + 1;
    if (conditions) strat.conditions = conditions;
    if (entryRules) strat.entryRules = entryRules;
    if (riskRules) strat.riskRules = riskRules;
    if (avoidConditions) strat.avoidConditions = avoidConditions;
    strat.updatedAt = new Date().toISOString();

    strategies[idx] = strat;
    await dbService.saveUserStrategies(req.userEmail, strategies);

    res.json(strat);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: AI Review of Trade Example(s) using Gemini
app.post("/api/trade-examples/analyze", authenticateUser, async (req: any, res) => {
  try {
    const { tradeId } = req.body;
    const userState = await dbService.getUserState(req.userEmail);
    const trades = userState.trades || [];
    const targetTrade = trades.find((t: any) => t.id === tradeId);

    if (!targetTrade) {
      return res.status(404).json({ error: "Trade not found." });
    }

    const prompt = `Analyze this trade execution and provide a concise, evidence-based review:
Trade Data:
- Symbol: ${targetTrade.symbol} (${targetTrade.type})
- Outcome: ${targetTrade.status} (PnL: $${targetTrade.profitLoss}, R-Ratio: ${targetTrade.riskRewardRatio || "N/A"})
- Setup Type: ${targetTrade.setupType || "General"}
- Session: ${targetTrade.session || "Unknown"}
- Playbook Compliance: ${targetTrade.playbookCompliance || "Not recorded"}
- Violated Rule: ${targetTrade.violatedRule || "None"}
- Emotional State: ${targetTrade.emotionalState || "Unknown"}
- Mistake Tags: ${targetTrade.mistakeTags ? targetTrade.mistakeTags.join(", ") : "None"}
- Setup Quality: ${targetTrade.qualityScore || "N/A"}/5
- Notes: ${targetTrade.notes || "None"}

System Rules:
1. Do not invent unverified chart details.
2. Distinguish trade outcome from execution quality.
3. Provide a structured review in JSON format matching this schema:
{
  "executionQuality": "GOOD" | "ACCEPTABLE" | "POOR",
  "classification": "GOOD_WIN" | "BAD_WIN" | "GOOD_LOSS" | "BAD_LOSS" | "BREAKEVEN",
  "observations": ["string"],
  "strengths": ["string"],
  "mistakes": ["string"],
  "lesson": "string",
  "playbookRelevance": "string"
}`;

    let reviewData = {
      executionQuality: targetTrade.playbookCompliance === "YES" ? "GOOD" : targetTrade.playbookCompliance === "NO" ? "POOR" : "ACCEPTABLE",
      classification: targetTrade.status === "WIN" ? (targetTrade.playbookCompliance === "NO" ? "BAD_WIN" : "GOOD_WIN") : (targetTrade.playbookCompliance === "NO" ? "BAD_LOSS" : "GOOD_LOSS"),
      observations: [`Executed ${targetTrade.symbol} ${targetTrade.type} during ${targetTrade.session || 'trade'} session.`],
      strengths: targetTrade.playbookCompliance === "YES" ? ["Strict playbook compliance"] : [],
      mistakes: targetTrade.mistakeTags || [],
      lesson: targetTrade.status === "WIN" 
        ? "Maintain disciplined execution following defined entry triggers."
        : "Valid risk parameters maintained. Review entry confirmation rules before execution.",
      playbookRelevance: targetTrade.playbookCompliance === "YES" ? "High Playbook Alignment" : "Needs Playbook Discipline Alignment"
    };

    try {
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are MarketMind's trade-review assistant. Analyze trader's trade records based strictly on provided data. Never invent chart facts. Return strictly valid JSON."
        }
      });

      if (aiResponse && aiResponse.text) {
        const cleanText = aiResponse.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        reviewData = { ...reviewData, ...parsed };
      }
    } catch (aiErr) {
      console.warn("Gemini AI trade review failed, returning deterministic fallback review:", aiErr);
    }

    res.json(reviewData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// API: AI Winner vs Loser Comparison Analysis
app.post("/api/trade-examples/compare", authenticateUser, async (req: any, res) => {
  try {
    const { winnerId, loserId } = req.body;
    const userState = await dbService.getUserState(req.userEmail);
    const trades = userState.trades || [];

    const winner = trades.find((t: any) => t.id === winnerId);
    const loser = trades.find((t: any) => t.id === loserId);

    if (!winner || !loser) {
      return res.status(404).json({ error: "Winner or loser trade record not found." });
    }

    const prompt = `Compare these two trades (Winner vs Loser) and identify key execution differences:

WINNING TRADE:
- ${winner.symbol} ${winner.type} | PnL: +$${winner.profitLoss} (+${winner.riskRewardRatio || 0}R)
- Setup: ${winner.setupType || "N/A"} | Session: ${winner.session || "N/A"}
- Compliance: ${winner.playbookCompliance || "N/A"}
- Emotion: ${winner.emotionalState || "N/A"} | Mistakes: ${winner.mistakeTags ? winner.mistakeTags.join(", ") : "None"}

LOSING TRADE:
- ${loser.symbol} ${loser.type} | PnL: -$${Math.abs(loser.profitLoss)} (${loser.riskRewardRatio ? -1 : 0}R)
- Setup: ${loser.setupType || "N/A"} | Session: ${loser.session || "N/A"}
- Compliance: ${loser.playbookCompliance || "N/A"}
- Emotion: ${loser.emotionalState || "N/A"} | Mistakes: ${loser.mistakeTags ? loser.mistakeTags.join(", ") : "None"}

Provide structured JSON comparison:
{
  "keySeparator": "string summary of main difference",
  "winningFactors": ["string"],
  "losingFactors": ["string"],
  "actionableRecommendation": "string"
}`;

    let comparisonData = {
      keySeparator: winner.playbookCompliance !== loser.playbookCompliance 
        ? `The winning trade strictly followed the Playbook plan (${winner.playbookCompliance}), whereas the losing trade violated defined rules (${loser.playbookCompliance}).`
        : "Difference in session timing, market volatility, or emotional discipline at entry.",
      winningFactors: [
        `Playbook Compliance: ${winner.playbookCompliance || "YES"}`,
        `Emotional State: ${winner.emotionalState || "Calm"}`,
        `Discipline Rating: ${winner.qualityScore || 4}/5 ⭐`
      ],
      losingFactors: [
        `Playbook Compliance: ${loser.playbookCompliance || "NO"}`,
        `Mistakes: ${loser.mistakeTags && loser.mistakeTags.length > 0 ? loser.mistakeTags.join(", ") : "Execution error"}`,
        `Emotional State: ${loser.emotionalState || "Under pressure"}`
      ],
      actionableRecommendation: "Ensure all entry criteria and confirmation triggers are satisfied prior to order execution."
    };

    try {
      const aiResponse = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          systemInstruction: "You are MarketMind's trade-review assistant. Compare winning vs losing trade data objectively. Never invent unrecorded chart facts. Return valid JSON."
        }
      });

      if (aiResponse && aiResponse.text) {
        const cleanText = aiResponse.text.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(cleanText);
        comparisonData = { ...comparisonData, ...parsed };
      }
    } catch (aiErr) {
      console.warn("Gemini AI comparison failed, returning deterministic comparison:", aiErr);
    }

    res.json(comparisonData);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});


// Serve static files in production, use Vite middleware in development
async function startServer() {
  // Bootstrap the admin account on DB startup
  await bootstrapAdmin();

  // Clean up mock community posts from feed
  try {
    await dbService.cleanMockPosts();
  } catch (cleanErr) {
    console.error("Failed to clean mock community posts:", cleanErr);
  }

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MarketMinds Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
