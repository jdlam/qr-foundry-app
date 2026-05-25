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
  useAuthStore.setState({
    isLoading: false,
    token: 'test-token',
    plan: { tier: 'free', features: [], maxCodes: 0 },
  } as unknown as AuthPartial);
  useUpgradeModalStore.setState({
    isOpen: false,
    feature: null,
    checkoutInFlight: false,
    checkoutStartedAt: null,
  });
});

afterEach(() => {
  vi.useRealTimers();
  setSearch('');
});

describe('usePlanRefetchOnReturn', () => {
  describe('web return path (on mount)', () => {
    // The new entitlement must appear without a manual reload, and the param
    // must be stripped so a refresh doesn't re-fire the success toast.
    it('on ?upgrade=success refetches the plan, confirms, clears in-flight, and strips the param', async () => {
      setSearch('?upgrade=success');
      const fetchPlan = vi.fn().mockImplementation(async () => {
        useAuthStore.setState({
          plan: { tier: 'subscription', features: [], maxCodes: 25 },
        } as unknown as AuthPartial);
      });
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

    it('waits for auth initialization before refetching after ?upgrade=success', async () => {
      setSearch('?upgrade=success');
      const fetchPlan = vi.fn().mockImplementation(async () => {
        useAuthStore.setState({
          plan: { tier: 'subscription', features: [], maxCodes: 25 },
        } as unknown as AuthPartial);
      });
      useAuthStore.setState({
        fetchPlan,
        isLoading: true,
        token: null,
      } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      const { rerender } = renderHook(() => usePlanRefetchOnReturn());

      expect(fetchPlan).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(true);
      expect(window.location.search).toBe('');

      await act(async () => {
        useAuthStore.setState({
          isLoading: false,
          token: 'restored-token',
        } as unknown as AuthPartial);
        rerender();
      });

      expect(fetchPlan).toHaveBeenCalledTimes(1);
      expect(toast.success).toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
    });

    it('does not claim success when the returned checkout cannot be confirmed as subscription', async () => {
      vi.useFakeTimers();
      setSearch('?upgrade=success');
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({
        fetchPlan,
        plan: { tier: 'free', features: [], maxCodes: 0 },
      } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      await act(async () => {
        renderHook(() => usePlanRefetchOnReturn());
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2000);
      });

      expect(fetchPlan).toHaveBeenCalledTimes(3);
      expect(toast.success).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
      vi.useRealTimers();
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

    // A user who opens checkout but never pays would otherwise be polled on
    // every window focus forever (desktop has no return param to clear it), so
    // the watch window must give up and stop polling after it elapses.
    it('stops polling on focus once the checkout watch window has elapsed', async () => {
      const fetchPlan = vi.fn().mockResolvedValue(undefined);
      useAuthStore.setState({
        fetchPlan,
        plan: { tier: 'free', features: [], maxCodes: 0 },
      } as unknown as AuthPartial);
      // Checkout started well beyond the 15-minute watch window.
      useUpgradeModalStore.setState({
        checkoutInFlight: true,
        checkoutStartedAt: Date.now() - 16 * 60 * 1000,
      });

      renderHook(() => usePlanRefetchOnReturn());

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(fetchPlan).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
    });

    it('catches focus refetch failures and leaves checkout in flight for a later retry', async () => {
      const fetchPlan = vi.fn().mockRejectedValue(new Error('network down'));
      useAuthStore.setState({ fetchPlan } as unknown as AuthPartial);
      useUpgradeModalStore.setState({ checkoutInFlight: true });

      renderHook(() => usePlanRefetchOnReturn());

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(fetchPlan).toHaveBeenCalledTimes(1);
      expect(toast.success).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(true);
    });
  });
});
