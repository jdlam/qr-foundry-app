import { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { analyticsAdapter } from '@platform';

/**
 * First-run telemetry consent dialog.
 *
 * Privacy contract — see plans/architecture/adr/0002-desktop-opt-in-telemetry.md.
 *
 * Shows exactly once, only when the platform reports prompted===false.
 * On web, getConsent() returns prompted:true so this renders nothing — no
 * isTauri() branching needed here.
 */
export function TelemetryConsentDialog() {
  // null = still loading; true = show dialog; false = hide
  const [open, setOpen] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    analyticsAdapter.getConsent().then(({ prompted }) => {
      if (!cancelled) setOpen(!prompted);
    });
    return () => { cancelled = true; };
  }, []);

  // Render nothing until we know consent state, and nothing once dismissed
  if (open !== true) return null;

  const handleEnable = async () => {
    await analyticsAdapter.setConsentEnabled(true);
    await analyticsAdapter.markConsentPrompted();
    setOpen(false);
  };

  const handleDecline = async () => {
    await analyticsAdapter.markConsentPrompted();
    setOpen(false);
  };

  return (
    <Dialog.Root open={true} onOpenChange={(isOpen) => { if (!isOpen) void handleDecline(); }}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-50"
          style={{ background: 'rgba(0, 0, 0, 0.5)' }}
        />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-sm p-6 shadow-lg"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
          }}
        >
          <Dialog.Title
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Help improve QR Foundry
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            We&apos;d like to collect anonymous usage data — which features you use and how often
            you launch the app — to help decide whether the desktop build is worth maintaining.
          </Dialog.Description>

          <ul
            className="text-xs mb-5 flex flex-col gap-1"
            style={{ color: 'var(--text-secondary)' }}
          >
            <li>Anonymous install ID only — never your name, email, or account</li>
            <li>QR content and destinations are <strong>never</strong> sent</li>
            <li>Off by default — you can change this in Settings at any time</li>
          </ul>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleEnable}
              className="flex-1 text-sm font-medium rounded-sm px-3 py-2 transition-colors"
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-text, #fff)',
              }}
            >
              Enable
            </button>
            <button
              type="button"
              onClick={handleDecline}
              className="flex-1 text-sm font-medium rounded-sm px-3 py-2 transition-colors"
              style={{
                background: 'transparent',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              No thanks
            </button>
          </div>

          <Dialog.Close asChild>
            <button
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Close"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
