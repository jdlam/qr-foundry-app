import type { ApiResponse, AuthResponse, AuthUser, UserPlan } from './types';

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
    throw new ApiError(body.error || `Request failed with status ${res.status}`, res.status);
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
};
