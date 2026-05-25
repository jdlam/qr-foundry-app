import type { AnalyticsAdapter, ConsentState } from '../types';
import { loadPrefs, setTelemetryEnabled, setTelemetryPrompted, setLastActiveDate, setAliased } from './prefs';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const POSTHOG_HOST: string =
  (import.meta.env.VITE_POSTHOG_HOST as string | undefined) ?? 'https://us.i.posthog.com';

// Build-time constant injected via vite.config.ts define
declare const __APP_VERSION__: string;
const APP_VERSION: string = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

// Resolved to today's UTC date string (YYYY-MM-DD)
function todayUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

// OS: navigator.userAgent for simplicity (no extra Tauri plugin dep required)
function getOs(): string {
  const ua = navigator.userAgent;
  if (ua.includes('Mac')) return 'macos';
  if (ua.includes('Win')) return 'windows';
  if (ua.includes('Linux')) return 'linux';
  return 'unknown';
}

/**
 * Send a single event to PostHog's /capture/ endpoint.
 * Fire-and-forget — never throws into callers.
 */
async function sendCapture(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): Promise<void> {
  // Never send with an empty distinct_id (e.g. if a send is attempted before
  // prefs have loaded and installId is set) — that would create a junk person.
  if (!distinctId) return;

  const host = POSTHOG_HOST.replace(/\/$/, '');
  try {
    await fetch(`${host}/capture/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: distinctId,
        event,
        properties: {
          ...properties,
          platform: 'desktop',
          app_version: APP_VERSION,
          os: getOs(),
          // Minimise location collection: override the stored IP AND explicitly
          // disable GeoIP enrichment ($ip:'0' alone doesn't, since '0' is truthy).
          // These are written AFTER ...properties so a call site can never override them.
          $ip: '0',
          $geoip_disable: true,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (err) {
    console.error('[analytics] capture failed:', err);
  }
}

// --- module state ---

let installId = '';
let activeDistinctId = '';
let enabled = false;
let aliased = false;
let ready: Promise<void> = Promise.resolve();
let initialized = false;

/**
 * Resets all module-level state. Used only in tests.
 * @internal
 */
export function _resetForTest(): void {
  installId = '';
  activeDistinctId = '';
  enabled = false;
  aliased = false;
  ready = Promise.resolve();
  initialized = false;
}

/**
 * Allows the Settings toggle and first-run dialog to flip telemetryEnabled
 * at runtime without a full init cycle.
 */
export async function setTelemetryEnabledRuntime(value: boolean): Promise<void> {
  enabled = value;
  await setTelemetryEnabled(value);
}

export { ready as analyticsReady };

/**
 * Tauri analytics adapter — opt-in, anonymous-first.
 *
 * Privacy contract — see plans/architecture/adr/0002-desktop-opt-in-telemetry.md.
 * Sends nothing unless telemetryEnabled === true AND VITE_POSTHOG_KEY is set.
 * The interface is sync; async prefs load is kicked off in init() and all
 * send operations await the ready promise to avoid dropped events.
 */
export const analyticsAdapter: AnalyticsAdapter = {
  /**
   * Kicks off async prefs load. Safe to call multiple times (noop after first).
   * After ready resolves, fires app_active once per UTC day if enabled.
   */
  init() {
    if (!POSTHOG_KEY) return;
    if (initialized) return;
    initialized = true;

    ready = (async () => {
      const prefs = await loadPrefs();
      installId = prefs.installId;
      activeDistinctId = prefs.installId;
      enabled = prefs.telemetryEnabled;
      aliased = prefs.aliased;

      if (!enabled) return;

      const today = todayUtc();
      if (prefs.lastActiveDate !== today) {
        await setLastActiveDate(today);
        await sendCapture(activeDistinctId, 'app_active');
      }
    })();
  },

  identify(userId: string, properties?: Record<string, unknown>) {
    if (!POSTHOG_KEY) return;

    void ready.then(async () => {
      if (!enabled) return;

      // Alias the anonymous installId to the authenticated userId — at most once
      // per install, ever (persisted across restarts). Re-aliasing would permanently
      // merge distinct users in PostHog on shared devices.
      if (!aliased && installId) {
        aliased = true;
        await setAliased(true);
        await sendCapture(installId, '$create_alias', {
          alias: userId,
        });
      }

      activeDistinctId = userId;

      await sendCapture(userId, '$identify', {
        $set: {
          email: properties?.email,
          plan_tier: properties?.plan_tier,
          ...properties,
        },
      });
    });
  },

  track(event: string, properties?: Record<string, unknown>) {
    if (!POSTHOG_KEY) return;

    void ready.then(async () => {
      if (!enabled) return;
      await sendCapture(activeDistinctId, event, properties);
    });
  },

  reset() {
    if (!POSTHOG_KEY) return;

    void ready.then(() => {
      // Revert to installId — do NOT mint a new id, do NOT attempt to unmerge.
      // See ADR-0002: the alias is permanent in PostHog; that's intended.
      activeDistinctId = installId;
    });
  },

  async getConsent(): Promise<ConsentState> {
    const prefs = await loadPrefs();
    return { enabled: prefs.telemetryEnabled, prompted: prefs.telemetryPrompted };
  },

  async setConsentEnabled(value: boolean): Promise<void> {
    await setTelemetryEnabledRuntime(value);
  },

  async markConsentPrompted(): Promise<void> {
    await setTelemetryPrompted(true);
  },
};
