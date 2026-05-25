import { create } from 'zustand';

// Where the upgrade modal can be opened from. Currently only the gated-feature
// paywall path (logged-in free user). Kept as a union so future entry points
// (e.g. a sidebar "Upgrade" button) can be distinguished without prop-drilling.
export type UpgradeModalTrigger = 'gated_feature' | 'unknown';

interface UpgradeModalState {
  isOpen: boolean;
  // The feature that triggered the modal, if any — used for the checkout_started
  // event so we can attribute conversions back to the gate that drove them.
  feature: string | null;
  // Set true once the user has been sent to Stripe checkout. On desktop the
  // payment happens out-of-process (system browser), so this flag tells the
  // focus-refetch hook to re-check entitlement when the window regains focus.
  // Cleared when the plan upgrades or when checkout is abandoned.
  checkoutInFlight: boolean;
  open: (trigger?: UpgradeModalTrigger, feature?: string) => void;
  // setOpen is for controlled-component bridges (Radix Dialog onOpenChange).
  setOpen: (isOpen: boolean) => void;
  close: () => void;
  setCheckoutInFlight: (inFlight: boolean) => void;
}

export const useUpgradeModalStore = create<UpgradeModalState>((set) => ({
  isOpen: false,
  feature: null,
  checkoutInFlight: false,
  // The paywall_hit event already fires at the requireAccess call site, so the
  // store deliberately does NOT emit analytics on open — that would double-count
  // the friction signal. The conversion intent (checkout_started) fires from the
  // modal's primary button instead.
  open: (_trigger = 'unknown', feature) => set({ isOpen: true, feature: feature ?? null }),
  setOpen: (isOpen) => set({ isOpen }),
  close: () => set({ isOpen: false }),
  setCheckoutInFlight: (inFlight) => set({ checkoutInFlight: inFlight }),
}));
