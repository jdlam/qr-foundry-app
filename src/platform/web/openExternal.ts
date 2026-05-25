import type { OpenExternalAdapter } from '../types';

export const openExternalAdapter: OpenExternalAdapter = {
  async open(url: string): Promise<void> {
    // Navigate the current tab rather than opening a new one. Stripe Checkout is
    // a full-page hosted flow that redirects back to our origin with
    // ?upgrade=success|cancel, which usePlanRefetchOnReturn reads on mount — a
    // same-tab redirect keeps that return flow coherent (a new tab would land
    // the entitlement in a second tab while this one stayed stale). It also
    // sidesteps popup blockers, which reject window.open here anyway since this
    // runs after an await, past the click's transient activation.
    window.location.assign(url);
  },
};
