import { useRef, useState } from "react";
import { convexMutation, setSession } from "../lib/convex";

interface AdminPanelProps {
  onRegistered: (name: string) => void;
}

export default function AdminPanel({ onRegistered }: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Secret button: must be clicked 3 times in a row (within 2s between clicks)
  const handleSecretClick = () => {
    clickCount.current += 1;
    if (clickTimer.current) clearTimeout(clickTimer.current);
    if (clickCount.current >= 3) {
      clickCount.current = 0;
      setIsOpen(true);
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result: { token: string; name: string; role: string };
      try {
        // Try registration first (new name)
        result = await convexMutation("users:register", { name: name.trim(), code: code.trim() });
      } catch (err: any) {
        // If the name already exists, fall back to login
        if (String(err.message).includes("уже существует")) {
          result = await convexMutation("users:login", { name: name.trim(), code: code.trim() });
        } else {
          throw err;
        }
      }
      setSession(result.token, result.name);
      onRegistered(result.name);
      setIsOpen(false);
    } catch (err: any) {
      setError(err.message || "Ошибка.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button onClick={handleSecretClick} style={{ position: "fixed", top: 0, left: 0, zIndex: 60, width: 80, height: 64, opacity: 0, cursor: "default" }} aria-hidden="true" />
      {isOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)", padding: 16 }}>
          <div className="glass-strong" style={{ width: "100%", maxWidth: 360, padding: 24, borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 700, color: "#e8e8f0" }}>🔐 Доступ</h2>
              <button onClick={() => { setIsOpen(false); setError(""); }} style={{ background: "none", border: "none", color: "#8888a0", fontSize: 20, cursor: "pointer" }}>×</button>
            </div>
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ваше имя" required minLength={2} style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none" }} />
              <input type="password" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Код доступа" required style={{ width: "100%", padding: "10px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "#e8e8f0", fontSize: 14, outline: "none", fontFamily: "monospace" }} />
              {error && <p style={{ color: "#ff6b6b", fontSize: 12 }}>{error}</p>}
              <button type="submit" disabled={!code || !name || loading} style={{ width: "100%", padding: "10px 0", background: "rgba(108,159,255,0.15)", color: "#6c9fff", fontWeight: 500, border: "none", borderRadius: 8, fontSize: 14, cursor: "pointer", opacity: (!code || !name || loading) ? 0.4 : 1 }}>
                {loading ? "⏳ Проверяю..." : "Войти"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
