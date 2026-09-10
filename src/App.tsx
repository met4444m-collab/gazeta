import { useState, useEffect, useCallback } from "react";
import { listNews, me, logout, removeNews, getToken, clearSession, type NewsPost } from "./lib/convex";
import SeasonalBackground from "./components/SeasonalBackground";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import AdminPanel from "./components/AdminPanel";
import NewsEditor from "./components/NewsEditor";

// Adapt the Supabase row to the shape NewsFeed expects (created with Convex ids)
function toFeedPost(n: NewsPost) {
  return {
    _id: n.id,
    title: n.title,
    body: n.body,
    imageUrl: n.image_url ?? undefined,
    videoUrl: n.video_url ?? undefined,
    authorName: n.author_name,
    createdAt: new Date(n.created_at).getTime(),
  };
}

export default function App() {
  const [publisherName, setPublisherName] = useState<string | null>(() =>
    localStorage.getItem("publisher_name")
  );
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listNews();
      setPosts((data || []).map(toFeedPost));
      try { localStorage.setItem("news_cache", JSON.stringify(data || [])); } catch {}
    } catch {
      // Network/backend hiccup: show cached news instead of an empty feed
      try {
        const cached = localStorage.getItem("news_cache");
        if (cached) setPosts(JSON.parse(cached).map(toFeedPost));
      } catch {}
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Validate saved session on load; if token is dead, log out silently
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    me(token)
      .then((r: any) => {
        if (!r) {
          clearSession();
          setPublisherName(null);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try { await logout(token); } catch {}
    }
    clearSession();
    setPublisherName(null);
  };
  const handleNewPost = () => { setEditingPost(null); setShowEditor(true); };
  const handleEditPost = (post: any) => { setEditingPost(post); setShowEditor(true); };

  const handleDeletePost = async (id: string) => {
    try {
      await removeNews(getToken(), id);
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch { alert("Ошибка удаления."); }
  };

  const handlePostSaved = () => { setShowEditor(false); setEditingPost(null); fetchNews(); };

  return (
    <div style={{ minHeight: "100dvh", background: "#0a0a12" }}>
      <SeasonalBackground />
      <Header publisherName={publisherName} onLogout={handleLogout} />
      <main style={{ paddingTop: 64, paddingBottom: 48 }}>
        <section style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "24px 16px 16px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(108,159,255,0.1)", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#6c9fff" }}>📰 Школьная газета</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#e8e8f0" }}>Лицей 12</h1>
        </section>
        <NewsFeed publisherName={publisherName} onEdit={handleEditPost} onDelete={handleDeletePost} onNewPost={handleNewPost} posts={posts} loading={loading} />
      </main>
      <AdminPanel onRegistered={(name) => { setPublisherName(name); fetchNews(); }} />
      {showEditor && <NewsEditor onCreated={handlePostSaved} onCancel={() => { setShowEditor(false); setEditingPost(null); }} editPost={editingPost || undefined} />}
    </div>
  );
}
