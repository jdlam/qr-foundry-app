import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureAccess } from './useFeatureAccess';
import { useAuthModalStore } from '../stores/authModalStore';
import { useUpgradeModalStore } from '../stores/upgradeModalStore';
import { analyticsAdapter } from '@platform';

const mockedAnalytics = vi.mocked(analyticsAdapter);

// Mock useAuth hook
let mockAuthState = {
  user: null as { id: string; email: string; createdAt: string } | null,
  plan: null as { tier: string; features: string[]; maxCodes: number } | null,
  isLoggedIn: false,
  isLoading: false,
  isAuthenticating: false,
  login: vi.fn(),
  signup: vi.fn(),
  logout: vi.fn(),
};

vi.mock('./useAuth', () => ({
  useAuth: () => mockAuthState,
}));

// Mock sonner toast
const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: (...args: unknown[]) => mockToast(...args),
}));

describe('useFeatureAccess', () => {
  beforeEach(() => {
    mockAuthState = {
      user: null,
      plan: null,
      isLoggedIn: false,
      isLoading: false,
      isAuthenticating: false,
      login: vi.fn(),
      signup: vi.fn(),
      logout: vi.fn(),
    };
    mockToast.mockReset();
    mockedAnalytics.track.mockClear();
    useAuthModalStore.getState().close();
    useUpgradeModalStore.getState().close();
  });

  describe('hasAccess', () => {
    it('returns true when feature is in plan', () => {
      mockAuthState.plan = { tier: 'subscription', features: ['basic_qr_types', 'dynamic_codes'], maxCodes: 25 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.hasAccess).toBe(true);
    });

    it('returns false when feature is not in plan', () => {
      mockAuthState.plan = { tier: 'free', features: ['basic_qr_types', 'svg_export'], maxCodes: 0 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.hasAccess).toBe(false);
    });

    it('returns true for free features when not logged in', () => {
      // All QR features are free now — FREE_FEATURES includes svg_export etc.
      const { result } = renderHook(() => useFeatureAccess('svg_export'));
      expect(result.current.hasAccess).toBe(true);
    });

    it('returns false for dynamic_codes when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.hasAccess).toBe(false);
    });

    it('returns true for basic_qr_types when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('basic_qr_types'));
      expect(result.current.hasAccess).toBe(true);
    });
  });

  describe('requireAccess', () => {
    it('returns true when has access', () => {
      mockAuthState.plan = { tier: 'subscription', features: ['basic_qr_types', 'dynamic_codes'], maxCodes: 25 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.requireAccess()).toBe(true);
      expect(useAuthModalStore.getState().isOpen).toBe(false);
      expect(useUpgradeModalStore.getState().isOpen).toBe(false);
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('opens auth modal when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.requireAccess()).toBe(false);
      expect(useAuthModalStore.getState().isOpen).toBe(true);
      // Logged-out users go to auth, NOT the upgrade modal — they can't pay yet.
      expect(useUpgradeModalStore.getState().isOpen).toBe(false);
    });

    // The conversion fix: a logged-in free user who hits a gate now sees the
    // upgrade modal (the path to Stripe checkout) instead of a dead-end toast.
    // This is the whole point of the feature — without it there is no in-app
    // way to convert.
    it('opens the upgrade modal when logged in without access', () => {
      mockAuthState.plan = { tier: 'free', features: ['basic_qr_types', 'svg_export'], maxCodes: 0 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.requireAccess()).toBe(false);
      expect(useUpgradeModalStore.getState().isOpen).toBe(true);
      expect(useUpgradeModalStore.getState().feature).toBe('dynamic_codes');
      // No dead-end toast anymore.
      expect(mockToast).not.toHaveBeenCalled();
      // And it does NOT route to the auth modal.
      expect(useAuthModalStore.getState().isOpen).toBe(false);
    });

    it('returns true for free features when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('basic_qr_types'));
      expect(result.current.requireAccess()).toBe(true);
    });

    // Paywall hits are the most direct signal of free→paid friction. We only
    // fire for logged-in free users: a logged-out user opening the auth modal
    // is captured by auth_modal_opened with trigger='gated_feature' instead.
    it('fires paywall_hit when a logged-in free user hits a gated feature', () => {
      mockAuthState.plan = { tier: 'free', features: ['basic_qr_types'], maxCodes: 0 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      result.current.requireAccess();

      expect(mockedAnalytics.track).toHaveBeenCalledWith('paywall_hit', {
        feature: 'dynamic_codes',
      });
    });

    it('does NOT fire paywall_hit when a logged-out user hits a gated feature', () => {
      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      result.current.requireAccess();

      expect(mockedAnalytics.track).not.toHaveBeenCalledWith(
        'paywall_hit',
        expect.anything(),
      );
    });

    it('does NOT fire paywall_hit when the user has access', () => {
      mockAuthState.plan = { tier: 'subscription', features: ['dynamic_codes'], maxCodes: 25 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      result.current.requireAccess();

      expect(mockedAnalytics.track).not.toHaveBeenCalledWith(
        'paywall_hit',
        expect.anything(),
      );
    });
  });
});
