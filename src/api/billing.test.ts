import { describe, it, expect, vi, beforeEach } from 'vitest';
import { billingApi, ApiError } from './billing';

const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

beforeEach(() => {
  mockFetch.mockReset();
});

describe('billingApi', () => {
  describe('signup', () => {
    it('returns auth response on success', async () => {
      const data = { token: 'tok123', user: { id: '1', email: 'a@b.com', createdAt: '2025-01-01' } };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await billingApi.signup('a@b.com', 'password123');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/signup'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ email: 'a@b.com', password: 'password123' }),
        }),
      );
    });

    it('throws ApiError on failure', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false, error: 'Email taken' }, 409));

      try {
        await billingApi.signup('a@b.com', 'password123');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('Email taken');
        expect((err as ApiError).status).toBe(409);
      }
    });
  });

  describe('login', () => {
    it('returns auth response on success', async () => {
      const data = { token: 'tok456', user: { id: '2', email: 'b@c.com', createdAt: '2025-01-01' } };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await billingApi.login('b@c.com', 'pass');
      expect(result).toEqual(data);
    });

    it('throws ApiError on 401', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false, error: 'Invalid credentials' }, 401));

      try {
        await billingApi.login('b@c.com', 'wrong');
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).message).toBe('Invalid credentials');
        expect((err as ApiError).status).toBe(401);
      }
    });
  });

  describe('refresh', () => {
    it('returns new token', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: { token: 'new-tok' } }));

      const result = await billingApi.refresh('old-tok');
      expect(result.token).toBe('new-tok');
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/refresh'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ Authorization: 'Bearer old-tok' }),
        }),
      );
    });
  });

  describe('me', () => {
    it('returns user data', async () => {
      const user = { id: '1', email: 'a@b.com', createdAt: '2025-01-01' };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: user }));

      const result = await billingApi.me('tok');
      expect(result).toEqual(user);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/me'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  describe('plan', () => {
    it('returns plan data', async () => {
      const plan = { tier: 'subscription', features: ['batch', 'dynamic_codes'], maxCodes: 25 };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: plan }));

      const result = await billingApi.plan('tok');
      expect(result).toEqual(plan);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/me/plan'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  describe('error handling', () => {
    it('uses status text when no error message in body', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false }, 500));

      await expect(billingApi.me('tok')).rejects.toMatchObject({
        message: 'Request failed with status 500',
        status: 500,
      });
    });
  });
});
