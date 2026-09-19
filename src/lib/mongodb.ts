import { MongoClient, Db } from "mongodb";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

dotenv.config();

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB || "TradingLog";

let client: MongoClient | null = null;
let dbInstance: Db | null = null;

// File-based fallback path
const DB_FILE = path.join(process.cwd(), "db.json");

export async function getMongoDb(): Promise<Db | null> {
  if (dbInstance) return dbInstance;

  const rawUri = process.env.MONGODB_URI;
  const sanitizedUri = rawUri ? rawUri.trim().replace(/^["']|["']$/g, "").trim() : "";
  const activeDbName = (process.env.MONGODB_DB || "TradingLog").trim().replace(/^["']|["']$/g, "").trim();

  if (!sanitizedUri || sanitizedUri === "MONGODB_URI" || (!sanitizedUri.startsWith("mongodb://") && !sanitizedUri.startsWith("mongodb+srv://"))) {
    return null;
  }
  try {
    client = new MongoClient(sanitizedUri);
    await client.connect();
    dbInstance = client.db(activeDbName);
    console.log(`Connected successfully to MongoDB Database: "${activeDbName}"`);
    
    // Auto-migrate local data on first successful connection
    try {
      await runMigration(dbInstance);
    } catch (migErr) {
      console.error("Migration to MongoDB failed:", migErr);
    }

    return dbInstance;
  } catch (error) {
    console.error("Could not connect to MongoDB Atlas cluster:", error);
    client = null;
    dbInstance = null;
    return null;
  }
}

// Perform simple one-way migration of db.json content to Mongo if collections are empty
async function runMigration(db: Db) {
  if (!fs.existsSync(DB_FILE)) return;
  try {
    const raw = fs.readFileSync(DB_FILE, "utf-8");
    const localDb = JSON.parse(raw);
    if (!localDb) return;

    // 1. Migrate Users
    const usersColl = db.collection("users");
    const countUsers = await usersColl.countDocuments();
    if (countUsers === 0 && localDb.users && localDb.users.length > 0) {
      console.log(`Migrating ${localDb.users.length} users to MongoDB...`);
      await usersColl.insertMany(localDb.users);
    }

    // 2. Migrate User States (trades and transactions)
    const statesColl = db.collection("userStates");
    const countStates = await statesColl.countDocuments();
    if (countStates === 0 && localDb.userStates) {
      const stateDocs = Object.entries(localDb.userStates).map(([email, state]: [string, any]) => ({
        email: email.toLowerCase(),
        trades: state.trades || [],
        transactions: state.transactions || []
      }));
      if (stateDocs.length > 0) {
        console.log(`Migrating ${stateDocs.length} user states to MongoDB...`);
        await statesColl.insertMany(stateDocs);
      }
    }

    // 3. Migrate Community Posts
    const postsColl = db.collection("posts");
    const countPosts = await postsColl.countDocuments();
    if (countPosts === 0 && localDb.posts && localDb.posts.length > 0) {
      console.log(`Migrating ${localDb.posts.length} posts to MongoDB...`);
      await postsColl.insertMany(localDb.posts);
    }
  } catch (error) {
    console.error("Migration error:", error);
  }
}

// Fallback JSON-file read/write utilities
function getLocalDB(): any {
  try {
    if (!fs.existsSync(DB_FILE)) return { users: [], userStates: {}, posts: [] };
    return JSON.parse(fs.readFileSync(DB_FILE, "utf-8"));
  } catch (error) {
    console.error("Error reading local db.json:", error);
    return { users: [], userStates: {}, posts: [] };
  }
}

function saveLocalDB(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing local db.json:", error);
  }
}

// Unified Database interface wrapper to cleanly support both MongoDB Atlas and local disk database fallback
export const dbService = {
  // --- USERS MANAGEMENT ---
  async getUsers(): Promise<any[]> {
    const db = await getMongoDb();
    if (db) {
      return await db.collection("users").find().toArray();
    }
    return getLocalDB().users || [];
  },

  async getUserByEmail(email: string): Promise<any | null> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      return await db.collection("users").findOne({ email: emailLower });
    }
    const users = getLocalDB().users || [];
    return users.find((u: any) => u.email.toLowerCase() === emailLower) || null;
  },

  async addUser(user: any): Promise<void> {
    const emailLower = user.email.toLowerCase();
    const cleanUser = {
      isVerified: user.isVerified !== undefined ? user.isVerified : false,
      verificationOtp: user.verificationOtp || null,
      otpExpiresAt: user.otpExpiresAt || null,
      ...user,
      email: emailLower
    };
    const db = await getMongoDb();
    if (db) {
      await db.collection("users").updateOne(
        { email: emailLower },
        { $set: cleanUser },
        { upsert: true }
      );
      // Ensure they have a state record initialized
      const existingState = await db.collection("userStates").findOne({ email: emailLower });
      if (!existingState) {
        await db.collection("userStates").insertOne({
          email: emailLower,
          trades: [],
          transactions: []
        });
      }
      return;
    }

    const local = getLocalDB();
    const users = local.users || [];
    const idx = users.findIndex((u: any) => u.email.toLowerCase() === emailLower);
    if (idx !== -1) {
      users[idx] = cleanUser;
    } else {
      users.push(cleanUser);
    }
    if (!local.userStates[emailLower]) {
      local.userStates[emailLower] = { trades: [], transactions: [] };
    }
    local.users = users;
    saveLocalDB(local);
  },

  async updateUserOtp(email: string, otp: string, expiresAt: number): Promise<void> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      await db.collection("users").updateOne(
        { email: emailLower },
        { $set: { verificationOtp: otp, otpExpiresAt: expiresAt } }
      );
      return;
    }

    const local = getLocalDB();
    const users = local.users || [];
    const idx = users.findIndex((u: any) => u.email.toLowerCase() === emailLower);
    if (idx !== -1) {
      users[idx].verificationOtp = otp;
      users[idx].otpExpiresAt = expiresAt;
      local.users = users;
      saveLocalDB(local);
    }
  },

  async verifyUserOtp(email: string, otp: string): Promise<{ success: boolean; error?: string; user?: any }> {
    const emailLower = email.toLowerCase();
    const user = await this.getUserByEmail(emailLower);

    if (!user) {
      return { success: false, error: "User account not found." };
    }

    if (user.isVerified) {
      return { success: true, user };
    }

    if (!user.verificationOtp || user.verificationOtp !== otp) {
      return { success: false, error: "Invalid verification code." };
    }

    if (user.otpExpiresAt && Date.now() > user.otpExpiresAt) {
      return { success: false, error: "Verification code has expired. Please request a new code." };
    }

    // Verification successful
    const db = await getMongoDb();
    if (db) {
      await db.collection("users").updateOne(
        { email: emailLower },
        {
          $set: { isVerified: true },
          $unset: { verificationOtp: "", otpExpiresAt: "" }
        }
      );
    } else {
      const local = getLocalDB();
      const users = local.users || [];
      const idx = users.findIndex((u: any) => u.email.toLowerCase() === emailLower);
      if (idx !== -1) {
        users[idx].isVerified = true;
        delete users[idx].verificationOtp;
        delete users[idx].otpExpiresAt;
        local.users = users;
        saveLocalDB(local);
      }
    }

    user.isVerified = true;
    delete user.verificationOtp;
    delete user.otpExpiresAt;

    return { success: true, user };
  },

  async updateAdminUser(adminEmail: string, adminUser: any): Promise<void> {
    const emailLower = adminEmail.toLowerCase();
    const cleanAdmin = { ...adminUser, email: emailLower, isVerified: true };
    const db = await getMongoDb();
    if (db) {
      await db.collection("users").updateOne(
        { role: "admin" },
        { $set: cleanAdmin },
        { upsert: true }
      );
      return;
    }

    const local = getLocalDB();
    const users = local.users || [];
    const existingIdx = users.findIndex((u: any) => u.role === "admin");
    if (existingIdx !== -1) {
      users[existingIdx] = cleanAdmin;
    } else {
      users.push(cleanAdmin);
    }
    local.users = users;
    saveLocalDB(local);
  },

  async deleteUser(email: string): Promise<void> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      await db.collection("users").deleteOne({ email: emailLower });
      await db.collection("userStates").deleteOne({ email: emailLower });
      return;
    }

    const local = getLocalDB();
    local.users = (local.users || []).filter((u: any) => u.email.toLowerCase() !== emailLower);
    if (local.userStates && local.userStates[emailLower]) {
      delete local.userStates[emailLower];
    }
    saveLocalDB(local);
  },

  // --- TRADES/TRANSACTIONS STATES ---
  async getUserState(email: string): Promise<{ trades: any[]; transactions: any[]; strategies?: any[]; lastEdgeAnalysis?: any }> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      const doc = await db.collection("userStates").findOne({ email: emailLower });
      if (doc) {
        return {
          trades: doc.trades || [],
          transactions: doc.transactions || [],
          strategies: doc.strategies || [],
          lastEdgeAnalysis: doc.lastEdgeAnalysis || null
        };
      }
      return { trades: [], transactions: [], strategies: [], lastEdgeAnalysis: null };
    }

    const local = getLocalDB();
    const state = local.userStates[emailLower] || { trades: [], transactions: [] };
    return {
      trades: state.trades || [],
      transactions: state.transactions || [],
      strategies: state.strategies || [],
      lastEdgeAnalysis: state.lastEdgeAnalysis || null
    };
  },

  async setUserState(email: string, trades: any[], transactions: any[], strategies?: any[], lastEdgeAnalysis?: any): Promise<void> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      const updateDoc: any = { trades, transactions };
      if (strategies !== undefined) updateDoc.strategies = strategies;
      if (lastEdgeAnalysis !== undefined) updateDoc.lastEdgeAnalysis = lastEdgeAnalysis;
      try {
        await db.collection("userStates").updateOne(
          { email: emailLower },
          { $set: updateDoc },
          { upsert: true }
        );
      } catch (err: any) {
        console.error(`MongoDB update failed for user ${emailLower}:`, err);
        throw new Error(`MongoDB persistence error: ${err.message || "Failed to save state to MongoDB."}`);
      }
      return;
    }

    const local = getLocalDB();
    const existing = local.userStates[emailLower] || { trades: [], transactions: [] };
    local.userStates[emailLower] = {
      ...existing,
      trades,
      transactions,
      ...(strategies !== undefined ? { strategies } : {}),
      ...(lastEdgeAnalysis !== undefined ? { lastEdgeAnalysis } : {})
    };
    saveLocalDB(local);
  },

  async getUserStrategies(email: string): Promise<any[]> {
    const state = await this.getUserState(email);
    return state.strategies || [];
  },

  async saveUserStrategies(email: string, strategies: any[]): Promise<void> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      await db.collection("userStates").updateOne(
        { email: emailLower },
        { $set: { strategies } },
        { upsert: true }
      );
      return;
    }
    const local = getLocalDB();
    const existing = local.userStates[emailLower] || { trades: [], transactions: [] };
    existing.strategies = strategies;
    local.userStates[emailLower] = existing;
    saveLocalDB(local);
  },

  async getUserEdgeAnalysis(email: string): Promise<any | null> {
    const state = await this.getUserState(email);
    return state.lastEdgeAnalysis || null;
  },

  async saveUserEdgeAnalysis(email: string, analysis: any): Promise<void> {
    const emailLower = email.toLowerCase();
    const db = await getMongoDb();
    if (db) {
      await db.collection("userStates").updateOne(
        { email: emailLower },
        { $set: { lastEdgeAnalysis: analysis } },
        { upsert: true }
      );
      return;
    }
    const local = getLocalDB();
    const existing = local.userStates[emailLower] || { trades: [], transactions: [] };
    existing.lastEdgeAnalysis = analysis;
    local.userStates[emailLower] = existing;
    saveLocalDB(local);
  },

  async getAllUserStatesMap(): Promise<Record<string, { trades: any[]; transactions: any[] }>> {
    const db = await getMongoDb();
    if (db) {
      const list = await db.collection("userStates").find().toArray();
      const map: Record<string, { trades: any[]; transactions: any[] }> = {};
      list.forEach((doc: any) => {
        if (doc.email) {
          map[doc.email.toLowerCase()] = {
            trades: doc.trades || [],
            transactions: doc.transactions || []
          };
        }
      });
      return map;
    }

    return getLocalDB().userStates || {};
  },

  // --- COMMUNITY POSTS MANAGEMENT ---
  async getCommunityPosts(): Promise<any[]> {
    const db = await getMongoDb();
    if (db) {
      return await db.collection("posts").find().sort({ date: -1 }).toArray();
    }
    return getLocalDB().posts || [];
  },

  async addCommunityPost(post: any): Promise<void> {
    const db = await getMongoDb();
    if (db) {
      await db.collection("posts").insertOne(post);
      return;
    }

    const local = getLocalDB();
    const posts = local.posts || [];
    posts.unshift(post);
    local.posts = posts;
    saveLocalDB(local);
  },

  async replyToPost(postId: string, reply: any): Promise<any | null> {
    const db = await getMongoDb();
    if (db) {
      // Find the post, push response to replies list
      const result = await db.collection("posts").findOneAndUpdate(
        { id: postId },
        { $push: { replies: reply } as any },
        { returnDocument: "after" }
      );
      return result ? result : null;
    }

    const local = getLocalDB();
    const posts = local.posts || [];
    const idx = posts.findIndex((p: any) => p.id === postId);
    if (idx === -1) return null;
    posts[idx].replies.push(reply);
    local.posts = posts;
    saveLocalDB(local);
    return posts[idx];
  },

  async cleanMockPosts(): Promise<void> {
    const db = await getMongoDb();
    if (db) {
      const users = await db.collection("users").find().toArray();
      const userEmails = users.map(u => u.email.toLowerCase());
      const adminEmail = (process.env.ADMIN_EMAIL || "nickdubale05@gmail.com").toLowerCase();
      if (!userEmails.includes(adminEmail)) {
        userEmails.push(adminEmail);
      }
      const result = await db.collection("posts").deleteMany({
        email: { $nin: userEmails }
      });
      console.log(`Cleaned up ${result.deletedCount} mock posts from database.`);
      return;
    }
    
    const local = getLocalDB();
    const users = local.users || [];
    const userEmails = users.map((u: any) => u.email.toLowerCase());
    const adminEmail = (process.env.ADMIN_EMAIL || "nickdubale05@gmail.com").toLowerCase();
    if (!userEmails.includes(adminEmail)) {
      userEmails.push(adminEmail);
    }
    const originalCount = local.posts?.length || 0;
    local.posts = (local.posts || []).filter((p: any) => userEmails.includes(p.email.toLowerCase()));
    saveLocalDB(local);
    console.log(`Cleaned up ${originalCount - local.posts.length} mock posts from local database.`);
  },

  async getCommunityPostById(postId: string): Promise<any | null> {
    const db = await getMongoDb();
    if (db) {
      return await db.collection("posts").findOne({ id: postId });
    }
    const posts = getLocalDB().posts || [];
    return posts.find((p: any) => p.id === postId) || null;
  },

  async deleteCommunityPost(postId: string): Promise<void> {
    const db = await getMongoDb();
    if (db) {
      await db.collection("posts").deleteOne({ id: postId });
      return;
    }
    const local = getLocalDB();
    local.posts = (local.posts || []).filter((p: any) => p.id !== postId);
    saveLocalDB(local);
  }
};
