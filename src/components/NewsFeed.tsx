import { useState } from "react";

interface MediaItem {
  type: string;
  url: string;
}

interface NewsPost {
  _id: string;
  title: string;
  body: string;
  media: MediaItem[];
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

// A single media block — direct file (image/video) or an embed for YouTube/VK links
function MediaBlock({ item }: { item: MediaItem }) {
  const yt = item.type === "video" ? getYouTubeEmbed(item.url) : null;
  const vk = item.type === "video" ? getVKEmbed(item.url) : null;

  if (yt) {
    return (
      <div className="media-frame">
        <iframe src={yt} style={{ width: "100%", aspectRatio: "16/9", border: "none" }} allow="autoplay; encrypted-media" allowFullScreen loading="lazy" title="Видео" />
      </div>
    );
  }
  if (vk) {
    return (
      <div className="media-frame">
        <iframe src={vk} style={{ width: "100%", aspectRatio: "16/9", border: "none" }} allow="autoplay; encrypted-media; fullscreen; picture-in-picture" allowFullScreen loading="lazy" title="Видео" />
      </div>
    );
  }
  if (item.type === "video" && /\.(mp4|webm|mov)($|\?)/i.test(item.url)) {
    return (
      <div className="media-frame">
        <video src={item.url} controls preload="metadata" style={{ width: "100%", maxHeight: 380, display: "block", borderRadius: 10, background: "#000" }} />
      </div>
    );
  }
  if (item.type === "image") {
    return (
      <div className="media-frame">
        <img src={item.url} alt="" loading="lazy" decoding="async" style={{ width: "100%", maxHeight: 420, objectFit: "cover", display: "block", borderRadius: 10 }} />
      </div>
    );
  }
  // Unknown video link — show a clickable link instead of a broken embed
  return (
    <a href={item.url} target="_blank" rel="noreferrer" className="media-frame" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, color: "var(--accent)", fontSize: 13, textDecoration: "none" }}>
      🎬 Смотреть видео
    </a>
  );
}

function NewsCard({ post, publisherName, onEdit, onDelete }: {
  post: NewsPost;
  publisherName: string | null;
  onEdit: (p: NewsPost) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasBody = post.body.trim().length > 0;

  return (
    <article className="glass news-card">
      {/* Author row */}
      <div className="news-meta">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div className="news-avatar">{post.authorName.charAt(0).toUpperCase()}</div>
          <span className="news-author">{post.authorName}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <time className="news-time">{timeAgo(post.createdAt)}</time>
          {publisherName && (
            <>
              <button onClick={() => onEdit(post)} className="news-action" title="Редактировать">✏️</button>
              <button onClick={() => { if (confirm("Удалить эту новость?")) onDelete(post._id); }} className="news-action" title="Удалить">🗑</button>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      <h3 className="news-title">{post.title}</h3>

      {/* Media: first item big, the rest in a grid */}
      {post.media.length > 0 && (
        <div className="media-grid" style={{ gridTemplateColumns: post.media.length === 1 ? "1fr" : "1fr 1fr" }}>
          {post.media.map((m, i) => (
            <MediaBlock key={i} item={m} />
          ))}
        </div>
      )}

      {/* Collapsible article text */}
      {hasBody && (
        <>
          <button onClick={() => setExpanded(!expanded)} className="expand-btn" aria-expanded={expanded}>
            <span className="expand-arrow" style={{ transform: expanded ? "rotate(180deg)" : "none", transition: "transform 0.25s ease" }}>»</span>
            <span>{expanded ? "Свернуть статью" : "Читать статью"}</span>
          </button>
          <div className="news-body" style={{ display: expanded ? "block" : "none" }}>
            <p style={{ whiteSpace: "pre-wrap" }}>{post.body}</p>
          </div>
        </>
      )}
    </article>
  );
}

export default function NewsFeed({ publisherName, onEdit, onDelete, onNewPost, posts, loading }: NewsFeedProps) {
  return (
    <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>
      {publisherName && (
        <button
          onClick={onNewPost}
          className="glass new-post-btn"
        >
          + Написать новость
        </button>
      )}

      <div className="feed-list">
        {posts.map((post) => (
          <NewsCard key={post._id} post={post} publisherName={publisherName} onEdit={onEdit} onDelete={onDelete} />
        ))}

        {loading && posts.length === 0 && (
          <p style={{ textAlign: "center", padding: "48px 0", color: "var(--text-secondary)", fontSize: 14 }}>Загрузка…</p>
        )}
        {!loading && posts.length === 0 && (
          <p style={{ textAlign: "center", padding: "48px 0", color: "var(--text-secondary)", fontSize: 14 }}>
            Новостей пока что нет
          </p>
        )}
      </div>

      <style>{`
        .news-card { width: 100%; padding: 16px; border-radius: 14px; }
        .news-meta { display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; }
        .news-avatar {
          width: 30px; height: 30px; border-radius: 50%;
          background: rgba(184, 100, 31, 0.12);
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: var(--accent);
        }
        .news-author { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .news-time { font-size: 12px; color: var(--text-secondary); }
        .news-action { font-size: 13px; color: var(--text-secondary); cursor: pointer; background: none; border: none; padding: 2px 4px; border-radius: 6px; transition: background 0.15s; }
        .news-action:hover { background: rgba(60,50,35,0.08); }
        .news-title {
          font-size: 18px; font-weight: 700; color: var(--text-primary);
          margin: 0 0 12px; line-height: 1.35; letter-spacing: 0.01em;
        }
        .media-grid { display: grid; gap: 8px; margin-bottom: 12px; }
        .media-frame { margin: 0; border-radius: 10px; overflow: hidden; background: rgba(60,50,35,0.04); border: 1px solid rgba(60,50,35,0.08); }
        .expand-btn {
          display: flex; align-items: center; gap: 8px;
          width: 100%; padding: 9px 12px; margin-top: 2px;
          background: rgba(184,100,31,0.08);
          border: 1px solid rgba(184,100,31,0.22);
          border-radius: 10px; cursor: pointer;
          color: var(--accent); font-size: 13px; font-weight: 600;
          transition: background 0.15s;
        }
        .expand-btn:hover { background: rgba(184,100,31,0.14); }
        .expand-arrow { font-size: 17px; line-height: 1; }
        .news-body { margin-top: 12px; padding-top: 12px; border-top: 1px solid rgba(60,50,35,0.1); }
        .news-body p { font-size: 14px; color: var(--text-secondary); line-height: 1.65; }
        .new-post-btn {
          width: 100%; padding: 12px 16px; margin-bottom: 12px;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          color: var(--accent); font-size: 14px; font-weight: 500;
          cursor: pointer; border-radius: 12px; border: none;
        }
        .feed-list { display: flex; flex-direction: column; gap: 12px; padding-top: 8px; }
      `}</style>
    </div>
  );
}
