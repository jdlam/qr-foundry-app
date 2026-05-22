import type { AnalyticsAdapter } from '../types';

/**
 * Tauri analytics adapter — deliberately a no-op.
 *
 * Desktop telemetry has different privacy expectations than a hosted web app
 * (the user owns the binary; consent is implicit only for what's documented).
 * Out of scope for ADR-0001; revisit if/when we add an explicit opt-in toggle.
 */
export const analyticsAdapter: AnalyticsAdapter = {
  init() {},
  identify() {},
  track() {},
  reset() {},
};
