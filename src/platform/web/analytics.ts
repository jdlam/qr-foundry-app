import posthog from 'posthog-js';
import type { AnalyticsAdapter } from '../types';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY;
const POSTHOG_HOST =
  import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com';

let initialized = false;

/**
 * Web analytics adapter — full identified mode.
 *
 * Privacy contract — see plans/architecture/adr/0001-analytics-posthog-split-config.md.
 * The authenticated web app DOES identify users (by ID, email, plan tier) so we can
 * measure the free → trial → paid funnel. This is acceptable because the user has
 * authenticated and accepted the ToS; it's a different posture than the marketing
 * site which stays cookieless.
 *
 * Bails quietly when VITE_POSTHOG_KEY is unset (local dev without .env.local,
 * CI builds where the GitHub variable isn't wired, Tauri build which doesn't
 * load this module). The key is a public client key, not a secret.
 */
export const analyticsAdapter: AnalyticsAdapter = {
  init() {
    if (initialized) return;
    if (!POSTHOG_KEY) return;
    if (typeof window === 'undefined') return;

    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: false,
      capture_pageview: true,
      capture_pageleave: true,
      disable_session_recording: true,
      disable_surveys: true,
    });

    initialized = true;
  },

  identify(userId, properties) {
    if (!initialized) return;
    posthog.identify(userId, properties);
  },

  track(event, properties) {
    if (!initialized) return;
    posthog.capture(event, properties);
  },

  reset() {
    if (!initialized) return;
    posthog.reset();
  },
};
