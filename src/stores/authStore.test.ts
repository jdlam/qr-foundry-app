import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAuthStore } from './authStore';

// Create a fake JWT with the given claims
function fakeJwt(claims: { sub: string; email: string; exp: number; iat: number }): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify(claims));
  return `${header}.${payload}.fake-signature`;
}

const futureExp = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
const pastExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago

const validToken = fakeJwt({ sub: '1', email: 'a@b.com', iat: 0, exp: futureExp });
const expiredToken = fakeJwt({ sub: '1', email: 'a@b.com', iat: 0, exp: pastExp });

const mockUser = { id: '1', email: 'a@b.com', createdAt: '2025-01-01' };
const mockPlan = { tier: 'subscription' as const, features: ['batch', 'dynamic_codes'], maxCodes: 25 };

// Mock the billing API
vi.mock('../api/billing', () => ({
  billingApi: {
    login: vi.fn(),
    signup: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    plan: vi.fn(),
    impersonate: vi.fn(),
  },
  ApiError: class ApiError extends Error {
    status: number;
    constructor(message: string, status: number) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
    }
  },
}));

// Import mocked modules
import { billingApi, ApiError } from '../api/billing';
import { authAdapter, analyticsAdapter } from '@platform';

const mockedBilling = vi.mocked(billingApi);
const mockedAuth = vi.mocked(authAdapter);
const mockedAnalytics = vi.mocked(analyticsAdapter);

beforeEach(() => {
  // Reset store state
  useAuthStore.setState({
    user: null,
    plan: null,
    token: null,
    isLoading: true,
    isAuthenticating: false,
  });
  vi.clearAllMocks();
  vi.useFakeTimers({ shouldAdvanceTime: false });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('authStore', () => {
  describe('initialize', () => {
    it('sets isLoading to false when no token is stored', async () => {
      mockedAuth.getToken.mockResolvedValue(null);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('clears expired token and sets isLoading to false', async () => {
      mockedAuth.getToken.mockResolvedValue(expiredToken);

      await useAuthStore.getState().initialize();

      expect(mockedAuth.clearToken).toHaveBeenCalled();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });

    it('restores session from valid stored token', async () => {
      mockedAuth.getToken.mockResolvedValue(validToken);
      mockedBilling.me.mockResolvedValue(mockUser);
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().initialize();

      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().plan).toEqual(mockPlan);
      expect(useAuthStore.getState().token).toBe(validToken);
    });

    it('clears token if API call fails during initialize', async () => {
      mockedAuth.getToken.mockResolvedValue(validToken);
      mockedBilling.me.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().initialize();

      expect(mockedAuth.clearToken).toHaveBeenCalled();
      expect(useAuthStore.getState().isLoading).toBe(false);
      expect(useAuthStore.getState().user).toBeNull();
    });
  });

  describe('login', () => {
    it('stores token and sets user/plan on success', async () => {
      mockedBilling.login.mockResolvedValue({ token: validToken, user: mockUser });
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().login('a@b.com', 'password');

      expect(mockedAuth.setToken).toHaveBeenCalledWith(validToken);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().plan).toEqual(mockPlan);
      expect(useAuthStore.getState().token).toBe(validToken);
      expect(useAuthStore.getState().isAuthenticating).toBe(false);
    });

    it('sets isAuthenticating during call and resets on error', async () => {
      mockedBilling.login.mockRejectedValue(new Error('bad'));

      const loginCall = useAuthStore.getState().login('a@b.com', 'password');

      await expect(loginCall).rejects.toThrow('bad');
      expect(useAuthStore.getState().isAuthenticating).toBe(false);
    });
  });

  describe('signup', () => {
    it('stores token and sets user/plan on success', async () => {
      mockedBilling.signup.mockResolvedValue({ token: validToken, user: mockUser });
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().signup('a@b.com', 'password');

      expect(mockedAuth.setToken).toHaveBeenCalledWith(validToken);
      expect(useAuthStore.getState().user).toEqual(mockUser);
      expect(useAuthStore.getState().plan).toEqual(mockPlan);
    });
  });

  describe('logout', () => {
    it('clears all auth state', async () => {
      // Set up logged-in state
      useAuthStore.setState({ user: mockUser, plan: mockPlan, token: validToken });

      await useAuthStore.getState().logout();

      expect(mockedAuth.clearToken).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().plan).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('updates token on success', async () => {
      const newToken = fakeJwt({ sub: '1', email: 'a@b.com', iat: 0, exp: futureExp + 3600 });
      useAuthStore.setState({ token: validToken });
      mockedBilling.refresh.mockResolvedValue({ token: newToken });

      await useAuthStore.getState().refreshToken();

      expect(mockedAuth.setToken).toHaveBeenCalledWith(newToken);
      expect(useAuthStore.getState().token).toBe(newToken);
    });

    it('silently catches errors (401 handled by session interceptor)', async () => {
      useAuthStore.setState({ token: validToken, user: mockUser, plan: mockPlan });
      mockedBilling.refresh.mockRejectedValue(new ApiError('Unauthorized', 401));

      // Should not throw — errors are caught silently
      await useAuthStore.getState().refreshToken();

      // refreshToken no longer calls logout directly — the session expired
      // interceptor in api/session.ts handles 401s at the API client level
      expect(useAuthStore.getState().token).toBe(validToken);
    });

    it('does nothing when no token', async () => {
      useAuthStore.setState({ token: null });

      await useAuthStore.getState().refreshToken();

      expect(mockedBilling.refresh).not.toHaveBeenCalled();
    });
  });

  describe('impersonate', () => {
    it('stores impersonation token and updates user/plan', async () => {
      const impersonatedUser = { id: 'imp-1', email: 'sub@test.qr-foundry.com', createdAt: '2025-01-01' };
      const impersonatedPlan = { tier: 'subscription' as const, features: ['dynamic_codes'], maxCodes: 25 };
      mockedBilling.impersonate.mockResolvedValue({
        token: validToken,
        user: impersonatedUser,
        plan: impersonatedPlan,
      });

      await useAuthStore.getState().impersonate('subscription', 0);

      expect(mockedBilling.impersonate).toHaveBeenCalledWith('subscription', 0);
      expect(mockedAuth.setToken).toHaveBeenCalledWith(validToken);
      expect(useAuthStore.getState().token).toBe(validToken);
      expect(useAuthStore.getState().user).toEqual(impersonatedUser);
      expect(useAuthStore.getState().plan).toEqual(impersonatedPlan);
    });
  });

  describe('isLoggedIn', () => {
    it('returns false when no token', () => {
      expect(useAuthStore.getState().isLoggedIn()).toBe(false);
    });

    it('returns true when token is set', () => {
      useAuthStore.setState({ token: validToken });
      expect(useAuthStore.getState().isLoggedIn()).toBe(true);
    });
  });

  // The free → trial → paid funnel only works if PostHog has a stable user ID and
  // the current plan tier on every identified event. These tests assert that the
  // analytics adapter is wired into the auth lifecycle, not just that identify
  // exists somewhere.
  describe('analytics integration', () => {
    it('identifies the user on login with id, email, and plan tier', async () => {
      mockedBilling.login.mockResolvedValue({ token: validToken, user: mockUser });
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().login('a@b.com', 'password');

      expect(mockedAnalytics.identify).toHaveBeenCalledWith(mockUser.id, {
        email: mockUser.email,
        plan_tier: mockPlan.tier,
      });
    });

    it('emits login_completed on successful login (separate from signup)', async () => {
      mockedBilling.login.mockResolvedValue({ token: validToken, user: mockUser });
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().login('a@b.com', 'password');

      expect(mockedAnalytics.track).toHaveBeenCalledWith('login_completed');
    });

    it('identifies and emits signup_completed on signup', async () => {
      mockedBilling.signup.mockResolvedValue({ token: validToken, user: mockUser });
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().signup('a@b.com', 'password');

      expect(mockedAnalytics.identify).toHaveBeenCalledWith(mockUser.id, {
        email: mockUser.email,
        plan_tier: mockPlan.tier,
      });
      expect(mockedAnalytics.track).toHaveBeenCalledWith('signup_completed');
    });

    it('identifies on session restore so reloads stay attributed', async () => {
      mockedAuth.getToken.mockResolvedValue(validToken);
      mockedBilling.me.mockResolvedValue(mockUser);
      mockedBilling.plan.mockResolvedValue(mockPlan);

      await useAuthStore.getState().initialize();

      expect(mockedAnalytics.identify).toHaveBeenCalledWith(mockUser.id, {
        email: mockUser.email,
        plan_tier: mockPlan.tier,
      });
    });

    it('resets analytics on logout so the next user is not attributed to the previous one', async () => {
      useAuthStore.setState({ user: mockUser, plan: mockPlan, token: validToken });

      await useAuthStore.getState().logout();

      expect(mockedAnalytics.reset).toHaveBeenCalled();
    });

    it('does not identify or track when signup fails', async () => {
      mockedBilling.signup.mockRejectedValue(new Error('bad'));

      await expect(
        useAuthStore.getState().signup('a@b.com', 'password'),
      ).rejects.toThrow();

      expect(mockedAnalytics.identify).not.toHaveBeenCalled();
      expect(mockedAnalytics.track).not.toHaveBeenCalled();
    });

    it('resets analytics when initialize finds an expired token', async () => {
      mockedAuth.getToken.mockResolvedValue(expiredToken);

      await useAuthStore.getState().initialize();

      expect(mockedAnalytics.reset).toHaveBeenCalled();
    });

    it('resets analytics when initialize fails to validate the stored token', async () => {
      mockedAuth.getToken.mockResolvedValue(validToken);
      mockedBilling.me.mockRejectedValue(new Error('Network error'));

      await useAuthStore.getState().initialize();

      expect(mockedAnalytics.reset).toHaveBeenCalled();
    });

    it('resets then identifies on impersonate so events are not merged with the prior user', async () => {
      const impersonatedUser = { id: 'imp-1', email: 'sub@test.qr-foundry.com', createdAt: '2025-01-01' };
      const impersonatedPlan = { tier: 'subscription' as const, features: ['dynamic_codes'], maxCodes: 25 };
      mockedBilling.impersonate.mockResolvedValue({
        token: validToken,
        user: impersonatedUser,
        plan: impersonatedPlan,
      });

      await useAuthStore.getState().impersonate('subscription', 0);

      expect(mockedAnalytics.reset).toHaveBeenCalled();
      expect(mockedAnalytics.identify).toHaveBeenCalledWith(impersonatedUser.id, {
        email: impersonatedUser.email,
        plan_tier: impersonatedPlan.tier,
      });
      // Reset must happen before identify so PostHog assigns a fresh distinct_id
      // to the impersonated user instead of merging into the previous one.
      const resetOrder = mockedAnalytics.reset.mock.invocationCallOrder[0];
      const identifyOrder = mockedAnalytics.identify.mock.invocationCallOrder[0];
      expect(resetOrder).toBeLessThan(identifyOrder);
    });
  });
});
