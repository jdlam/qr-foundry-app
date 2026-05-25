import type { ApiResponse, AuthResponse, AuthUser, BillingSessionResponse, ImpersonateResponse, PlanTier, UserPlan } from './types';
import { handleSessionExpired } from './session';

const API_BASE = import.meta.env.VITE_API_URL || 'https://api.qr-foundry.com';

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  const body: ApiResponse<T> = await res.json();

  if (!res.ok || !body.success) {
    const error = new ApiError(body.error || `Request failed with status ${res.status}`, res.status);
    if (res.status === 401) {
      const headers = new Headers(options.headers ?? undefined);
      if (headers.has('Authorization')) {
        handleSessionExpired();
      }
    }
    throw error;
  }

  return body.data as T;
}

function authHeaders(token: string) {
  return { Authorization: `Bearer ${token}` };
}

export const billingApi = {
  async signup(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async login(email: string, password: string): Promise<AuthResponse> {
    return request<AuthResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  async refresh(token: string): Promise<{ token: string }> {
    return request<{ token: string }>('/api/auth/refresh', {
      method: 'POST',
      headers: authHeaders(token),
    });
  },

  async me(token: string): Promise<AuthUser> {
    return request<AuthUser>('/api/auth/me', {
      headers: authHeaders(token),
    });
  },

  async plan(token: string): Promise<UserPlan> {
    return request<UserPlan>('/api/me/plan', {
      headers: authHeaders(token),
    });
  },

  // Creates a Stripe-hosted Checkout Session for the single paid subscription
  // tier. The 14-day free trial is applied server-side for first-time
  // subscribers — the client passes nothing for that. Returns the hosted
  // Checkout URL to hand to the openExternal adapter.
  async checkout(
    token: string,
    opts: { billing: 'monthly' | 'annual'; successUrl: string; cancelUrl: string },
  ): Promise<BillingSessionResponse> {
    return request<BillingSessionResponse>('/api/billing/checkout', {
      method: 'POST',
      headers: authHeaders(token),
      body: JSON.stringify({
        product: 'subscription',
        billing: opts.billing,
        successUrl: opts.successUrl,
        cancelUrl: opts.cancelUrl,
      }),
    });
  },

  async impersonate(tier: PlanTier, addonCount = 0): Promise<ImpersonateResponse> {
    if (!import.meta.env.DEV) {
      throw new ApiError('Impersonation is only available in development mode', 403);
    }

    return request<ImpersonateResponse>('/api/dev/impersonate', {
      method: 'POST',
      body: JSON.stringify({ tier, addonCount }),
    });
  },
};
