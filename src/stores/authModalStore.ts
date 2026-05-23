import { create } from 'zustand';
import { analyticsAdapter } from '@platform';

// The user-facing places that can open the auth modal. Used as the `trigger`
// property on the auth_modal_opened analytics event so we can see which paths
// drive the most signups.
export type AuthModalTrigger =
  | 'sidebar'
  | 'gated_feature'
  | 'dynamic_code_button'
  | 'dynamic_code_inline_create'
  | 'unknown';

interface AuthModalState {
  isOpen: boolean;
  open: (trigger?: AuthModalTrigger) => void;
  // setOpen is for controlled-component bridges (e.g. Radix Dialog onOpenChange).
  // It does NOT fire analytics — use open() with a trigger from user-initiated paths.
  setOpen: (isOpen: boolean) => void;
  close: () => void;
}

export const useAuthModalStore = create<AuthModalState>((set) => ({
  isOpen: false,
  open: (trigger = 'unknown') => {
    analyticsAdapter.track('auth_modal_opened', { trigger });
    set({ isOpen: true });
  },
  setOpen: (isOpen) => set({ isOpen }),
  close: () => set({ isOpen: false }),
}));
