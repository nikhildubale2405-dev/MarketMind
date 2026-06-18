import React, { useState, useEffect } from "react";
import { MessageSquare, ThumbsUp, Send, Trophy, PlusCircle, Globe, Award, Sparkles, Check, AlertCircle, Trash2 } from "lucide-react";

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

  // Reply state
  const [replyInputs, setReplyInputs] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState(false);
  const [errorStr, setErrorStr] = useState("");
  const [sortBy, setSortBy] = useState<"profit" | "consistency">("profit");

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
      setErrorStr("Failed to sink community data. App will run in offline demo mode.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunityData();
  }, [userEmail]);

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      alert("Please enter title and content.");
      return;
    }

    try {
      const res = await onFetchWithAuth("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, category })
      });

      if (res && !res.error) {
        alert("Community post published successfully!");
        setTitle("");
        setContent("");
        setShowAddPost(false);
        fetchCommunityData(); // Refresh list
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
        body: JSON.stringify({ content: text })
      });

      if (res && !res.error) {
        setReplyInputs(prev => ({ ...prev, [postId]: "" }));
        fetchCommunityData(); // Refresh list
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
    return post.email.toLowerCase() === userEmail.toLowerCase();
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("Are you sure you want to delete this shared idea?")) return;
    try {
      const res = await onFetchWithAuth(`/api/community/posts/${postId}`, {
        method: "DELETE"
      });
      if (res && res.success) {
        alert("Idea deleted successfully.");
        fetchCommunityData(); // Refresh list
      } else {
        alert(res?.error || "Failed to delete idea.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting idea.");
    }
  };

  const sortedBoard = [...board].sort((a, b) => {
    if (sortBy === "consistency") {
      return (b.consistency || 0) === (a.consistency || 0)
        ? (b.netResult || 0) - (a.netResult || 0)
        : (b.consistency || 0) - (a.consistency || 0);
    } else {
      return (b.netResult || 0) === (a.netResult || 0)
        ? (b.consistency || 0) - (a.consistency || 0)
        : (b.netResult || 0) - (a.netResult || 0);
    }
  });

  return (
    <div id="community-workspace" className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* 1. LEADERBOARD COLUMNS */}
      <div id="leaderboard-container-col" className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col justify-between h-full min-h-[500px]">
        <div>
          <div id="leaderboard-header" className="flex items-center gap-2 mb-3 border-b border-slate-800 pb-3">
            <Trophy className="text-amber-400" size={20} />
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono">Trader Leaderboard</h3>
              <p className="text-[10px] text-slate-500">Public aggregate metrics and relative rankings of all registered users.</p>
            </div>
          </div>

          {/* Sort Controller Switch Tabs */}
          <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-850 mb-4 text-[10px]">
            <button
              type="button"
              id="sort-by-profit-tab"
              onClick={() => setSortBy("profit")}
              className={`flex-1 py-1.5 px-2 rounded-md font-mono font-bold uppercase transition-all cursor-pointer ${
                sortBy === "profit" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              💰 Net Profit Sort
            </button>
            <button
              type="button"
              id="sort-by-consistency-tab"
              onClick={() => setSortBy("consistency")}
              className={`flex-1 py-1.5 px-2 rounded-md font-mono font-bold uppercase transition-all cursor-pointer ${
                sortBy === "consistency" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              🛡️ Consistency Sort
            </button>
          </div>

          {sortedBoard.length === 0 ? (
            <div id="leaderboard-empty" className="text-center py-12 text-slate-500 text-xs">
              <Award className="mx-auto mb-2 opacity-20" size={32} />
              <p>No active traders displayed yet.</p>
              <p className="text-[10px] text-slate-600 mt-1">Add winning trades to secure your place on the board!</p>
            </div>
          ) : (
            <div id="leaderboard-list" className="space-y-2 max-h-[420px] overflow-y-auto">
              {sortedBoard.map((trader, idx) => {
                const rank = idx + 1;
                let rankColor = "text-slate-400";

                if (rank === 1) {
                  rankColor = "text-amber-400 font-bold";
                } else if (rank === 2) {
                  rankColor = "text-slate-300 font-bold";
                } else if (rank === 3) {
                  rankColor = "text-amber-600 font-bold";
                }

                const consistencyVal = trader.consistency || 50;
                let consistencyColor = "text-rose-400 bg-rose-950/20 border-rose-900/50";
                let consistencyLevelLabel = "Volatile";
                if (consistencyVal >= 85) {
                  consistencyColor = "text-emerald-400 bg-emerald-950/40 border-emerald-900/60";
                  consistencyLevelLabel = "A+ Elite Consistency";
                } else if (consistencyVal >= 70) {
                  consistencyColor = "text-indigo-455 dark:text-indigo-400 bg-indigo-950/30 border-indigo-900/50";
                  consistencyLevelLabel = "High Consistency";
                } else if (consistencyVal >= 45) {
                  consistencyColor = "text-amber-400 bg-amber-950/30 border-amber-900/50";
                  consistencyLevelLabel = "Moderate Rank";
                }

                return (
                  <div
                    id={`leaderboard-row-${rank}`}
                    key={trader.email}
                    className={`p-3 rounded-lg border flex flex-col gap-2 transition-colors ${
                      userEmail?.toLowerCase() === trader.email.toLowerCase()
                        ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300"
                        : "bg-slate-950/60 border-slate-850"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div id="trader-rank-desc" className="flex items-center gap-2.5">
                        <span id={`rank-number-${rank}`} className={`font-mono text-sm ${rankColor}`}>#{rank}</span>
                        <div>
                          <span className="font-semibold text-slate-205 block truncate max-w-[130px]">
                            {trader.displayName}
                            {userEmail?.toLowerCase() === trader.email.toLowerCase() && " (You)"}
                          </span>
                          <span className="text-[9px] text-slate-500 font-mono">{trader.totalTrades} closed trades</span>
                        </div>
                      </div>

                      <div id="trader-profit-stats" className="text-right">
                        <span className={`font-mono font-bold block ${trader.netResult >= 0 ? "text-emerald-400" : "text-rose-450"}`}>
                          {trader.netResult >= 0 ? "+" : ""}${trader.netResult.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">Win Rate: {trader.winRate}%</span>
                      </div>
                    </div>

                    {/* Consistency rating badge bar and label row */}
                    <div className="flex items-center justify-between pt-1 border-t border-slate-800/40 mt-0.5">
                      <span className="text-[9px] text-slate-500 font-mono">Discipline Rate:</span>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[8.5px] px-1.5 py-0.5 rounded border font-bold uppercase tracking-wider font-mono ${consistencyColor}`}>
                          {consistencyVal}% {consistencyLevelLabel}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div id="leaderboard-footer" className="mt-4 pt-3 border-t border-slate-800/80 text-[10px] text-slate-500 font-mono flex items-center gap-2">
          <Globe size={12} className="text-slate-600" />
          <span>Real-time aggregate sync active. Privacy is strictly respected. Only displayName and aggregate PnL are public.</span>
        </div>
      </div>

      {/* 2. FORUMS FEED COLUMNS */}
      <div id="forums-feed-col" className="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl p-5 text-white flex flex-col h-full min-h-[500px]">
        <div id="forums-header" className="flex justify-between items-center mb-4 border-b border-slate-800 pb-3">
          <div id="forums-header-left" className="flex items-center gap-2">
            <MessageSquare size={18} className="text-emerald-400" />
            <div>
              <h3 className="font-bold text-sm tracking-wide uppercase font-mono">Community Hub & Ideas</h3>
              <p className="text-[10px] text-slate-500">Collab with fellow setup explorers. Discuss ideas and market plans.</p>
            </div>
          </div>
          <button
            id="btn-active-new-post"
            onClick={() => setShowAddPost(p => !p)}
            className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all pointer-events-auto cursor-pointer"
          >
            {showAddPost ? <Check size={14} /> : <PlusCircle size={14} />}
            {showAddPost ? "Close Post Form" : "Share Setup Idea"}
          </button>
        </div>

        {errorStr && (
          <div id="community-error-banner" className="bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-lg p-2.5 text-xs mb-3 flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorStr}</span>
          </div>
        )}

        <div id="scrollable-forums-area" className="flex-1 overflow-y-auto space-y-4 max-h-[460px] custom-scrollbar" style={{ scrollbarWidth: "thin" }}>
          
          {/* Create Post Sub Form */}
          {showAddPost && (
            <form id="create-post-form" onSubmit={handleCreatePost} className="bg-slate-950 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <span className="text-[10px] font-mono tracking-widest text-slate-500 uppercase block">Share New Discussion / Setup</span>
              
              <div id="post-title-cat-row" className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Post Title</label>
                  <input
                    id="input-post-title"
                    type="text"
                    required
                    placeholder="e.g. BTC Breakout setup details"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Category</label>
                  <select
                    id="select-post-category"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  >
                    <option value="Trade Plan">📝 Trade Plan</option>
                    <option value="Market Idea">💡 Market Idea</option>
                    <option value="Trading Question">❓ Trading Question</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Idea Discussion Details</label>
                <textarea
                  id="text-post-content"
                  required
                  rows={3}
                  placeholder="Explain why you identified this setup or what questions you have about the pairs/indices..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                />
              </div>

              <button
                id="btn-publish-post"
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-xs py-2 px-4 rounded-lg flex items-center gap-1 transition-all"
              >
                <Send size={12} />
                Publish to Community Feed
              </button>
            </form>
          )}

          {/* Posts List */}
          {posts.length === 0 ? (
            <div id="posts-empty" className="text-center py-16 text-slate-500 text-xs">
              <MessageSquare className="mx-auto mb-2 opacity-20" size={36} />
              <p>The community feed is currently silent.</p>
              <p className="text-slate-605 mt-1">Be the first to publish a setup review!</p>
            </div>
          ) : (
            posts.map(post => (
            <div id={`post-card-${post.id}`} key={post.id} className="bg-slate-955 border border-slate-850 p-4 rounded-xl space-y-3">
              <div id="post-card-top" className="flex justify-between items-start w-full">
                <div className="flex-1 min-w-0 pr-2">
                  <span id="badge-post-category" className="bg-slate-900 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wider">
                    {post.category}
                  </span>
                  <h4 className="font-bold text-slate-105 mt-1 text-sm truncate">{post.title}</h4>
                  <span className="text-[10px] text-slate-550 block mt-0.5">
                    By <strong>{post.displayName}</strong> • {new Date(post.date).toLocaleDateString()}
                  </span>
                </div>
                {canDeletePost(post) && (
                  <button
                    id={`btn-delete-post-${post.id}`}
                    onClick={() => handleDeletePost(post.id)}
                    className="text-slate-500 hover:text-rose-500 p-1 hover:bg-slate-900 rounded transition-all cursor-pointer flex-shrink-0"
                    title="Delete Shared Idea"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>

                <p id="post-card-content" className="text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {post.content}
                </p>

                {/* Replies Accordion */}
                <div id={`post-${post.id}-replies-section`} className="border-t border-slate-900 pt-3 mt-3">
                  <span className="text-[10px] font-mono text-slate-500 block mb-2">
                    Replies ({post.replies?.length || 0})
                  </span>

                  <div id="replies-list" className="space-y-2 mb-3">
                    {post.replies?.map((reply: any) => (
                      <div id={`reply-card-${reply.id}`} key={reply.id} className="bg-slate-900 p-2.5 rounded-lg border border-slate-850 text-xs">
                        <div className="flex justify-between items-center mb-1 text-[10px] text-slate-500">
                          <strong>{reply.displayName}</strong>
                          <span>{new Date(reply.date).toLocaleDateString()}</span>
                        </div>
                        <p className="text-slate-300">{reply.content}</p>
                      </div>
                    ))}
                  </div>

                  {/* Add Reply Area */}
                  {userEmail ? (
                    <div id="add-reply-input-row" className="flex gap-2">
                      <input
                        id={`input-reply-${post.id}`}
                        type="text"
                        placeholder="Write a constructive answer or reply..."
                        value={replyInputs[post.id] || ""}
                        onChange={(e) => setReplyInputs(prev => ({ ...prev, [post.id]: e.target.value }))}
                        className="flex-1 bg-slate-900 border border-slate-800 text-xs rounded-lg px-3 py-1.5 text-slate-200 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handlePostReply(post.id);
                        }}
                      />
                      <button
                        id={`btn-send-reply-${post.id}`}
                        onClick={() => handlePostReply(post.id)}
                        className="bg-slate-800 hover:bg-slate-750 text-emerald-400 p-1.5 px-3 rounded-lg flex items-center transition-all pointer-events-auto cursor-pointer"
                        title="Add Comment"
                      >
                        <Send size={12} />
                      </button>
                    </div>
                  ) : (
                    <span className="text-[10px] text-slate-650 font-mono">Sign in to write replies and ask questions.</span>
                  )}
                </div>
              </div>
            ))
          )}

        </div>
      </div>

    </div>
  );
}
