import { useAuth } from './useAuth';
import { useAuthModalStore } from '../stores/authModalStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { FREE_FEATURES } from '../api/types';
import { analyticsAdapter } from '@platform';
import type { FeatureKey } from '../api/types';

export function useFeatureAccess(feature: FeatureKey) {
  const { plan, isLoggedIn } = useAuth();

  const hasAccess = (plan?.features ?? FREE_FEATURES).includes(feature);

  const requireAccess = (): boolean => {
    if (hasAccess) return true;

    if (!isLoggedIn) {
      useAuthModalStore.getState().open('gated_feature');
      return false;
    }

    // Logged-in free user hit a paywall. This is the key friction signal for
    // free→paid conversion analysis — separate from auth_modal_opened, which
    // fires on the logged-out path above. The upgrade modal is the conversion
    // action: it leads to Stripe checkout (checkout_started fires there).
    analyticsAdapter.track('paywall_hit', { feature });
    useUpgradeModalStore.getState().open('gated_feature', feature);
    return false;
  };

  return { hasAccess, requireAccess };
}
