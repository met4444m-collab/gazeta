interface HeaderProps {
  publisherName: string | null;
  onLogout: () => void;
}

export default function Header({ publisherName, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong border-b border-white/5">
      <div className="max-w-2xl mx-auto px-4 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[var(--accent)]/15 flex items-center justify-center text-xs font-bold" style={{ color: "var(--accent)" }}>
            Л12
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>Лицей 12</span>
        </div>

        {publisherName && (
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: "var(--accent)" }}>{publisherName}</span>
            <button
              onClick={onLogout}
              className="text-xs hover:opacity-70 transition-opacity"
              style={{ color: "var(--text-secondary)" }}
            >
              Выйти
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
