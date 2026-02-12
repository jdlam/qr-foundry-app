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
  onExpired?.();
}

export function isSessionExpired(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return 'status' in err && (err as { status: number }).status === 401;
}
