

interface HeaderProps {
  publisherName: string | null;
  onLogout: () => void;
}

export default function Header({ publisherName, onLogout }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-strong">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-accent/20 flex items-center justify-center text-sm font-bold text-accent">
            Л12
          </div>
          <div>
            <h1 className="text-sm font-bold text-text-primary leading-none">Лицей 12</h1>
            <p className="text-[10px] text-text-secondary leading-none mt-0.5">Газета</p>
          </div>
        </div>

        {/* User */}
        <div className="flex items-center gap-3">
          {publisherName ? (
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-secondary hidden sm:inline">
                {publisherName}
              </span>
              <button
                onClick={onLogout}
                className="text-xs text-text-secondary hover:text-danger transition-colors"
              >
                Выйти
              </button>
            </div>
          ) : (
            <span className="text-xs text-text-secondary">
              👁️ Чтение
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
