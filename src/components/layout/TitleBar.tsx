import { useThemeStore } from '../../stores/themeStore';
import { isTauri } from '../../lib/platform';

export function TitleBar() {
  const { theme, setTheme, resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme();
  const isMacTauri = isTauri() && navigator.platform?.includes('Mac');

  const toggleTheme = () => {
    if (theme === 'system') {
      setTheme(isDark === 'dark' ? 'light' : 'dark');
    } else {
      setTheme(theme === 'dark' ? 'light' : 'dark');
    }
  };

  return (
    <div
      data-tauri-drag-region
      className="h-[38px] flex items-center shrink-0 relative z-50"
      style={{
        background: 'var(--titlebar-bg)',
        borderBottom: '1px solid var(--border)',
        // On macOS with overlay titlebar, leave space for native traffic lights
        paddingLeft: isMacTauri ? '96px' : '16px',
        paddingRight: '16px',
      }}
    >
      {/* Logo + Title */}
      <div className="flex items-center gap-2 font-mono font-semibold text-[13px] tracking-tight" style={{ color: 'var(--text-primary)' }}>
        <div
          className="w-4 h-4 flex items-center justify-center shrink-0"
          style={{ background: 'var(--accent)', borderRadius: '1px' }}
        >
          <svg viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[9px] h-[9px]">
            <rect x="0" y="0" width="8" height="2" fill="white"/>
            <rect x="0" y="0" width="2" height="8" fill="white"/>
            <rect x="6" y="0" width="2" height="8" fill="white"/>
            <rect x="0" y="6" width="8" height="2" fill="white"/>
            <rect x="2.5" y="2.5" width="3" height="3" fill="white"/>
            <rect x="10" y="0" width="8" height="2" fill="white"/>
            <rect x="10" y="0" width="2" height="8" fill="white"/>
            <rect x="16" y="0" width="2" height="8" fill="white"/>
            <rect x="10" y="6" width="8" height="2" fill="white"/>
            <rect x="12.5" y="2.5" width="3" height="3" fill="white"/>
            <rect x="0" y="10" width="8" height="2" fill="white"/>
            <rect x="0" y="10" width="2" height="8" fill="white"/>
            <rect x="6" y="10" width="2" height="8" fill="white"/>
            <rect x="0" y="16" width="8" height="2" fill="white"/>
            <rect x="2.5" y="12.5" width="3" height="3" fill="white"/>
          </svg>
        </div>
        QR Foundry
      </div>

      {/* Right side controls */}
      <div className="ml-auto flex items-center gap-1">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
          style={{ color: 'var(--text-muted)', background: 'transparent' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--text-primary)';
            e.currentTarget.style.background = 'var(--hover-bg)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--text-muted)';
            e.currentTarget.style.background = 'transparent';
          }}
          aria-label="Toggle theme"
        >
          {isDark === 'dark' ? (
            // Sun icon (shown in dark mode — click to go light)
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          ) : (
            // Moon icon (shown in light mode — click to go dark)
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          )}
        </button>

        {/* Window controls (non-macOS Tauri) */}
        {isTauri() && !isMacTauri && (
          <div className="flex ml-2">
            <button
              className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Minimize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="2" y1="6" x2="10" y2="6" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Maximize"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="2" width="8" height="8" rx="0.5" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </button>
            <button
              className="w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)', background: 'transparent' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-muted)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="2" y1="2" x2="10" y2="10" stroke="currentColor" strokeWidth="1.5"/><line x1="10" y1="2" x2="2" y2="10" stroke="currentColor" strokeWidth="1.5"/></svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
