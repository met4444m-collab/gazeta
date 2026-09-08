import { useState } from "react";

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

interface NewsFeedProps {
  publisherName: string | null;
  onEdit: (post: NewsPost) => void;
  onDelete: (id: string) => void;
  onNewPost: () => void;
  posts: NewsPost[];
  loading: boolean;
}

function getYouTubeEmbed(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  return match ? `https://www.youtube.com/embed/${match[1]}` : null;
}

function getVKEmbed(url: string): string | null {
  const match = url.match(/vk\.com\/video(-?\d+_\d+)/);
  return match ? `https://vk.com/video_ext.php?oid=${match[1].split("_")[0]}&id=${match[1].split("_")[1]}` : null;
}

function formatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const diff = now.getTime() - ts;

  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин. назад`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч. назад`;

  return d.toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function NewsCard({ post, publisherName, onEdit, onDelete }: {
  post: NewsPost;
  publisherName: string | null;
  onEdit: (post: NewsPost) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.body.length > 300;
  const displayBody = expanded || !isLong ? post.body : post.body.slice(0, 300) + "...";

  const videoEmbed = post.videoUrl
    ? getYouTubeEmbed(post.videoUrl) || getVKEmbed(post.videoUrl)
    : null;

  return (
    <article className="glass p-5 sm:p-6 w-full max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-text-primary leading-tight">
            {post.title}
          </h2>
          <div className="flex items-center gap-2 mt-1.5 text-sm text-text-secondary">
            <span className="font-medium text-accent">{post.authorName}</span>
            <span>•</span>
            <time>{formatDate(post.createdAt)}</time>
          </div>
        </div>

        {publisherName && (
          <div className="flex gap-1 shrink-0">
            <button
              onClick={() => onEdit(post)}
              className="p-1.5 rounded-lg text-text-secondary hover:text-text-primary hover:bg-white/5 transition-all"
              title="Редактировать"
            >
              ✏️
            </button>
            <button
              onClick={() => {
                if (confirm("Удалить эту новость?")) onDelete(post._id);
              }}
              className="p-1.5 rounded-lg text-text-secondary hover:text-danger hover:bg-white/5 transition-all"
              title="Удалить"
            >
              🗑️
            </button>
          </div>
        )}
      </div>

      {/* Image */}
      {post.imageUrl && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <img
            src={post.imageUrl}
            alt={post.title}
            className="w-full h-auto object-cover max-h-96"
            loading="lazy"
          />
        </div>
      )}

      {/* Video */}
      {videoEmbed && (
        <div className="mb-4 rounded-xl overflow-hidden">
          <iframe
            src={videoEmbed}
            className="w-full aspect-video"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
          />
        </div>
      )}

      {/* Body */}
      <div className="text-text-secondary leading-relaxed whitespace-pre-wrap">
        {displayBody}
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="ml-1 text-accent hover:text-accent/80 transition-colors font-medium"
          >
            {expanded ? "Свернуть" : "Читать далее"}
          </button>
        )}
      </div>
    </article>
  );
}

export default function NewsFeed({ publisherName, onEdit, onDelete, onNewPost, posts, loading }: NewsFeedProps) {
  return (
    <div className="relative z-10 w-full max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Publisher action bar */}
      {publisherName && (
        <div className="glass p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-accent font-medium">📰 {publisherName}</span>
            <span className="text-text-secondary text-sm">• издатель</span>
          </div>
          <button
            onClick={onNewPost}
            className="px-4 py-2 bg-accent/20 text-accent font-medium rounded-lg hover:bg-accent/30 transition-all text-sm"
          >
            + Новость
          </button>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
          <p className="text-text-secondary text-sm mt-3">Загрузка новостей...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && posts.length === 0 && (
        <div className="text-center py-16">
          <div className="text-5xl mb-4">📰</div>
          <h3 className="text-xl font-bold text-text-primary mb-2">Пока нет новостей</h3>
          <p className="text-text-secondary">
            Будьте первым, кто опубликует новость для Лицея 12!
          </p>
        </div>
      )}

      {/* Posts */}
      {posts.map((post) => (
        <NewsCard
          key={post._id}
          post={post}
          publisherName={publisherName}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
