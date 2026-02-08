import { create } from 'zustand';
import { authAdapter } from '@platform';
import { billingApi, ApiError } from '../api/billing';
import type { AuthUser, UserPlan, JwtClaims } from '../api/types';

interface AuthState {
  user: AuthUser | null;
  plan: UserPlan | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticating: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<void>;
  fetchPlan: () => Promise<void>;
  isLoggedIn: () => boolean;
}

let refreshTimer: ReturnType<typeof setTimeout> | null = null;

function decodeJwt(token: string): JwtClaims {
  const payload = token.split('.')[1];
  return JSON.parse(atob(payload));
}

function scheduleRefresh(token: string, onRefresh: () => Promise<void>) {
  if (refreshTimer) clearTimeout(refreshTimer);

  const claims = decodeJwt(token);
  // Refresh 5 minutes before expiry
  const refreshAt = (claims.exp - 300) * 1000 - Date.now();
  if (refreshAt <= 0) {
    // Token is already near expiry, refresh immediately
    onRefresh();
    return;
  }
  refreshTimer = setTimeout(onRefresh, refreshAt);
}

function clearRefreshTimer() {
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  plan: null,
  token: null,
  isLoading: true,
  isAuthenticating: false,

  async initialize() {
    try {
      const token = await authAdapter.getToken();
      if (!token) {
        set({ isLoading: false });
        return;
      }

      const claims = decodeJwt(token);
      if (claims.exp * 1000 <= Date.now()) {
        // Token expired, clear it
        await authAdapter.clearToken();
        set({ isLoading: false });
        return;
      }

      // Token is valid, fetch user and plan
      const [user, plan] = await Promise.all([
        billingApi.me(token),
        billingApi.plan(token),
      ]);

      set({ user, plan, token, isLoading: false });
      scheduleRefresh(token, () => get().refreshToken());
    } catch {
      // Any error (network, invalid token, etc.) — start unauthenticated
      await authAdapter.clearToken();
      set({ isLoading: false });
    }
  },

  async login(email: string, password: string) {
    set({ isAuthenticating: true });
    try {
      const { token, user } = await billingApi.login(email, password);
      await authAdapter.setToken(token);
      const plan = await billingApi.plan(token);
      set({ user, plan, token, isAuthenticating: false });
      scheduleRefresh(token, () => get().refreshToken());
    } catch (e) {
      set({ isAuthenticating: false });
      throw e;
    }
  },

  async signup(email: string, password: string) {
    set({ isAuthenticating: true });
    try {
      const { token, user } = await billingApi.signup(email, password);
      await authAdapter.setToken(token);
      const plan = await billingApi.plan(token);
      set({ user, plan, token, isAuthenticating: false });
      scheduleRefresh(token, () => get().refreshToken());
    } catch (e) {
      set({ isAuthenticating: false });
      throw e;
    }
  },

  async logout() {
    clearRefreshTimer();
    await authAdapter.clearToken();
    set({ user: null, plan: null, token: null });
  },

  async refreshToken() {
    const { token } = get();
    if (!token) return;

    try {
      const { token: newToken } = await billingApi.refresh(token);
      await authAdapter.setToken(newToken);
      set({ token: newToken });
      scheduleRefresh(newToken, () => get().refreshToken());
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        await get().logout();
      }
    }
  },

  async fetchPlan() {
    const { token } = get();
    if (!token) return;

    const plan = await billingApi.plan(token);
    set({ plan });
  },

  isLoggedIn() {
    return get().token !== null;
  },
}));
