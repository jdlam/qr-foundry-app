import { toast } from 'sonner';
import { useAuth } from './useAuth';
import { useAuthModalStore } from '../stores/authModalStore';
import { FREE_FEATURES } from '../api/types';
import type { FeatureKey } from '../api/types';

export function useFeatureAccess(feature: FeatureKey) {
  const { plan, isLoggedIn } = useAuth();

  const hasAccess = (plan?.features ?? FREE_FEATURES).includes(feature);

  const requireAccess = (): boolean => {
    if (hasAccess) return true;

    if (!isLoggedIn) {
      useAuthModalStore.getState().open();
      return false;
    }

    toast('Subscribe to unlock this feature');
    return false;
  };

  return { hasAccess, requireAccess };
}
