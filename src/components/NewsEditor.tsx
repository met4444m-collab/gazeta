import { useState } from "react";
import { convexMutation, getToken } from "../lib/convex";

interface NewsEditorProps {
  onCreated: () => void;
  onCancel: () => void;
  editPost?: { _id: any; title: string; body: string; imageUrl?: string; videoUrl?: string };
}

export default function NewsEditor({ onCreated, onCancel, editPost }: NewsEditorProps) {
  const [title, setTitle] = useState(editPost?.title || "");
  const [body, setBody] = useState(editPost?.body || "");
  const [imageUrl, setImageUrl] = useState(editPost?.imageUrl || "");
  const [videoUrl, setVideoUrl] = useState(editPost?.videoUrl || "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const isEditing = !!editPost;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const token = getToken();
      if (isEditing) {
        await convexMutation("news:update", { token, id: editPost._id, title: title.trim(), body: body.trim(), imageUrl: imageUrl.trim() || undefined, videoUrl: videoUrl.trim() || undefined });
      } else {
        await convexMutation("news:create", { token, title: title.trim(), body: body.trim(), imageUrl: imageUrl.trim() || undefined, videoUrl: videoUrl.trim() || undefined });
      }
      onCreated();
    } catch (err: any) {
      setError(err.message || "Ошибка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", overflowY: "auto", padding: "48px 16px" }}>
      <div className="glass-strong" style={{ width: "100%", maxWidth: 480, padding: 20, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>{isEditing ? "✏️ Редактировать" : "📝 Новая новость"}</h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#8888a0", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" required maxLength={200} style={inputStyle} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст новости..." required rows={5} maxLength={10000} style={{ ...inputStyle, resize: "none" }} />
          <input type="url" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Фото (ссылка)" style={inputStyle} />
          <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="Видео (YouTube/VK)" style={inputStyle} />
          {error && <p style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: "10px 0", border: "1px solid rgba(255,255,255,0.12)", background: "none", color: "#8888a0", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Отмена</button>
            <button type="submit" disabled={!title.trim() || !body.trim() || loading} style={{ flex: 1, padding: "10px 0", background: "rgba(108,159,255,0.15)", color: "#6c9fff", fontWeight: 500, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", opacity: (!title.trim() || !body.trim() || loading) ? 0.4 : 1 }}>
              {loading ? "..." : isEditing ? "Обновить" : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}