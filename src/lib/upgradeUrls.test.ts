import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  getUpgradeSuccessUrl,
  getUpgradeCancelUrl,
  readUpgradeReturn,
  clearUpgradeReturn,
} from './upgradeUrls';

describe('upgradeUrls', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    // Restore search to a clean state after each test.
    window.history.replaceState({}, '', window.location.pathname);
  });

  describe('getUpgradeSuccessUrl', () => {
    it('builds <origin>/?upgrade=success when no env override is set', () => {
      // The URL must include the upgrade param so usePlanRefetchOnReturn can
      // detect the return path and refetch the plan without a manual reload.
      const url = getUpgradeSuccessUrl();
      expect(url).toBe(`${window.location.origin}/?upgrade=success`);
    });

    it('returns the VITE_UPGRADE_SUCCESS_URL override when set', () => {
      // Marketing-site or dedicated success page can be wired in at build time
      // without touching code.
      vi.stubEnv('VITE_UPGRADE_SUCCESS_URL', 'https://qr-foundry.com/welcome');
      expect(getUpgradeSuccessUrl()).toBe('https://qr-foundry.com/welcome');
    });
  });

  describe('getUpgradeCancelUrl', () => {
    it('builds <origin>/?upgrade=cancel when no env override is set', () => {
      const url = getUpgradeCancelUrl();
      expect(url).toBe(`${window.location.origin}/?upgrade=cancel`);
    });

    it('returns the VITE_UPGRADE_CANCEL_URL override when set', () => {
      vi.stubEnv('VITE_UPGRADE_CANCEL_URL', 'https://qr-foundry.com/pricing');
      expect(getUpgradeCancelUrl()).toBe('https://qr-foundry.com/pricing');
    });
  });

  describe('readUpgradeReturn', () => {
    it('returns "success" when ?upgrade=success is in the URL', () => {
      window.history.replaceState({}, '', '/?upgrade=success');
      expect(readUpgradeReturn()).toBe('success');
    });

    it('returns "cancel" when ?upgrade=cancel is in the URL', () => {
      window.history.replaceState({}, '', '/?upgrade=cancel');
      expect(readUpgradeReturn()).toBe('cancel');
    });

    it('returns null when the upgrade param is absent', () => {
      window.history.replaceState({}, '', '/');
      expect(readUpgradeReturn()).toBeNull();
    });

    it('returns null for an unrecognised upgrade param value', () => {
      // Prevents acting on arbitrary query params a proxy or CDN might inject.
      window.history.replaceState({}, '', '/?upgrade=other');
      expect(readUpgradeReturn()).toBeNull();
    });
  });

  describe('clearUpgradeReturn', () => {
    it('removes the upgrade param from the address bar via replaceState', () => {
      // replaceState keeps the user on the same page — a full navigation would
      // re-run the mount effect and re-trigger the toast.
      const replaceStateSpy = vi.spyOn(window.history, 'replaceState');
      window.history.replaceState({}, '', '/?upgrade=success');

      clearUpgradeReturn();

      // The upgrade param is gone.
      expect(new URLSearchParams(window.location.search).get('upgrade')).toBeNull();
      // replaceState was used (not assign / href), so no navigation happened.
      expect(replaceStateSpy).toHaveBeenCalled();
    });

    it('preserves other query params when clearing the upgrade param', () => {
      window.history.replaceState({}, '', '/?foo=bar&upgrade=success');

      clearUpgradeReturn();

      expect(new URLSearchParams(window.location.search).get('foo')).toBe('bar');
      expect(new URLSearchParams(window.location.search).get('upgrade')).toBeNull();
    });

    it('is idempotent — calling twice does not throw', () => {
      window.history.replaceState({}, '', '/?upgrade=success');
      clearUpgradeReturn();
      expect(() => clearUpgradeReturn()).not.toThrow();
    });
  });
});
