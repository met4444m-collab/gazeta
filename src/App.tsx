import { useState, useEffect, useCallback } from "react";
import { convexQuery, convexMutation, getToken, clearSession } from "./lib/convex";
import SeasonalBackground from "./components/SeasonalBackground";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import AdminPanel from "./components/AdminPanel";
import NewsEditor from "./components/NewsEditor";

export default function App() {
  const [publisherName, setPublisherName] = useState<string | null>(() =>
    localStorage.getItem("publisher_name")
  );
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);

  const fetchNews = useCallback(async () => {
    // Retry a few times — the backend may be briefly unreachable on page load
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        const data = await convexQuery("news:list");
        setPosts(data || []);
        try { localStorage.setItem("news_cache", JSON.stringify(data || [])); } catch {}
        return;
      } catch {
        await new Promise((r) => setTimeout(r, 1500 * (attempt + 1)));
      }
    }
    // All retries failed: show cached news instead of an empty feed
    try {
      const cached = localStorage.getItem("news_cache");
      if (cached) setPosts(JSON.parse(cached));
    } catch {}
  }, []);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  // Validate saved session on load; if token is dead, log out silently
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    convexQuery("users:me", { token })
      .then((me) => {
        if (!me) {
          clearSession();
          setPublisherName(null);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    const token = getToken();
    if (token) {
      try { await convexMutation("users:logout", { token }); } catch {}
    }
    clearSession();
    setPublisherName(null);
  };
  const handleNewPost = () => { setEditingPost(null); setShowEditor(true); };
  const handleEditPost = (post: any) => { setEditingPost(post); setShowEditor(true); };

  const handleDeletePost = async (id: any) => {
    try {
      await convexMutation("news:remove", { id, token: getToken() });
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
        <NewsFeed publisherName={publisherName} onEdit={handleEditPost} onDelete={handleDeletePost} onNewPost={handleNewPost} posts={posts} loading={false} />
      </main>
      <AdminPanel onRegistered={(name) => { setPublisherName(name); fetchNews(); }} />
      {showEditor && <NewsEditor onCreated={handlePostSaved} onCancel={() => { setShowEditor(false); setEditingPost(null); }} editPost={editingPost || undefined} />}
    </div>
  );
}
