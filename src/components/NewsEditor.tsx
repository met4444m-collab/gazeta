import { useState, useRef } from "react";
import { createNews, updateNews, getToken, uploadFile } from "../lib/convex";

interface MediaItem {
  type: "image" | "video";
  url: string;
  status?: "uploading" | "done";
  name?: string;
}

interface NewsEditorProps {
  onCreated: () => void;
  onCancel: () => void;
  editPost?: { _id: any; title: string; body: string; media: { type: string; url: string }[] };
}

// Downscale large images client-side so they load fast even on bad connections.
async function compressImage(file: File): Promise<Blob> {
  if (file.type === "image/gif") return file; // don't break animations
  if (file.type !== "image/jpeg" && file.type !== "image/png" && file.type !== "image/webp") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const MAX_DIM = 1600;
    const scale = Math.min(1, MAX_DIM / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", 0.82));
    if (!blob || blob.size >= file.size) return file;
    return blob;
  } catch {
    return file;
  }
}

export default function NewsEditor({ onCreated, onCancel, editPost }: NewsEditorProps) {
  const [title, setTitle] = useState(editPost?.title || "");
  const [body, setBody] = useState(editPost?.body || "");
  const [media, setMedia] = useState<MediaItem[]>(
    (editPost?.media || []).map((m) => ({ type: m.type as "image" | "video", url: m.url, status: "done" }))
  );
  const [mediaUrl, setMediaUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const isEditing = !!editPost;

  const inputStyle: React.CSSProperties = { width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.6)", border: "1px solid rgba(60,50,35,0.15)", borderRadius: 8, color: "#2b2620", fontSize: 14, outline: "none" };

  const addFiles = async (files: FileList | null) => {
    if (!files || !files.length) return;
    setError("");
    setBusy(true);
    try {
      const token = getToken();
      const slots = 10 - media.length;
      const list = Array.from(files).slice(0, slots);
      for (const file of list) {
        const placeholder: MediaItem = {
          type: file.type.startsWith("video") ? "video" : "image",
          url: "",
          status: "uploading",
          name: file.name,
        };
        setMedia((prev) => [...prev, placeholder]);
        try {
          let toUpload: Blob = file;
          if (placeholder.type === "image") toUpload = await compressImage(file);
          const finalType = toUpload === file ? file.type : "image/jpeg";
          const res = await uploadFile(token, new File([toUpload], file.name, { type: finalType }));
          setMedia((prev) => prev.map((m) => (m === placeholder ? { type: res.type as "image" | "video", url: res.url, status: "done" } : m)));
        } catch (e: any) {
          setMedia((prev) => prev.filter((m) => m !== placeholder));
          setError(e.message || "Не удалось загрузить файл.");
        }
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const addMediaUrl = () => {
    const u = mediaUrl.trim();
    if (!u) return;
    if (!/^https:\/\//.test(u)) { setError("Ссылка должна начинаться с https://"); return; }
    if (media.length >= 10) { setError("Максимум 10 файлов на пост."); return; }
    const isVideo = /youtube\.com|youtu\.be|vk\.com|\.mp4($|\?)|\.webm($|\?)/i.test(u);
    setMedia((prev) => [...prev, { type: isVideo ? "video" : "image", url: u, status: "done" }]);
    setMediaUrl("");
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (media.some((m) => m.status === "uploading")) { setError("Дождитесь загрузки файлов."); return; }
    setError("");
    setBusy(true);
    try {
      const token = getToken();
      const clean = media.filter((m) => m.url).map((m) => ({ type: m.type, url: m.url }));
      if (isEditing) {
        await updateNews(token, editPost._id, { title: title.trim(), body: body.trim(), media: clean });
      } else {
        await createNews(token, { title: title.trim(), body: body.trim(), media: clean });
      }
      onCreated();
    } catch (err: any) {
      setError(err.message || "Ошибка.");
    } finally {
      setBusy(false);
    }
  };

  const uploadingCount = media.filter((m) => m.status === "uploading").length;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "flex-start", justifyContent: "center", background: "rgba(80,65,45,0.35)", backdropFilter: "blur(8px)", overflowY: "auto", padding: "48px 16px" }}>
      <div className="glass-strong" style={{ width: "100%", maxWidth: 520, padding: 20, borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#2b2620" }}>{isEditing ? "✏️ Редактировать" : "📝 Новая новость"}</h2>
          <button onClick={onCancel} style={{ background: "none", border: "none", color: "#8a8378", fontSize: 20, cursor: "pointer" }}>×</button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок" required maxLength={200} style={inputStyle} />
          <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Текст новости..." required rows={5} maxLength={10000} style={{ ...inputStyle, resize: "vertical" }} />

          {/* Media attach zone */}
          <div style={{ border: "1px dashed rgba(60,50,35,0.25)", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="button" onClick={() => fileRef.current?.click()} disabled={busy || media.length >= 10} style={{ flex: 1, padding: "10px 0", background: "rgba(184,100,31,0.1)", border: "none", color: "#b8641f", borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: "pointer", opacity: busy || media.length >= 10 ? 0.5 : 1 }}>
                📎 Фото/видео с устройства ({media.length}/10)
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" multiple hidden onChange={(e) => addFiles(e.target.files)} />
            {media.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, background: "rgba(60,50,35,0.05)", borderRadius: 8, padding: 8 }}>
                {m.status === "uploading" ? (
                  <div style={{ width: 56, height: 42, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⏳</div>
                ) : m.type === "image" ? (
                  <img src={m.url} alt="" style={{ width: 56, height: 42, objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <div style={{ width: 56, height: 42, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, background: "rgba(184,100,31,0.1)" }}>🎬</div>
                )}
                <span style={{ flex: 1, fontSize: 12, color: m.status === "uploading" ? "#b8641f" : "#8a8378", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {m.status === "uploading" ? `Загрузка: ${m.name}` : m.type === "video" ? "Видео" : "Фото"}
                </span>
                <button type="button" onClick={() => setMedia((prev) => prev.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#d64545", fontSize: 14, cursor: "pointer" }}>✕</button>
              </div>
            ))}
            <input type="url" value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder="…или вставьте ссылку (фото / YouTube / VK)" style={{ ...inputStyle, fontSize: 13 }} />
            <button type="button" onClick={addMediaUrl} disabled={!mediaUrl.trim() || media.length >= 10} style={{ alignSelf: "flex-start", padding: "6px 14px", background: "none", border: "1px solid rgba(60,50,35,0.18)", color: "#8a8378", borderRadius: 8, fontSize: 12, cursor: "pointer" }}>
              + Добавить по ссылке
            </button>
          </div>

          {error && <p style={{ color: "#d64545", fontSize: 12 }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, paddingTop: 4 }}>
            <button type="button" onClick={onCancel} style={{ flex: 1, padding: "10px 0", border: "1px solid rgba(60,50,35,0.15)", background: "none", color: "#8a8378", borderRadius: 8, fontSize: 14, cursor: "pointer" }}>Отмена</button>
            <button type="submit" disabled={!title.trim() || !body.trim() || busy || uploadingCount > 0} style={{ flex: 1, padding: "10px 0", background: "rgba(184,100,31,0.14)", color: "#b8641f", fontWeight: 500, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", opacity: (!title.trim() || !body.trim() || busy || uploadingCount > 0) ? 0.4 : 1 }}>
              {busy ? "..." : isEditing ? "Обновить" : "Опубликовать"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
