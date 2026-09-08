import { useState, useCallback } from "react";

interface AdminPanelProps {
  onRegistered: (name: string) => void;
}

export default function AdminPanel({ onRegistered }: AdminPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [_clickCount, setClickCount] = useState(0);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSecretClick = useCallback(() => {
    setClickCount((prev) => {
      const next = prev + 1;
      if (next >= 3) {
        setIsOpen(true);
        return 0;
      }
      // Reset after 2 seconds if not completed
      setTimeout(() => setClickCount(0), 2000);
      return next;
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { ConvexClient } = await import("convex/browser");
      const client = new ConvexClient(import.meta.env.VITE_CONVEX_URL);
      
      const result = await client.mutation("users:register" as any, {
        name: name.trim(),
        code: code.trim(),
      });

      if (result) {
        setSuccess(true);
        localStorage.setItem("publisher_name", name.trim());
        onRegistered(name.trim());
      }
    } catch (err: any) {
      setError(err.message || "Ошибка регистрации.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Invisible trigger button - top left */}
      <button
        onClick={handleSecretClick}
        className="fixed top-0 left-0 z-50 w-16 h-16 opacity-0 cursor-default"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Admin Panel Modal */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="glass-strong w-full max-w-md mx-4 p-6 rounded-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-primary">
                🔐 Панель доступа
              </h2>
              <button
                onClick={() => { setIsOpen(false); setCode(""); setName(""); setError(""); setSuccess(false); }}
                className="text-text-secondary hover:text-text-primary transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">✅</div>
                <p className="text-text-primary font-medium">Добро пожаловать, {name}!</p>
                <p className="text-text-secondary text-sm mt-2">Теперь вы можете публиковать новости.</p>
                <button
                  onClick={() => { setIsOpen(false); setSuccess(false); }}
                  className="mt-6 px-6 py-2 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors"
                >
                  Закрыть
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    Ваше имя
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Иван Иванов"
                    required
                    minLength={2}
                    maxLength={50}
                    className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm text-text-secondary mb-1.5">
                    Код доступа
                  </label>
                  <input
                    type="password"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="40-значный код"
                    required
                    className="w-full px-4 py-2.5 bg-white/5 border border-glass-border rounded-lg text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/30 transition-all font-mono"
                  />
                </div>

                {error && (
                  <p className="text-danger text-sm">{error}</p>
                )}

                <button
                  type="submit"
                  disabled={loading || !code || !name}
                  className="w-full py-2.5 bg-accent/20 text-accent font-medium rounded-lg hover:bg-accent/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  {loading ? "Проверка..." : "Войти как издатель"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
