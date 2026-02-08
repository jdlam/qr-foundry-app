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
const mockPlan = { tier: 'pro_trial' as const, features: ['batch'], maxCodes: 25, trialDaysRemaining: 7 };

// Mock the billing API
vi.mock('../api/billing', () => ({
  billingApi: {
    login: vi.fn(),
    signup: vi.fn(),
    refresh: vi.fn(),
    me: vi.fn(),
    plan: vi.fn(),
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
import { authAdapter } from '@platform';

const mockedBilling = vi.mocked(billingApi);
const mockedAuth = vi.mocked(authAdapter);

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

    it('calls logout on 401', async () => {
      useAuthStore.setState({ token: validToken, user: mockUser, plan: mockPlan });
      mockedBilling.refresh.mockRejectedValue(new ApiError('Unauthorized', 401));

      await useAuthStore.getState().refreshToken();

      expect(mockedAuth.clearToken).toHaveBeenCalled();
      expect(useAuthStore.getState().user).toBeNull();
      expect(useAuthStore.getState().token).toBeNull();
    });

    it('does nothing when no token', async () => {
      useAuthStore.setState({ token: null });

      await useAuthStore.getState().refreshToken();

      expect(mockedBilling.refresh).not.toHaveBeenCalled();
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
});
