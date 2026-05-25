import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlanRefetchOnReturn } from './usePlanRefetchOnReturn';
import { useAuthStore } from '../stores/authStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

// Overriding store actions (fetchPlan) needs to bypass the strict store type.
type AuthPartial = typeof useAuthStore extends { getState: () => infer S } ? Partial<S> : never;

function setSearch(search: string) {
  window.history.replaceState({}, '', `/${search}`);
}

beforeEach(() => {
  vi.clearAllMocks();
  setSearch('');
  useUpgradeModalStore.setState({ isOpen: false, feature: null, checkoutInFlight: false });
});

afterEach(() => {
  setSearch('');
});

describe('usePlanRefetchOnReturn', () => {
  describe('web return path (on mount)', () => {
    // The new entitlement must appear without a manual reload, and the param
    // must be stripped so a refresh doesn't re-fire the success toast.
    it('on ?upgrade=success refetches the plan, confirms, clears in-flight, and strips the param', async () => {
      setSearch('?upgrade=success');
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({ fetchPlan } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      await act(async () => {
        renderHook(() => usePlanRefetchOnReturn());
      });

      expect(fetchPlan).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
      expect(window.location.search).toBe('');
    });

    // Cancel means no entitlement change — we must not refetch or claim success,
    // just clear the in-flight marker so desktop stops watching.
    it('on ?upgrade=cancel clears in-flight but does not refetch or toast success', async () => {
      setSearch('?upgrade=cancel');
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({ fetchPlan } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      await act(async () => {
        renderHook(() => usePlanRefetchOnReturn());
      });

      expect(fetchPlan).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
      expect(window.location.search).toBe('');
    });

    it('does nothing when there is no upgrade param', async () => {
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({ fetchPlan } as unknown as AuthPartial);

      await act(async () => {
        renderHook(() => usePlanRefetchOnReturn());
      });

      expect(fetchPlan).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    });
  });

  describe('desktop focus path', () => {
    // Desktop has no redirect back into the app, so the only signal that a
    // payment may have completed is the window regaining focus while a checkout
    // is in flight. Once the tier flips, we confirm and stop watching.
    it('refetches on focus while in flight and confirms once the tier becomes subscription', async () => {
      const fetchPlan = vi.fn().mockImplementation(async () => {
        useAuthStore.setState({
          plan: { tier: 'subscription', features: [], maxCodes: 25 },
        } as unknown as AuthPartial);
      });
      useAuthStore.setState({
        fetchPlan,
        plan: { tier: 'free', features: [], maxCodes: 0 },
      } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      renderHook(() => usePlanRefetchOnReturn());

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(fetchPlan).toHaveBeenCalledTimes(1);
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
      expect(toast.success).toHaveBeenCalled();
    });

    it('does not refetch on focus when no checkout is in flight', async () => {
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({ fetchPlan } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: false });

      renderHook(() => usePlanRefetchOnReturn());

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(fetchPlan).not.toHaveBeenCalled();
    });

    // Without throttling, a user toggling between app and browser would hammer
    // /api/me/plan on every focus event.
    it('throttles rapid focus events so it does not hammer the plan endpoint', async () => {
      // tier never flips, so the in-flight flag stays set across focus events.
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({
        fetchPlan,
        plan: { tier: 'free', features: [], maxCodes: 0 },
      } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      renderHook(() => usePlanRefetchOnReturn());

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });
      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(fetchPlan).toHaveBeenCalledTimes(1);
    });
  });
});
