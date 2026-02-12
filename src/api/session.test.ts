import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  registerSessionExpiredHandler,
  resetSessionExpiredFlag,
  handleSessionExpired,
  isSessionExpired,
} from './session';

vi.mock('sonner', () => ({
  toast: {
    error: vi.fn(),
    success: vi.fn(),
  },
}));

import { toast } from 'sonner';

describe('session', () => {
  beforeEach(() => {
    resetSessionExpiredFlag();
    registerSessionExpiredHandler(vi.fn());
    vi.clearAllMocks();
  });

  describe('handleSessionExpired', () => {
    it('calls registered handler and shows toast', () => {
      const handler = vi.fn();
      registerSessionExpiredHandler(handler);

      handleSessionExpired();

      expect(handler).toHaveBeenCalledOnce();
      expect(toast.error).toHaveBeenCalledWith('Session expired — please sign in again');
    });

    it('only fires once (deduplication)', () => {
      const handler = vi.fn();
      registerSessionExpiredHandler(handler);

      handleSessionExpired();
      handleSessionExpired();
      handleSessionExpired();

      expect(handler).toHaveBeenCalledOnce();
      expect(toast.error).toHaveBeenCalledOnce();
    });

    it('fires again after resetSessionExpiredFlag', () => {
      const handler = vi.fn();
      registerSessionExpiredHandler(handler);

      handleSessionExpired();
      resetSessionExpiredFlag();
      handleSessionExpired();

      expect(handler).toHaveBeenCalledTimes(2);
      expect(toast.error).toHaveBeenCalledTimes(2);
    });

    it('does not throw when no handler is registered', () => {
      registerSessionExpiredHandler(null);
      expect(() => handleSessionExpired()).not.toThrow();
      expect(toast.error).toHaveBeenCalledOnce();
    });
  });

  describe('isSessionExpired', () => {
    it('returns true for error with status 401', () => {
      expect(isSessionExpired({ status: 401, message: 'Unauthorized' })).toBe(true);
    });

    it('returns false for error with status 403', () => {
      expect(isSessionExpired({ status: 403, message: 'Forbidden' })).toBe(false);
    });

    it('returns false for error with status 500', () => {
      expect(isSessionExpired({ status: 500, message: 'Server error' })).toBe(false);
    });

    it('returns false for null', () => {
      expect(isSessionExpired(null)).toBe(false);
    });

    it('returns false for non-object', () => {
      expect(isSessionExpired('error')).toBe(false);
    });

    it('returns false for object without status', () => {
      expect(isSessionExpired({ message: 'error' })).toBe(false);
    });
  });
});
