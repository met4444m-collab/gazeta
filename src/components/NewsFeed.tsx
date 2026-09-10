import { useState } from "react";

interface NewsPost {
  _id: string;
  title: string;
  body: string;
  imageUrl?: string;
  videoUrl?: string;
  authorName: string;
  createdAt: number;
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
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?#]+)/);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

function getVKEmbed(url: string): string | null {
  const m = url.match(/vk\.com\/video(-?\d+_\d+)/);
  return m ? `https://vk.com/video_ext.php?oid=${m[1].split("_")[0]}&id=${m[1].split("_")[1]}` : null;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "только что";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} мин.`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} ч.`;
  if (diff < 604800_000) return `${Math.floor(diff / 86400_000)} дн.`;
  return new Date(ts).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function NewsCard({ post, publisherName, onEdit, onDelete }: {
  post: NewsPost;
  publisherName: string | null;
  onEdit: (p: NewsPost) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const isLong = post.body.length > 400;
  const text = expanded || !isLong ? post.body : post.body.slice(0, 400) + "…";

  const videoEmbed = post.videoUrl
    ? getYouTubeEmbed(post.videoUrl) || getVKEmbed(post.videoUrl)
    : null;

  return (
    <article className="glass p-4 sm:p-5" style={{ width: "100%" }}>
      {/* Author row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{
            width: 28, height: 28, borderRadius: "50%",
            background: "rgba(108, 159, 255, 0.15)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, fontWeight: 700, color: "var(--accent)"
          }}>
            {post.authorName.charAt(0).toUpperCase()}
          </div>
          <span style={{ fontSize: 14, fontWeight: 500, color: "var(--text-primary)" }}>
            {post.authorName}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <time style={{ fontSize: 12, color: "var(--text-secondary)" }}>
            {timeAgo(post.createdAt)}
          </time>
          {publisherName && (
            <>
              <button onClick={() => onEdit(post)} style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none" }} title="Ред.">✏️</button>
              <button onClick={() => { if (confirm("Удалить?")) onDelete(post._id); }} style={{ fontSize: 12, color: "var(--text-secondary)", cursor: "pointer", background: "none", border: "none" }}>🗑</button>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8, lineHeight: 1.3 }}>
        {post.title}
      </h3>

      {/* Image */}
      {post.imageUrl && (
        <img src={post.imageUrl} alt="" style={{ width: "100%", borderRadius: 8, marginBottom: 12, maxHeight: 320, objectFit: "cover" }} loading="lazy" />
      )}

      {/* Video */}
      {videoEmbed && (
        <div style={{ marginBottom: 12, borderRadius: 8, overflow: "hidden" }}>
          <iframe src={videoEmbed} style={{ width: "100%", aspectRatio: "16/9" }} allow="autoplay; encrypted-media" allowFullScreen loading="lazy" />
        </div>
      )}

      {/* Body */}
      <p style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
        {text}
      </p>
      {isLong && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{ fontSize: 12, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", marginTop: 4, fontWeight: 500 }}
        >
          {expanded ? "Свернуть" : "Ещё"}
        </button>
      )}
    </article>
  );
}

export default function NewsFeed({ publisherName, onEdit, onDelete, onNewPost, posts, loading }: NewsFeedProps) {
  return (
    <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
      {/* New post button */}
      {publisherName && (
        <button
          onClick={onNewPost}
          className="glass"
          style={{
            width: "100%", padding: "12px 16px", marginBottom: 12,
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            color: "var(--accent)", fontSize: 14, fontWeight: 500,
            cursor: "pointer", borderRadius: 12
          }}
        >
          + Написать новость
        </button>
      )}

      {/* Posts */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 8 }}>
        {posts.map((post) => (
          <NewsCard key={post._id} post={post} publisherName={publisherName} onEdit={onEdit} onDelete={onDelete} />
        ))}

        {!loading && posts.length === 0 && (
          <p style={{ textAlign: "center", padding: "48px 0", color: "var(--text-secondary)", fontSize: 14 }}>
            Новостей пока что нет
          </p>
        )}
      </div>
    </div>
  );
}
