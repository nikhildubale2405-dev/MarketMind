import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { dbService } from "./src/lib/mongodb";

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || "3000", 10);

app.use(express.json());

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

    const newUser = {
      email: emailLower,
      passwordHash: password,
      displayName,
      role
    };

    await dbService.addUser(newUser);

    res.json({
      email: newUser.email,
      displayName: newUser.displayName,
      role: newUser.role
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
        role: "admin"
      });
    }

    const user = await dbService.getUserByEmail(emailLower);
    if (!user || user.passwordHash !== password) {
      return res.status(400).json({ error: "Invalid credentials." });
    }

    res.json({
      email: user.email,
      displayName: user.displayName,
      role: user.role
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
