import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAuthModalStore } from '../stores/authModalStore';
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
    // fires on the logged-out path above.
    analyticsAdapter.track('paywall_hit', { feature });
    toast('Subscribe to unlock this feature');
    return false;
  };

  return { hasAccess, requireAccess };
}
