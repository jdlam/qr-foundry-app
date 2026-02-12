import { describe, it, expect, vi, beforeEach } from 'vitest';
import { workerApi, WorkerApiError } from './worker';

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

describe('workerApi', () => {
  describe('createCode', () => {
    it('sends POST with body and auth header', async () => {
      const data = { shortCode: 'abc123', destinationUrl: 'https://example.com', status: 'active', createdAt: '2025-01-01', updatedAt: '2025-01-01', ownerId: 'u1' };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.createCode('tok', { destinationUrl: 'https://example.com', label: 'My Link' });

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/codes'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ destinationUrl: 'https://example.com', label: 'My Link' }),
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });

    it('throws WorkerApiError on failure', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false, error: 'Quota exceeded' }, 403));

      try {
        await workerApi.createCode('tok', { destinationUrl: 'https://example.com' });
        expect.unreachable('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(WorkerApiError);
        expect((err as WorkerApiError).message).toBe('Quota exceeded');
        expect((err as WorkerApiError).status).toBe(403);
      }
    });
  });

  describe('listCodes', () => {
    it('sends GET without filter', async () => {
      const data = [{ shortCode: 'abc', destinationUrl: 'https://a.com', status: 'active', createdAt: '2025-01-01', updatedAt: '2025-01-01', ownerId: 'u1' }];
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.listCodes('tok');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/codes$/),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });

    it('sends GET with status filter', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: [] }));

      await workerApi.listCodes('tok', 'paused');

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/codes?status=paused'),
        expect.anything(),
      );
    });
  });

  describe('getCode', () => {
    it('fetches a single code by shortCode', async () => {
      const data = { shortCode: 'abc', destinationUrl: 'https://a.com', status: 'active', createdAt: '2025-01-01', updatedAt: '2025-01-01', ownerId: 'u1' };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.getCode('tok', 'abc');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/codes/abc'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });

    it('throws on 404', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false, error: 'Not found' }, 404));

      await expect(workerApi.getCode('tok', 'bad')).rejects.toMatchObject({
        message: 'Not found',
        status: 404,
      });
    });
  });

  describe('updateCode', () => {
    it('sends PUT with body', async () => {
      const data = { shortCode: 'abc', destinationUrl: 'https://new.com', status: 'active', createdAt: '2025-01-01', updatedAt: '2025-01-02', ownerId: 'u1' };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.updateCode('tok', 'abc', { destinationUrl: 'https://new.com' });

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/codes/abc'),
        expect.objectContaining({
          method: 'PUT',
          body: JSON.stringify({ destinationUrl: 'https://new.com' }),
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });

    it('can pause a code', async () => {
      const data = { shortCode: 'abc', destinationUrl: 'https://a.com', status: 'paused', createdAt: '2025-01-01', updatedAt: '2025-01-02', ownerId: 'u1' };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      await workerApi.updateCode('tok', 'abc', { status: 'paused' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          body: JSON.stringify({ status: 'paused' }),
        }),
      );
    });
  });

  describe('deleteCode', () => {
    it('sends DELETE and returns deleted shortCode', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: { deleted: 'abc' } }));

      const result = await workerApi.deleteCode('tok', 'abc');

      expect(result).toEqual({ deleted: 'abc' });
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/codes/abc'),
        expect.objectContaining({
          method: 'DELETE',
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  describe('getUsage', () => {
    it('returns usage data', async () => {
      const data = { ownerId: 'u1', limit: 25, total: 5, active: 3, paused: 1, expired: 1, remaining: 20 };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.getUsage('tok');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/usage'),
        expect.objectContaining({
          headers: expect.objectContaining({ Authorization: 'Bearer tok' }),
        }),
      );
    });
  });

  describe('getCodeAnalytics', () => {
    it('fetches per-code analytics without params', async () => {
      const data = { shortCode: 'abc', totalScans: 100, period: { start: '2025-01-01', end: '2025-02-01' }, scansOverTime: [], topCountries: [], topCities: [], topReferers: [] };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.getCodeAnalytics('tok', 'abc');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/analytics\/abc$/),
        expect.anything(),
      );
    });

    it('includes query params', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: {} }));

      await workerApi.getCodeAnalytics('tok', 'abc', { start: '2025-01-01', end: '2025-02-01', granularity: 'week' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics/abc?start=2025-01-01&end=2025-02-01&granularity=week'),
        expect.anything(),
      );
    });
  });

  describe('getAnalyticsOverview', () => {
    it('fetches overview analytics', async () => {
      const data = { totalScans: 500, period: { start: '2025-01-01', end: '2025-02-01' }, scansOverTime: [], topCodes: [], topCountries: [] };
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data }));

      const result = await workerApi.getAnalyticsOverview('tok');

      expect(result).toEqual(data);
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/\/api\/analytics$/),
        expect.anything(),
      );
    });

    it('includes query params', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: true, data: {} }));

      await workerApi.getAnalyticsOverview('tok', { granularity: 'hour' });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analytics?granularity=hour'),
        expect.anything(),
      );
    });
  });

  describe('error handling', () => {
    it('uses fallback message when no error in body', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false }, 500));

      await expect(workerApi.getUsage('tok')).rejects.toMatchObject({
        message: 'Request failed with status 500',
        status: 500,
      });
    });

    it('throws on 401 unauthorized', async () => {
      mockFetch.mockResolvedValue(jsonResponse({ success: false, error: 'Unauthorized' }, 401));

      await expect(workerApi.listCodes('tok')).rejects.toMatchObject({
        message: 'Unauthorized',
        status: 401,
      });
    });
  });
});
