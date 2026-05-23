import { analyticsAdapter } from '@platform';

/**
 * `qr_generated` fires on the first "commit action" (validate, export, copy)
 * per unique QR. The dedup signature is (input_type, content) — if the user
 * exports the same QR as PNG and then copies it, we fire once, not twice. If
 * they then edit the content and export again, we fire again.
 *
 * The signature lives in memory only and is never sent to PostHog. The event
 * itself carries only the enum input_type — content is treated as PII and
 * stays local.
 */

let lastFiredSignature: string | null = null;

export type CommittedVia = 'validate' | 'export' | 'copy';

export function fireQrGeneratedIfNew(
  inputType: string,
  content: string,
  committedVia: CommittedVia,
): void {
  const signature = `${inputType}:${content}`;
  if (signature === lastFiredSignature) return;
  lastFiredSignature = signature;
  analyticsAdapter.track('qr_generated', {
    input_type: inputType,
    committed_via: committedVia,
  });
}

// Exported only for tests — resets the dedup cache.
export function _resetQrGeneratedTrackerForTests(): void {
  lastFiredSignature = null;
}
