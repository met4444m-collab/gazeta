import { useState } from "react";

interface NewsEditorProps {
  authorName: string;
  onCreated: () => void;
  onCancel: () => void;
  editPost?: {
    _id: string;
    title: string;
    body: string;
    imageUrl?: string;
    videoUrl?: string;
  };
}

export default function NewsEditor({ authorName, onCreated, onCancel, editPost }: NewsEditorProps) {
  const [title, setTitle] = useState(editPost?.title || "");
  const [body, setBody] = useState(editPost?.body || "");
  const [imageUrl, setImageUrl] = useState(editPost?.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(editPost?.videoUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEditing = !!editPost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { ConvexClient } = await import("convex/browser");
      const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);

      if (isEditing) {
        await client.mutation("news:update" as any, {
          id: editPost._id,
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
        });
      } else {
        await client.mutation("news:create" as any, {
          title: title.trim(),
          body: body.trim(),
          imageUrl: imageUrl.trim() || undefined,
          videoUrl: videoUrl.trim() || undefined,
          authorName,
        });
      }

      onCreated();
    } catch (err: any) {
      setError(err.message || "Ошибка сохранения.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm overflow-y-auto py-8">
      <div className="glass-strong w-full max-w-lg mx-4 p-6 rounded-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-text-primary">
            {isEditing ? "✏️ Редактировать новость" : "📝 Новая новость"}
          </h2>
          <button
            onClick={onCancel}
            className="text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Заголовок
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="О чём эта новость?"
              required
              maxLength={200}
              className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Текст
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Расскажите подробнее..."
              required
              rows={6}
              maxLength={10000}
              className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all resize-none"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Ссылка на изображение (необязательно)
            </label>
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          <div>
            <label className="block text-sm text-text-secondary mb-1.5">
              Ссылка на видео (YouTube/VK, необязательно)
            </label>
            <input
              type="url"
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              placeholder="https://youtube.com/watch?v=..."
              className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
            />
          </div>

          {error && (
            <p className="text-danger text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 border border-glass-border text-text-secondary rounded-lg hover:bg-white/5 transition-all"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading || !title.trim() || !body.trim()}
              className="flex-1 py-2.5 bg-accent/20 text-accent font-medium rounded-lg hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {loading ? "Сохранение..." : isEditing ? "Обновить" : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
