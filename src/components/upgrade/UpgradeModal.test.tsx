import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { UpgradeModal } from './UpgradeModal';
import { billingApi, ApiError } from '../../api/billing';
import { useAuthStore } from '../../stores/authStore';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { analyticsAdapter, openExternalAdapter } from '@platform';
import { toast } from 'sonner';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

const mockedOpen = vi.mocked(openExternalAdapter.open);
const mockedTrack = vi.mocked(analyticsAdapter.track);

beforeEach(() => {
  vi.clearAllMocks();
  // Modal only ever opens for a logged-in user, so default to having a token.
  useAuthStore.setState({ token: 'test-token' });
  useUpgradeModalStore.setState({ isOpen: true, feature: 'dynamic_codes', checkoutInFlight: false });
});

describe('UpgradeModal', () => {
  describe('billing toggle', () => {
    // Annual is the default because it surfaces the savings and is the better
    // conversion default for a trial subscription.
    it('defaults to annual pricing and surfaces the savings', () => {
      render(<UpgradeModal open onOpenChange={() => {}} />);
      expect(screen.getByText('$60/year')).toBeInTheDocument();
      expect(screen.getByText('save $12')).toBeInTheDocument();
    });

    it('switches to monthly pricing and hides the savings', () => {
      render(<UpgradeModal open onOpenChange={() => {}} />);
      fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
      expect(screen.getByText('$6/month')).toBeInTheDocument();
      expect(screen.queryByText('save $12')).not.toBeInTheDocument();
    });
  });

  describe('checkout', () => {
    // The whole point of the modal: turn a paywall hit into a Stripe session.
    // checkout_started is the conversion-intent signal; the request must carry
    // the selected billing period and the return URLs; and in-flight must be
    // armed BEFORE the browser opens so the desktop focus-refetch can catch the
    // return.
    it('tracks intent, calls billing with the selected period + return URLs, arms in-flight before opening, then closes', async () => {
      vi.spyOn(billingApi, 'checkout').mockResolvedValue({ url: 'https://checkout.stripe.com/c/pay/cs_test' });
      const onOpenChange = vi.fn();
      render(<UpgradeModal open onOpenChange={onOpenChange} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start 14-day free trial' }));

      await waitFor(() =>
        expect(mockedOpen).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test'),
      );

      expect(mockedTrack).toHaveBeenCalledWith('checkout_started', {
        billing: 'annual',
        feature: 'dynamic_codes',
      });
      expect(billingApi.checkout).toHaveBeenCalledWith(
        'test-token',
        expect.objectContaining({
          billing: 'annual',
          successUrl: expect.stringContaining('upgrade=success'),
          cancelUrl: expect.stringContaining('upgrade=cancel'),
        }),
      );
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(true);
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('sends billing=monthly when the monthly option is selected', async () => {
      vi.spyOn(billingApi, 'checkout').mockResolvedValue({ url: 'https://stripe/x' });
      render(<UpgradeModal open onOpenChange={() => {}} />);

      fireEvent.click(screen.getByRole('radio', { name: 'Monthly' }));
      fireEvent.click(screen.getByRole('button', { name: 'Start 14-day free trial' }));

      await waitFor(() =>
        expect(billingApi.checkout).toHaveBeenCalledWith(
          'test-token',
          expect.objectContaining({ billing: 'monthly' }),
        ),
      );
    });

    // A failed checkout must reset in-flight, otherwise the desktop focus hook
    // would poll /api/me/plan forever for a payment that never started.
    it('on failure shows an error toast and resets in-flight, and never opens the browser', async () => {
      vi.spyOn(billingApi, 'checkout').mockRejectedValue(new ApiError('Stripe is down', 500));
      render(<UpgradeModal open onOpenChange={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start 14-day free trial' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Stripe is down'));
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
      expect(mockedOpen).not.toHaveBeenCalled();
    });

    // Defense in depth: the modal should only ever be opened for a logged-in
    // user, but if the token is somehow gone we must not fire a conversion
    // signal or hit Stripe unauthenticated.
    it('refuses to start checkout without an auth token', async () => {
      useAuthStore.setState({ token: null });
      vi.spyOn(billingApi, 'checkout').mockResolvedValue({ url: 'https://stripe/x' });
      render(<UpgradeModal open onOpenChange={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start 14-day free trial' }));

      await waitFor(() => expect(toast.error).toHaveBeenCalled());
      expect(billingApi.checkout).not.toHaveBeenCalled();
      expect(mockedTrack).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
    });

    // Regression (bug found in QA): if the user dismisses the modal while the
    // checkout request is still pending, the resolved request must NOT open the
    // browser or arm the focus-refetch poll. Otherwise checkoutInFlight leaks
    // true and the desktop app polls /api/me/plan on every window focus forever.
    it('abandons checkout if the modal is dismissed while the request is in flight', async () => {
      let resolveCheckout!: (v: { url: string }) => void;
      vi.spyOn(billingApi, 'checkout').mockReturnValue(
        new Promise((resolve) => {
          resolveCheckout = resolve;
        }),
      );
      render(<UpgradeModal open onOpenChange={() => {}} />);

      fireEvent.click(screen.getByRole('button', { name: 'Start 14-day free trial' }));

      // User dismisses the modal before the checkout request resolves.
      act(() => {
        useUpgradeModalStore.getState().setOpen(false);
      });

      // The pending request now resolves.
      await act(async () => {
        resolveCheckout({ url: 'https://checkout.stripe.com/c/pay/cs_test' });
      });

      expect(mockedOpen).not.toHaveBeenCalled();
      expect(useUpgradeModalStore.getState().checkoutInFlight).toBe(false);
    });
  });
});
