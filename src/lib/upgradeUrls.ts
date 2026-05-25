// success/cancel URLs handed to Stripe Checkout.
//
// The app has no router, so we deliberately do NOT point at app routes like
// /upgrade/success. Instead we return to the current origin with a query param
// that usePlanRefetchOnReturn reads on load (web), then strips. On desktop the
// redirect lands in the system browser, not the app — desktop relies on
// window-focus refetch instead, so these URLs are effectively only meaningful
// on web. Both are overridable via env if we later host dedicated pages on the
// marketing site.

const UPGRADE_SUCCESS_PARAM = 'upgrade';

function originBase(): string {
  // Guard for non-browser/test environments where window may be undefined.
  if (typeof window === 'undefined' || !window.location?.origin) {
    return 'https://app.qr-foundry.com';
  }
  return window.location.origin;
}

export function getUpgradeSuccessUrl(): string {
  const override = import.meta.env.VITE_UPGRADE_SUCCESS_URL as string | undefined;
  if (override) return override;
  return `${originBase()}/?${UPGRADE_SUCCESS_PARAM}=success`;
}

export function getUpgradeCancelUrl(): string {
  const override = import.meta.env.VITE_UPGRADE_CANCEL_URL as string | undefined;
  if (override) return override;
  return `${originBase()}/?${UPGRADE_SUCCESS_PARAM}=cancel`;
}

// Reads the upgrade return state from the current URL, if any. Returns null
// when there's no upgrade query param.
export function readUpgradeReturn(): 'success' | 'cancel' | null {
  if (typeof window === 'undefined') return null;
  const value = new URLSearchParams(window.location.search).get(UPGRADE_SUCCESS_PARAM);
  if (value === 'success' || value === 'cancel') return value;
  return null;
}

// Removes the upgrade query param from the address bar without a navigation,
// so a refresh doesn't re-trigger the success toast.
export function clearUpgradeReturn(): void {
  if (typeof window === 'undefined') return;
  const url = new URL(window.location.href);
  url.searchParams.delete(UPGRADE_SUCCESS_PARAM);
  window.history.replaceState({}, '', url.pathname + url.search + url.hash);
}
