/**
 * WHY these tests exist:
 * - The dialog is the sole moment the user makes an affirmative consent choice;
 *   it must only appear when `prompted === false` — never again after that.
 * - "Enable" must call setConsentEnabled(true) AND markConsentPrompted() so the
 *   toggle and the "don't show again" flag are both written.
 * - "No thanks" must call ONLY markConsentPrompted() — telemetry stays off.
 * - Closing via the X button is treated the same as "No thanks" (leave disabled).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import { TelemetryConsentDialog } from './TelemetryConsentDialog';

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

// Helpers
function mockGetConsent(opts: { enabled: boolean; prompted: boolean }) {
  vi.mocked(analyticsAdapter.getConsent).mockResolvedValue(opts);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TelemetryConsentDialog', () => {
  describe('visibility', () => {
    it('renders nothing while consent state is loading', () => {
      // getConsent never resolves during this test — component stays in loading state
      vi.mocked(analyticsAdapter.getConsent).mockReturnValue(new Promise(() => {}));
      const { container } = render(<TelemetryConsentDialog />);
      expect(container.firstChild).toBeNull();
    });

    it('shows the dialog when prompted === false', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
      });
    });

    it('renders nothing when prompted === true', async () => {
      mockGetConsent({ enabled: false, prompted: true });
      const { container } = render(<TelemetryConsentDialog />);
      // Wait a tick so the promise resolves
      await new Promise((r) => setTimeout(r, 10));
      expect(container.firstChild).toBeNull();
    });
  });

  describe('"Enable" button', () => {
    it('calls setConsentEnabled(true) and markConsentPrompted()', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      fireEvent.click(screen.getByRole('button', { name: /enable/i }));

      await waitFor(() => {
        expect(analyticsAdapter.setConsentEnabled).toHaveBeenCalledWith(true);
        expect(analyticsAdapter.markConsentPrompted).toHaveBeenCalled();
      });
    });

    it('closes the dialog after clicking Enable', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      fireEvent.click(screen.getByRole('button', { name: /enable/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('"No thanks" button', () => {
    it('calls only markConsentPrompted() — does NOT call setConsentEnabled', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));

      expect(analyticsAdapter.markConsentPrompted).toHaveBeenCalled();
      expect(analyticsAdapter.setConsentEnabled).not.toHaveBeenCalled();
    });

    it('closes the dialog after clicking No thanks', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

  describe('close (X) button', () => {
    it('calls only markConsentPrompted() — same as "No thanks"', async () => {
      mockGetConsent({ enabled: false, prompted: false });
      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /close/i }));
      });

      expect(analyticsAdapter.markConsentPrompted).toHaveBeenCalled();
      expect(analyticsAdapter.setConsentEnabled).not.toHaveBeenCalled();
    });
  });

  describe('store failure resilience', () => {
    it('does not render the dialog when getConsent rejects', async () => {
      // WHY: blocking the UI on a telemetry prompt when the store is broken is worse
      // than silently skipping — we re-prompt next launch once the store is healthy.
      vi.mocked(analyticsAdapter.getConsent).mockRejectedValueOnce(
        new Error('store read failed')
      );
      const { container } = render(<TelemetryConsentDialog />);

      // Wait for promise to settle
      await new Promise((r) => setTimeout(r, 20));

      expect(container.firstChild).toBeNull();
    });

    it('closes the dialog even when the Enable write handler rejects', async () => {
      // WHY: a failed store write just means we re-prompt next launch (safe fallback).
      // The dialog must not get stuck open — that would block the user permanently.
      // Using an async implementation (not Promise.reject) so the rejection is attached
      // to an awaited promise, not a free-floating one that Vitest flags as unhandled.
      mockGetConsent({ enabled: false, prompted: false });
      vi.mocked(analyticsAdapter.setConsentEnabled).mockImplementationOnce(
        async () => { throw new Error('store write failed'); }
      );

      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /enable/i }));
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });

    it('closes the dialog even when the Decline write handler rejects', async () => {
      // Same rationale: a write failure must not leave the dialog stuck open.
      mockGetConsent({ enabled: false, prompted: false });
      vi.mocked(analyticsAdapter.markConsentPrompted).mockImplementationOnce(
        async () => { throw new Error('store write failed'); }
      );

      render(<TelemetryConsentDialog />);
      await waitFor(() => screen.getByRole('dialog'));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /no thanks/i }));
        await new Promise((r) => setTimeout(r, 0));
      });

      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });
});
