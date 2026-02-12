import { toast } from 'sonner';

type Handler = (() => void) | null;

let onExpired: Handler = null;
let fired = false;

export function registerSessionExpiredHandler(handler: Handler) {
  onExpired = handler;
}

export function resetSessionExpiredFlag() {
  fired = false;
}

export function handleSessionExpired() {
  if (fired) return;
  fired = true;
  toast.error('Session expired — please sign in again');
  try {
    onExpired?.();
  } catch {
    // Swallow handler errors to keep session expiry handling resilient
  }
}

export function isSessionExpired(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const status = (err as { status?: unknown }).status;
  return typeof status === 'number' && status === 401;
}
