import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { readUpgradeReturn, clearUpgradeReturn } from '../lib/upgradeUrls';

// Minimum gap between focus-driven plan refetches, so a user toggling between
// the app and browser doesn't hammer /api/me/plan.
const MIN_REFETCH_INTERVAL_MS = 3000;

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

  // Web return path — runs once on mount.
  useEffect(() => {
    const ret = readUpgradeReturn();
    if (!ret) return;

    // Always clear the param so a refresh doesn't re-toast.
    clearUpgradeReturn();

    if (ret === 'cancel') {
      // No entitlement change on cancel; just clear any in-flight marker.
      useUpgradeModalStore.getState().setCheckoutInFlight(false);
      return;
    }

    // success — refetch entitlement and confirm.
    void (async () => {
      try {
        await useAuthStore.getState().fetchPlan();
      } finally {
        useUpgradeModalStore.getState().setCheckoutInFlight(false);
        toast.success("You're all set — your subscription is active.");
      }
    })();
  }, []);

  // Desktop focus path — refetch while checkout is in flight.
  useEffect(() => {
    const onFocus = () => {
      const { checkoutInFlight, setCheckoutInFlight } = useUpgradeModalStore.getState();
      if (!checkoutInFlight) return;

      const now = Date.now();
      if (now - lastRefetchRef.current < MIN_REFETCH_INTERVAL_MS) return;
      lastRefetchRef.current = now;

      void (async () => {
        await useAuthStore.getState().fetchPlan();
        const tier = useAuthStore.getState().plan?.tier;
        if (tier === 'subscription') {
          // Entitlement landed — stop polling and confirm.
          setCheckoutInFlight(false);
          toast.success("You're all set — your subscription is active.");
        }
      })();
    };

    window.addEventListener('focus', onFocus);
    return () => window.removeEventListener('focus', onFocus);
  }, []);
}
