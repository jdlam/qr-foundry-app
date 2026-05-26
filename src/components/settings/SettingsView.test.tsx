/**
 * WHY these tests exist:
 * - The Settings toggle is the only way a user reverses their first-run choice,
 *   so it must reflect the persisted consent state on load and write the new
 *   value through setConsentEnabled when flipped — that's the whole control.
 * - In the test env isTauri() is true (default VITE_PLATFORM), so the telemetry
 *   section renders without extra platform mocking.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { SettingsView } from './SettingsView';

// Mock @platform so the component never imports tauri code in the test env.
vi.mock('@platform', () => ({
  analyticsAdapter: {
    init: vi.fn(),
    identify: vi.fn(),
    track: vi.fn(),
    reset: vi.fn(),
    getConsent: vi.fn(),
    setConsentEnabled: vi.fn(() => Promise.resolve()),
    markConsentPrompted: vi.fn(() => Promise.resolve()),
  },
}));

import { analyticsAdapter } from '@platform';

function mockGetConsent(opts: { enabled: boolean; prompted: boolean }) {
  vi.mocked(analyticsAdapter.getConsent).mockResolvedValue(opts);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('SettingsView', () => {
  it('reflects a disabled consent state as an off toggle', async () => {
    mockGetConsent({ enabled: false, prompted: true });
    render(<SettingsView />);
    const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
  });

  it('reflects an enabled consent state as an on toggle', async () => {
    mockGetConsent({ enabled: true, prompted: true });
    render(<SettingsView />);
    const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));
  });

  it('calls setConsentEnabled(true) when toggled on from off', async () => {
    mockGetConsent({ enabled: false, prompted: true });
    render(<SettingsView />);
    const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));

    fireEvent.click(sw);

    await waitFor(() => {
      expect(analyticsAdapter.setConsentEnabled).toHaveBeenCalledWith(true);
    });
    expect(sw).toHaveAttribute('aria-checked', 'true');
  });

  it('calls setConsentEnabled(false) when toggled off from on', async () => {
    mockGetConsent({ enabled: true, prompted: true });
    render(<SettingsView />);
    const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
    await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'true'));

    fireEvent.click(sw);

    await waitFor(() => {
      expect(analyticsAdapter.setConsentEnabled).toHaveBeenCalledWith(false);
    });
  });

  describe('store failure resilience', () => {
    it('reverts to previous value when setConsentEnabled rejects', async () => {
      // WHY: the consent toggle controls a privacy setting. If the store write fails,
      // the displayed state must match what's actually on disk — showing "off" while
      // telemetry is still on (or vice versa) is a privacy regression.
      mockGetConsent({ enabled: false, prompted: true });
      vi.mocked(analyticsAdapter.setConsentEnabled).mockRejectedValueOnce(
        new Error('store write failed')
      );

      render(<SettingsView />);
      const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
      await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));

      fireEvent.click(sw);

      // After rejection, toggle must revert to original "off" state
      await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
    });

    it('resolves enabled to false (not null) when getConsent rejects — Settings still renders', async () => {
      // WHY: if getConsent rejects and enabled stays null, the Settings view is stuck
      // in a loading limbo and the toggle never appears. Fail safe to false so the
      // section renders with telemetry shown as off, which is always the safe assumption.
      vi.mocked(analyticsAdapter.getConsent).mockRejectedValueOnce(
        new Error('store read failed')
      );

      render(<SettingsView />);

      // Toggle must appear (not stuck loading) and show as off
      const sw = await screen.findByRole('switch', { name: /share anonymous usage data/i });
      await waitFor(() => expect(sw).toHaveAttribute('aria-checked', 'false'));
    });
  });
});
