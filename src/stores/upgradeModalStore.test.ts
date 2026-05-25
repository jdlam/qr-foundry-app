import { describe, it, expect, beforeEach } from 'vitest';
import { useUpgradeModalStore } from './upgradeModalStore';

beforeEach(() => {
  // Reset to initial state between tests so tests are fully isolated.
  useUpgradeModalStore.setState({
    isOpen: false,
    feature: null,
    checkoutInFlight: false,
    checkoutStartedAt: null,
  });
});

describe('upgradeModalStore', () => {
  describe('open', () => {
    it('sets isOpen to true and stores the feature', () => {
      useUpgradeModalStore.getState().open('gated_feature', 'dynamic_codes');

      const state = useUpgradeModalStore.getState();
      expect(state.isOpen).toBe(true);
      expect(state.feature).toBe('dynamic_codes');
    });

    it('sets feature to null when no feature is provided', () => {
      useUpgradeModalStore.getState().open('unknown');

      expect(useUpgradeModalStore.getState().feature).toBeNull();
    });

    it('defaults trigger to "unknown" — open() with no args still opens the modal', () => {
      useUpgradeModalStore.getState().open();

      expect(useUpgradeModalStore.getState().isOpen).toBe(true);
    });
  });

  describe('close', () => {
    it('sets isOpen to false without touching feature', () => {
      // feature is kept so a subsequent open can reuse it; only isOpen changes.
      useUpgradeModalStore.getState().open('gated_feature', 'analytics');
      useUpgradeModalStore.getState().close();

      expect(useUpgradeModalStore.getState().isOpen).toBe(false);
    });
  });

  describe('setOpen', () => {
    it('opens the modal when called with true', () => {
      useUpgradeModalStore.getState().setOpen(true);
      expect(useUpgradeModalStore.getState().isOpen).toBe(true);
    });

    it('closes the modal when called with false', () => {
      useUpgradeModalStore.getState().open();
      useUpgradeModalStore.getState().setOpen(false);
      expect(useUpgradeModalStore.getState().isOpen).toBe(false);
    });
  });

  describe('setCheckoutInFlight', () => {
    it('sets checkoutInFlight to true', () => {
      // The desktop focus-refetch hook reads this flag to know whether to
      // re-check entitlement when the window regains focus.
      useUpgradeModalStore.getState().setCheckoutInFlight(true);
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(true);
    });

    it('clears checkoutInFlight when set to false', () => {
      useUpgradeModalStore.getState().setCheckoutInFlight(true);
      useUpgradeModalStore.getState().setCheckoutInFlight(false);
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
    });

    it('stamps checkoutStartedAt when in flight and clears it when not', () => {
      // The desktop focus poll bounds itself off this timestamp, so it must be
      // set on the rising edge and cleared on the falling edge.
      useUpgradeModalStore.getState().setCheckoutInFlight(true);
      expect(useUpgradeModalStore.getState().checkoutStartedAt).toEqual(expect.any(Number));

      useUpgradeModalStore.getState().setCheckoutInFlight(false);
      expect(useUpgradeModalStore.getState().checkoutStartedAt).toBeNull();
    });
  });
});
