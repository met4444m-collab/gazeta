import { useState, useEffect, useCallback } from "react";
import { listNews, me, logout, removeNews, getToken, clearSession } from "./lib/convex";
import SeasonalBackground from "./components/SeasonalBackground";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import AdminPanel from "./components/AdminPanel";
import NewsEditor from "./components/NewsEditor";

// Adapt the Supabase row to the shape NewsFeed expects
function toFeedPost(n: any) {
  // new posts carry a media[] array; fall back to the old single-image/video columns.
  // Guard everything: old cached entries may be missing fields entirely.
  const rawMedia = Array.isArray(n?.media) ? n.media : [];
  const media = (rawMedia.length
    ? rawMedia
    : [
        ...(n?.image_url ? [{ type: "image", url: n.image_url }] : []),
        ...(n?.video_url ? [{ type: "video", url: n.video_url }] : []),
      ]
  ).filter((m: any) => m && m.url);
  return {
    _id: String(n?.id ?? Math.random()),
    title: String(n?.title ?? ""),
    body: String(n?.body ?? ""),
    media: media as { type: string; url: string }[],
    authorName: String(n?.author_name ?? ""),
    createdAt: n?.created_at ? new Date(n.created_at).getTime() : Date.now(),
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
      const normalized = (data || []).map(toFeedPost);
      setPosts(normalized);
      // Cache the ALREADY-NORMALIZED shape so an old cache can never crash the app
      try { localStorage.setItem("news_cache", JSON.stringify(normalized)); } catch {}
    } catch {
      // Network/backend hiccup: show cached news instead of an empty feed
      try {
        const cached = localStorage.getItem("news_cache");
        if (cached) {
          const parsed = JSON.parse(cached);
          // Cache may hold old raw rows OR new normalized posts — normalize handles both
          setPosts(Array.isArray(parsed) ? parsed.map(toFeedPost) : []);
        }
      } catch { try { localStorage.removeItem("news_cache"); } catch {} }
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
    <div style={{ minHeight: "100dvh", background: "#f3ede2" }}>
      <SeasonalBackground />
      <Header publisherName={publisherName} onLogout={handleLogout} />
      <main style={{ paddingTop: 64, paddingBottom: 48 }}>
        <section style={{ position: "relative", zIndex: 10, textAlign: "center", padding: "24px 16px 16px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, background: "rgba(184,100,31,0.1)", marginBottom: 12 }}>
            <span style={{ fontSize: 12, fontWeight: 500, color: "#b8641f" }}>📰 Школьная газета</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: "#2b2620" }}>Лицей 12</h1>
        </section>
        <NewsFeed publisherName={publisherName} onEdit={handleEditPost} onDelete={handleDeletePost} onNewPost={handleNewPost} posts={posts} loading={loading} />
      </main>
      <AdminPanel onRegistered={(name) => { setPublisherName(name); fetchNews(); }} />
      {showEditor && <NewsEditor onCreated={handlePostSaved} onCancel={() => { setShowEditor(false); setEditingPost(null); }} editPost={editingPost || undefined} />}
    </div>
  );
}
