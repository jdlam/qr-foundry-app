import type { OpenExternalAdapter } from '../types';

export const openExternalAdapter: OpenExternalAdapter = {
  async open(url: string): Promise<void> {
    // Must be called synchronously from a user gesture (the checkout button's
    // onClick) or the browser may block the new tab. If the popup is blocked
    // (returns null), fall back to navigating the current tab.
    const opened = window.open(url, '_blank', 'noopener,noreferrer');
    if (!opened) {
      window.location.assign(url);
    }
  },
};
