import React, { useState, useEffect } from "react";
import {
  MessageSquare,
  Send,
  Trophy,
  Plus,
  Globe,
  Award,
  AlertCircle,
  Trash2,
  CheckCircle2,
  HelpCircle,
  Lightbulb,
  BookOpen
} from "lucide-react";

interface CommunityHubProps {
  userEmail: string | null;
  userRole: string | null;
  onFetchWithAuth: (url: string, options?: RequestInit) => Promise<any>;
}

export default function CommunityHub({ userEmail, userRole, onFetchWithAuth }: CommunityHubProps) {
  const [board, setBoard] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  
  // Add post form states
  const [showAddPost, setShowAddPost] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Trade Plan");
  const [content, setContent] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("ALL");

  // Reply state
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [errorStr, setErrorStr] = useState("");
  const [sortBy, setSortBy] = useState<"profit" | "consistency">("profit");
  const [toastMsg, setToastMsg] = useState("");

  const fetchCommunityData = async () => {
    setLoading(true);
    setErrorStr("");
    try {
      const bRes = await fetch("/api/community/leaderboard");
      if (bRes.ok) {
        const bData = await bRes.json();
        setBoard(bData);
      }

      const pRes = await fetch("/api/community/posts");
      if (pRes.ok) {
        const pData = await pRes.json();
        setPosts(pData);
      }
    } catch (err: any) {
      console.error(err);
      setErrorStr("Community data running in offline mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [userEmail]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) return;

    try {
      const res = await onFetchWithAuth("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), content: content.trim(), category })
      });

      if (res && !res.error) {
        setTitle("");
        setContent("");
        setShowAddPost(false);
        setToastMsg("Post published to community forum!");
        setTimeout(() => setToastMsg(""), 3000);
        fetchCommunityData();
      } else {
        alert(res?.error || "Error posting topic.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Could not publish post.");
    }
  };

  const handlePostReply = async (postId: string) => {
    const text = replyInputs[postId];
    if (!text || !text.trim()) return;

    try {
      const res = await onFetchWithAuth(`/api/community/posts/${postId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: text.trim() })
      });

      if (res && !res.error) {
        setReplyInputs(prev => ({ ...prev, [postId]: "" }));
        fetchCommunityData();
      } else {
        alert(res?.error || "Error adding reply.");
      }
    } catch (err: any) {
      console.error(err);
      alert("Could not add reply.");
    }
  };

  const canDeletePost = (post: any) => {
    if (!userEmail) return false;
    if (userRole === "admin") return true;
    return post.email && post.email.toLowerCase() === userEmail.toLowerCase();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this discussion post?")) return;
    try {
      const res = await onFetchWithAuth(`/api/community/posts/${postId}`, {
        method: "DELETE"
      });
      if (res && res.success) {
        fetchCommunityData();
      } else {
        alert(res?.error || "Failed to delete post.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting post.");
    }
  };

  const sortedBoard = [...board].sort((a, b) => {
    if (sortBy === "consistency") {
      return (b.consistency || 0) - (a.consistency || 0);
    }
    return (b.netResult || 0) - (a.netResult || 0);
  });

  const filteredPosts = posts.filter(p => {
    if (selectedCategoryFilter === "ALL") return true;
    return p.category === selectedCategoryFilter;
  });

  return (
    <div id="community-workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. TRADER LEADERBOARD COLUMN */}
      <div id="leaderboard-container-col" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col justify-between shadow-sm space-y-4">
        <div className="space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
            <Trophy className="text-amber-400" size={18} />
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono text-slate-200">
                Trader Leaderboard
              </h3>
              <p className="text-[11px] text-slate-500">Public rankings across registered traders</p>
            </div>
          </div>

          {/* Sort Switch */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 text-[10px] font-mono">
            <button
              onClick={() => setSortBy("profit")}
              className={`flex-1 py-1 px-2 rounded font-bold uppercase transition-all cursor-pointer ${
                sortBy === "profit" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💰 Net Profit
            </button>
            <button
              onClick={() => setSortBy("consistency")}
              className={`flex-1 py-1 px-2 rounded font-bold uppercase transition-all cursor-pointer ${
                sortBy === "consistency" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🛡️ Discipline %
            </button>
          </div>

          {sortedBoard.length === 0 ? (
            <div className="text-center py-12 text-slate-600 text-xs">
              <Award className="mx-auto mb-2 opacity-30" size={32} />
              <p>No active traders ranked yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Log trades to claim your spot on the leaderboard.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-0.5">
              {sortedBoard.map((trader, idx) => {
                const rank = idx + 1;
                let rankColor = "text-slate-500";
                if (rank === 1) rankColor = "text-amber-400 font-bold";
                else if (rank === 2) rankColor = "text-slate-300 font-bold";
                else if (rank === 3) rankColor = "text-amber-600 font-bold";

                const isMe = userEmail && trader.email && userEmail.toLowerCase() === trader.email.toLowerCase();

                return (
                  <div
                    key={trader.email || idx}
                    className={`p-3 rounded-xl border transition-colors flex items-center justify-between text-xs ${
                      isMe
                        ? "bg-indigo-600/15 border-indigo-500/40 text-slate-100"
                        : "bg-slate-950 border-slate-850 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 truncate mr-2">
                      <span className={`font-mono text-sm w-6 text-center ${rankColor}`}>#{rank}</span>
                      <div className="truncate">
                        <span className="font-bold text-slate-200 block truncate">
                          {trader.displayName || "Trader"} {isMe && "(You)"}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {trader.totalTrades || 0} trades • {trader.winRate || 0}% WR
                        </span>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className={`font-mono font-bold block ${Number(trader.netResult) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        {Number(trader.netResult) >= 0 ? "+" : ""}${Number(trader.netResult || 0).toFixed(1)}
                      </span>
                      <span className="text-[9px] font-mono text-slate-500">
                        {trader.consistency || 50}% discipline
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex items-center gap-1.5">
          <Globe size={12} className="text-slate-500" />
          <span>Real-time aggregate ranking. Only display name and totals are shared.</span>
        </div>
      </div>

      {/* 2. COMMUNITY DISCUSSION FEED COLUMN */}
      <div id="forums-feed-col" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white space-y-4 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare size={18} className="text-emerald-400" />
              <div>
                <h3 className="font-bold text-sm tracking-wide uppercase font-mono text-slate-200">
                  Discussion Forum & Trade Ideas
                </h3>
                <p className="text-[11px] text-slate-500">
                  Collaborate, share trade setups, and discuss market strategies with peers
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
                onClick={() => setShowAddPost(prev => !prev)}
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all cursor-pointer"
              >
                <Plus size={14} />
                {showAddPost ? "Close Form" : "New Discussion"}
              </button>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
            {["ALL", "Trade Plan", "Market Idea", "Trading Question", "Psychology"].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategoryFilter(cat)}
                className={`px-2.5 py-1 rounded text-[10px] font-mono transition-all ${
                  selectedCategoryFilter === cat
                    ? "bg-indigo-600/30 text-indigo-300 border border-indigo-500/50 font-bold"
                    : "bg-slate-950 hover:bg-slate-800 text-slate-400 border border-slate-850"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Create Post Form */}
          {showAddPost && (
            <form onSubmit={handleCreatePost} className="bg-slate-950 p-4 rounded-xl border border-slate-850 space-y-3">
              <span className="text-[10px] font-mono tracking-wider text-slate-400 uppercase font-semibold block">
                Publish a New Discussion Topic
              </span>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <input
                  type="text"
                  required
                  placeholder="Post Title (e.g. Gold Liquidity Sweep setup review)"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="md:col-span-2 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-300 text-xs font-mono px-2 py-2 rounded-lg focus:outline-none focus:border-indigo-500 cursor-pointer"
                >
                  <option value="Trade Plan">Trade Plan</option>
                  <option value="Market Idea">Market Idea</option>
                  <option value="Trading Question">Trading Question</option>
                  <option value="Psychology">Psychology</option>
                </select>
              </div>

              <textarea
                required
                rows={3}
                placeholder="Share your technical analysis, questions, or setup notes..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500"
              />

              <button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2 px-4 rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Send size={12} />
                Publish Post
              </button>
            </form>
          )}

          {/* Posts Feed */}
          <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
            {filteredPosts.length === 0 ? (
              <div className="text-center py-16 text-slate-600 text-xs space-y-1">
                <MessageSquare className="mx-auto mb-2 opacity-30" size={32} />
                <p>No discussion posts in this category yet.</p>
                <p className="text-[10px] text-slate-500">Click "New Discussion" to start a thread.</p>
              </div>
            ) : (
              filteredPosts.map(post => (
                <div key={post.id} className="bg-slate-950 border border-slate-850 p-4 rounded-xl space-y-3">
                  {/* Post Top */}
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="bg-slate-900 text-indigo-400 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-mono font-semibold uppercase">
                          {post.category}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {post.date ? new Date(post.date).toLocaleDateString() : ""}
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-100 text-sm mt-1">{post.title}</h4>
                      <span className="text-[10px] text-slate-500 block">
                        Posted by <strong className="text-slate-400">{post.displayName || "Trader"}</strong>
                      </span>
                    </div>

                    {canDeletePost(post) && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors cursor-pointer"
                        title="Delete post"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-sans whitespace-pre-wrap">
                    {post.content}
                  </p>

                  {/* Replies Section */}
                  <div className="border-t border-slate-900 pt-2.5 space-y-2">
                    <span className="text-[10px] font-mono text-slate-500 block">
                      Replies ({post.replies?.length || 0})
                    </span>

                    {/* Replies List */}
                    {post.replies && post.replies.length > 0 && (
                      <div className="space-y-1.5">
                        {post.replies.map((reply: any) => (
                          <div key={reply.id} className="bg-slate-900/80 p-2 rounded-lg border border-slate-850 text-xs">
                            <div className="flex justify-between items-center text-[10px] text-slate-500 mb-0.5">
                              <strong className="text-slate-400">{reply.displayName || "Trader"}</strong>
                              <span>{reply.date ? new Date(reply.date).toLocaleDateString() : ""}</span>
                            </div>
                            <p className="text-slate-300">{reply.content}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Reply Input */}
                    {userEmail ? (
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          placeholder="Write a constructive reply..."
                          value={replyInputs[post.id] || ""}
                          onChange={(e) => setReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handlePostReply(post.id);
                          }}
                          className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-lg px-3 py-1.5 text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500"
                        />
                        <button
                          onClick={() => handlePostReply(post.id)}
                          className="bg-slate-800 hover:bg-slate-750 text-emerald-400 px-3 py-1.5 rounded-lg flex items-center transition-colors cursor-pointer"
                        >
                          <Send size={12} />
                        </button>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-600 font-mono block">Sign in to write replies.</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      </div>

    </div>
  );
}
