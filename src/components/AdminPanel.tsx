import { useEffect, useRef, useState } from "react";
import { register, login, setSession } from "../lib/convex";

interface AdminPanelProps {
  onRegistered: (name: string) => void;
}

// The login panel is hidden behind two secret triggers:
//   1. A fully invisible 40x40px zone in the very bottom-right corner of the
//      screen (off-screen content, above nothing interactive). It must be
//      tapped 5 times quickly (within 1.5s between taps) — easy to miss
//      accidentally because nothing visually reacts and there's no hover.
//   2. Typing "r13x" anywhere (handy on desktop).
const SECRET_SEQUENCE = ["r", "1", "3", "x"];
const REQUIRED_TAPS = 5;
const TAP_WINDOW_MS = 1500;
const isShortcut = (e: KeyboardEvent) =>
  e.ctrlKey && e.shiftKey && (e.key === "L" || e.key === "l");

export default function AdminPanel({ onRegistered }: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const typed = useRef<string[]>([]);
  const taps = useRef<number[]>([]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isShortcut(e)) {
        e.preventDefault();
        typed.current = [];
        setIsOpen(true);
        return;
      }
      if (e.key.length !== 1) return; // ignore Shift, Backspace, etc.
      typed.current = [...typed.current, e.key.toLowerCase()].slice(-SECRET_SEQUENCE.length);
      if (SECRET_SEQUENCE.every((c, i) => typed.current[i] === c)) {
        typed.current = [];
        setIsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleSecretTap = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((t) => now - t < TAP_WINDOW_MS), now];
    if (taps.current.length >= REQUIRED_TAPS) {
      taps.current = [];
      setIsOpen(true);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      let result: { token: string; name: string; role: string };
      try {
        result = await register(name.trim(), code.trim());
      } catch (err: any) {
        if (String(err.message).includes("уже существует")) {
          result = await login(name.trim(), code.trim());
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
      {/* Invisible trigger: tiny zone in the extreme bottom-right corner */}
      <button
        onClick={handleSecretTap}
        style={{ position: "fixed", bottom: 0, right: 0, width: 40, height: 40, opacity: 0, zIndex: 60, cursor: "default", background: "none", border: "none" }}
        aria-hidden="true"
        tabIndex={-1}
      />
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
