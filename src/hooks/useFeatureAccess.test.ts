import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useFeatureAccess } from './useFeatureAccess';
import { useAuthModalStore } from '../stores/authModalStore';

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
    useAuthModalStore.getState().close();
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
      expect(mockToast).not.toHaveBeenCalled();
    });

    it('opens auth modal when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.requireAccess()).toBe(false);
      expect(useAuthModalStore.getState().isOpen).toBe(true);
    });

    it('shows toast when logged in without access', () => {
      mockAuthState.plan = { tier: 'free', features: ['basic_qr_types', 'svg_export'], maxCodes: 0 };
      mockAuthState.isLoggedIn = true;

      const { result } = renderHook(() => useFeatureAccess('dynamic_codes'));
      expect(result.current.requireAccess()).toBe(false);
      expect(mockToast).toHaveBeenCalledWith('Subscribe to unlock this feature');
    });

    it('returns true for free features when not logged in', () => {
      const { result } = renderHook(() => useFeatureAccess('basic_qr_types'));
      expect(result.current.requireAccess()).toBe(true);
    });
  });
});
