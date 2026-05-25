import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { readUpgradeReturn, clearUpgradeReturn } from '../lib/upgradeUrls';

// Minimum gap between focus-driven plan refetches, so a user toggling between
// the app and browser doesn't hammer /api/me/plan.
const MIN_REFETCH_INTERVAL_MS = 3000;
const WEB_CONFIRM_ATTEMPTS = 3;
const WEB_CONFIRM_RETRY_MS = 1000;

const SUBSCRIPTION_ACTIVE_MESSAGE = "You're all set — your subscription is active.";
const SUBSCRIPTION_CONFIRM_ERROR =
  "Checkout returned, but we couldn't confirm your subscription yet. Please refresh in a moment.";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function refetchPlanAndCheckSubscription(): Promise<boolean> {
  await useAuthStore.getState().fetchPlan();
  return useAuthStore.getState().plan?.tier === 'subscription';
}

// Re-fetches the user's plan after they return from Stripe-hosted checkout, so
// the new entitlement (subscription tier) shows up without a manual reload.
//
// Two return paths:
//   - Web: Stripe redirects back to the app origin with ?upgrade=success. We
//     detect that on mount, refetch, toast, and strip the param.
//   - Desktop: payment happens in the system browser, so there's no redirect
//     into the app. We refetch on window focus while a checkout is in flight,
//     and surface success once the tier flips to subscription.
export function usePlanRefetchOnReturn(): void {
  // Tracks the last refetch time to throttle the focus path.
  const lastRefetchRef = useRef(0);
  const upgradeReturnRef = useRef<'success' | 'cancel' | null>(null);
  const handledReturnRef = useRef(false);
  const isAuthLoading = useAuthStore((s) => s.isLoading);
  const token = useAuthStore((s) => s.token);

  // Capture the web return path once on mount and strip the param immediately so
  // a refresh does not re-toast. The actual refetch waits for auth initialization
  // below because the token is restored asynchronously from platform storage.
  useEffect(() => {
    const ret = readUpgradeReturn();
    if (!ret) return;

    upgradeReturnRef.current = ret;
    clearUpgradeReturn();
  }, []);

  // Web return path — wait for auth initialization before acting on success.
  useEffect(() => {
    const ret = upgradeReturnRef.current;
    if (!ret || handledReturnRef.current || isAuthLoading) return;
    handledReturnRef.current = true;

    if (ret === 'cancel') {
      // No entitlement change on cancel; just clear any in-flight marker.
      useUpgradeModalStore.getState().setCheckoutInFlight(false);
      return;
    }

    void (async () => {
      try {
        if (!token) {
          throw new Error('Missing auth token after checkout return');
        }

        for (let attempt = 1; attempt <= WEB_CONFIRM_ATTEMPTS; attempt += 1) {
          if (await refetchPlanAndCheckSubscription()) {
            useUpgradeModalStore.getState().setCheckoutInFlight(false);
            toast.success(SUBSCRIPTION_ACTIVE_MESSAGE);
            return;
          }

          if (attempt < WEB_CONFIRM_ATTEMPTS) {
            await sleep(WEB_CONFIRM_RETRY_MS);
          }
        }

        throw new Error('Subscription tier was not active after checkout return');
      } catch {
        toast.error(SUBSCRIPTION_CONFIRM_ERROR);
        useUpgradeModalStore.getState().setCheckoutInFlight(false);
      }
    })();
  }, [isAuthLoading, token]);

  // Desktop focus path — refetch while checkout is in flight.
  useEffect(() => {
    const onFocus = () => {
      const { checkoutInFlight, setCheckoutInFlight } = useUpgradeModalStore.getState();
      if (!checkoutInFlight) return;

      const now = Date.now();
      if (now - lastRefetchRef.current < MIN_REFETCH_INTERVAL_MS) return;
      lastRefetchRef.current = now;

      void (async () => {
        try {
          if (await refetchPlanAndCheckSubscription()) {
            // Entitlement landed — stop polling and confirm.
            setCheckoutInFlight(false);
            toast.success(SUBSCRIPTION_ACTIVE_MESSAGE);
          }
        } catch {
          // Keep checkoutInFlight set so a later focus can retry quietly.
        }
      })();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
}
