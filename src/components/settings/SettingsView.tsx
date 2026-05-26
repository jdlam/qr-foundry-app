import { useEffect, useState } from 'react';
import { analyticsAdapter } from '@platform';
import { isTauri } from '../../lib/platform';

/**
 * A minimal accessible toggle switch styled with the app's CSS variables.
 */
function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="relative inline-flex items-center rounded-full transition-colors shrink-0"
      style={{
        width: 38,
        height: 22,
        background: checked ? 'var(--accent)' : 'var(--border)',
      }}
    >
      <span
        className="inline-block rounded-full transition-transform"
        style={{
          width: 16,
          height: 16,
          background: '#fff',
          transform: checked ? 'translateX(19px)' : 'translateX(3px)',
        }}
      />
    </button>
  );
}

/**
 * Settings view. Currently hosts the desktop telemetry consent toggle.
 *
 * The telemetry section only renders on the desktop build (isTauri()); the web
 * app's analytics posture is fixed (cookieless / implicit-via-ToS, see ADR-0001),
 * so there is nothing to toggle there.
 */
export function SettingsView() {
  // null while loading consent state from the platform store
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyticsAdapter.getConsent().then((consent) => {
      if (!cancelled) setEnabled(consent.enabled);
    }).catch(() => {
      // Fail safe: if the store can't be read, treat telemetry as off rather
      // than blocking the Settings view indefinitely on a null state.
      if (!cancelled) setEnabled(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = async (value: boolean) => {
    // Optimistic update: show the new state immediately for snappy UX.
    // WHY we capture prev and revert: the consent toggle controls a privacy
    // setting — if the store write fails, the displayed state MUST match what's
    // actually on disk. Showing "off" while telemetry is still on (or vice versa)
    // would be a privacy regression, so we revert rather than leaving a lie in the UI.
    const prev = enabled;
    setEnabled(value);
    try {
      await analyticsAdapter.setConsentEnabled(value);
    } catch {
      setEnabled(prev);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6">
      <h1 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
        Settings
      </h1>

      {isTauri() ? (
        <section
          className="rounded-sm p-4"
          style={{ background: 'var(--panel-bg)', border: '1px solid var(--border)' }}
        >
          <h2
            className="text-[11px] font-mono font-bold uppercase tracking-wide mb-3"
            style={{ color: 'var(--text-faint)' }}
          >
            Privacy
          </h2>
          <div className="flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                Share anonymous usage data
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Helps us decide whether the desktop app is worth maintaining. Anonymous install ID
                only — your name, email, and QR content/destinations are never sent. Off by default.
              </div>
            </div>
            <Toggle
              checked={enabled === true}
              onChange={handleToggle}
              label="Share anonymous usage data"
            />
          </div>
        </section>
      ) : (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          No configurable settings.
        </p>
      )}
    </div>
  );
}
