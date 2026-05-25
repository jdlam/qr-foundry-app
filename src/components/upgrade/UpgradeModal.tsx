import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { toast } from 'sonner';
import { analyticsAdapter, openExternalAdapter } from '@platform';
import { billingApi, ApiError } from '../../api/billing';
import { useAuthStore } from '../../stores/authStore';
import { useUpgradeModalStore } from '../../stores/upgradeModalStore';
import { getUpgradeSuccessUrl, getUpgradeCancelUrl } from '../../lib/upgradeUrls';

interface UpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Billing = 'monthly' | 'annual';

export function UpgradeModal({ open, onOpenChange }: UpgradeModalProps) {
  // Default to annual: it surfaces the "save $12" message and is the better
  // conversion default for a subscription with a free trial.
  const [billing, setBilling] = useState<Billing>('annual');
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    setLoading(true);
    try {
      const token = useAuthStore.getState().token;
      if (!token) {
        // Should not happen — the modal only opens for logged-in users — but
        // fail loud rather than send an unauthenticated request to Stripe.
        throw new ApiError('You must be signed in to upgrade', 401);
      }

      const feature = useUpgradeModalStore.getState().feature;
      // checkout_started is the conversion-intent signal (no-op on desktop per
      // ADR-0001). Paired with paywall_hit, it gives the funnel a click-through.
      analyticsAdapter.track('checkout_started', { billing, feature });

      const { url } = await billingApi.checkout(token, {
        billing,
        successUrl: getUpgradeSuccessUrl(),
        cancelUrl: getUpgradeCancelUrl(),
      });

      // If the user dismissed the modal while the request was in flight, abandon:
      // don't open the browser or arm the focus-refetch poll. Otherwise
      // checkoutInFlight would leak true and poll /api/me/plan on every window
      // focus forever on desktop (there's no ?upgrade=success return there).
      if (!useUpgradeModalStore.getState().isOpen) {
        return;
      }

      // Mark in-flight BEFORE opening so the focus-refetch hook (desktop) knows
      // a payment may have happened when the window regains focus.
      useUpgradeModalStore.getState().setCheckoutInFlight(true);
      await openExternalAdapter.open(url);
      onOpenChange(false);
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : 'Could not start checkout. Please try again.';
      toast.error(message);
      useUpgradeModalStore.getState().setCheckoutInFlight(false);
    } finally {
      setLoading(false);
    }
  };

  const priceLabel = billing === 'annual' ? '$60/year' : '$6/month';

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50" style={{ background: 'rgba(0, 0, 0, 0.5)' }} />
        <Dialog.Content
          className="fixed top-1/2 left-1/2 z-50 -translate-x-1/2 -translate-y-1/2 w-[400px] rounded-sm p-6 shadow-lg"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
          }}
        >
          <Dialog.Title
            className="text-base font-semibold mb-1"
            style={{ color: 'var(--text-primary)' }}
          >
            Unlock dynamic codes
          </Dialog.Title>
          <Dialog.Description className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
            Start your 14-day free trial. Cancel anytime.
          </Dialog.Description>

          {/* Billing toggle */}
          <div
            className="flex rounded-sm p-1 mb-4"
            style={{ background: 'var(--input-bg)', border: '1px solid var(--border)' }}
            role="radiogroup"
            aria-label="Billing period"
          >
            <button
              type="button"
              role="radio"
              aria-checked={billing === 'monthly'}
              onClick={() => setBilling('monthly')}
              className="flex-1 text-sm font-medium rounded-sm py-1.5 transition-colors"
              style={{
                background: billing === 'monthly' ? 'var(--accent)' : 'transparent',
                color: billing === 'monthly' ? 'var(--accent-text, #fff)' : 'var(--text-secondary)',
              }}
            >
              Monthly
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={billing === 'annual'}
              onClick={() => setBilling('annual')}
              className="flex-1 text-sm font-medium rounded-sm py-1.5 transition-colors"
              style={{
                background: billing === 'annual' ? 'var(--accent)' : 'transparent',
                color: billing === 'annual' ? 'var(--accent-text, #fff)' : 'var(--text-secondary)',
              }}
            >
              Annual
            </button>
          </div>

          <div className="mb-4">
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold" style={{ color: 'var(--text-primary)' }}>
                {priceLabel}
              </span>
              {billing === 'annual' && (
                <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>
                  save $12
                </span>
              )}
            </div>
            <ul className="mt-3 flex flex-col gap-1.5 text-sm" style={{ color: 'var(--text-secondary)' }}>
              <li>25 dynamic codes</li>
              <li>Scan analytics</li>
              <li>Everything in the free tier</li>
            </ul>
          </div>

          <button
            type="button"
            onClick={handleCheckout}
            disabled={loading}
            className="w-full text-sm font-medium rounded-sm px-3 py-2.5 transition-colors"
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-text, #fff)',
              opacity: loading ? 0.7 : 1,
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? 'Starting checkout...' : 'Start 14-day free trial'}
          </button>

          <Dialog.Close asChild>
            <button
              className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              aria-label="Close"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
