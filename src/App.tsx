import { useState, useEffect, useCallback } from "react";
import SeasonalBackground from "./components/SeasonalBackground";
import Header from "./components/Header";
import NewsFeed from "./components/NewsFeed";
import AdminPanel from "./components/AdminPanel";
import NewsEditor from "./components/NewsEditor";

interface NewsPost {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName: string;
  createdAt: number;
  updatedAt?: number;
}

export default function App() {
  const [publisherName, setPublisherName] = useState<string | null>(() =>
    localStorage.getItem("publisher_name")
  );
  const [showEditor, setShowEditor] = useState(false);
  const [editingPost, setEditingPost] = useState<NewsPost | null>(null);
  const [posts, setPosts] = useState<NewsPost[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch news on mount
  const fetchNews = useCallback(async () => {
    try {
      const { ConvexClient } = await import("convex/browser");
      const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);
      const result = await client.query("news:list" as any, {});
      setPosts(result || []);
    } catch (err) {
      console.error("Failed to load news:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  const handleLogout = () => {
    localStorage.removeItem("publisher_name");
    setPublisherName(null);
  };

  const handleNewPost = () => {
    setEditingPost(null);
    setShowEditor(true);
  };

  const handleEditPost = (post: NewsPost) => {
    setEditingPost(post);
    setShowEditor(true);
  };

  const handleDeletePost = async (id: string) => {
    try {
      const { ConvexClient } = await import("convex/browser");
      const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);
      await client.mutation("news:remove" as any, { id });
      setPosts((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      alert("Ошибка удаления.");
    }
  };

  const handlePostSaved = () => {
    setShowEditor(false);
    setEditingPost(null);
    fetchNews(); // Refresh feed
  };

  return (
    <div className="min-h-dvh">
      {/* Seasonal background */}
      <SeasonalBackground />

      {/* Header */}
      <Header publisherName={publisherName} onLogout={handleLogout} />

      {/* Main content */}
      <main className="pt-20 pb-8">
        {/* Hero section */}
        <section className="relative z-10 text-center px-4 pt-8 pb-12">
          <div className="inline-block px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-medium mb-4">
            📰 Школьная газета
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-text-primary mb-3">
            Лицей 12
          </h1>
          <p className="text-text-secondary max-w-md mx-auto text-sm sm:text-base">
            Новости, события и интервью из жизни нашего лицея
          </p>
        </section>

        {/* News feed */}
        <NewsFeed
          publisherName={publisherName}
          onEdit={handleEditPost}
          onDelete={handleDeletePost}
          onNewPost={handleNewPost}
          posts={posts}
          loading={loading}
        />
      </main>

      {/* Footer */}
      <footer className="relative z-10 text-center py-6 text-text-secondary text-xs border-t border-glass-border">
        МОУ Лицей №12 · г. Люберцы · {new Date().getFullYear()}
      </footer>

      {/* Admin panel (hidden triple-click) */}
      <AdminPanel onRegistered={(name) => setPublisherName(name)} />

      {/* News editor modal */}
      {showEditor && (
        <NewsEditor
          authorName={publisherName || ""}
          onCreated={handlePostSaved}
          onCancel={() => { setShowEditor(false); setEditingPost(null); }}
          editPost={editingPost || undefined}
        />
      )}
    </div>
  );
}
