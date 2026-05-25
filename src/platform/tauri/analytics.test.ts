/**
 * Tests for the Tauri analytics adapter.
 *
 * WHY these tests exist:
 * - The adapter is the consent gate: nothing must send unless telemetryEnabled===true AND a key is present.
 * - The alias flow is a one-time irreversible PostHog operation; we must not repeat it or skip it.
 * - app_active dedup prevents event inflation — fired at most once per UTC day per install.
 * - distinct_id lifecycle (installId → userId on login, back to installId on logout) determines
 *   whether PostHog correctly merges desktop sessions with web sessions.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---- mock @tauri-apps/plugin-store (must register before importing adapter) -

// vi.hoisted so these exist when the hoisted vi.mock factory runs (avoids TDZ on MockLazyStore).
const { storeData, mockGet, mockSet, mockSave, MockLazyStore } = vi.hoisted(() => {
  // Stub env BEFORE the adapter module is imported. The adapter captures
  // POSTHOG_KEY/HOST in module-level consts at eval time; since ES imports are
  // hoisted above any top-level stubEnv call, those would run too late and the
  // key would read as undefined (short-circuiting every send). vi.hoisted runs
  // before imports, so the consts capture these values.
  vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
  vi.stubEnv('VITE_POSTHOG_HOST', 'https://ph.test');
  const storeData: Record<string, unknown> = {};
  const mockGet = vi.fn(async (key: string) => storeData[key] ?? undefined);
  const mockSet = vi.fn(async (key: string, value: unknown) => { storeData[key] = value; });
  const mockSave = vi.fn(async () => {});
  class MockLazyStore {
    constructor(_name: string) {}
    get = mockGet;
    set = mockSet;
    save = mockSave;
    delete = vi.fn(async (key: string) => { delete storeData[key]; });
  }
  return { storeData, mockGet, mockSet, mockSave, MockLazyStore };
});

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: MockLazyStore,
}));

// ---- mock fetch --------------------------------------------------------------

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

// ---- deterministic install UUID ---------------------------------------------

const MOCK_INSTALL_ID = 'aaaaaaaa-0000-0000-0000-000000000001';
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => MOCK_INSTALL_ID) });

// ---- stable env (set once; the "no-key" test stubs temporarily) -------------

vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
vi.stubEnv('VITE_POSTHOG_HOST', 'https://ph.test');

// ---- import adapter ONCE so all tests share the same module -----------------

import {
  analyticsAdapter as adapter,
  analyticsReady,
  setTelemetryEnabledRuntime,
  _resetForTest,
} from './analytics';

// ---- helper -----------------------------------------------------------------

const TODAY = new Date().toISOString().slice(0, 10);

/**
 * Reset adapter state and store between tests. Seed storeData before calling adapter.init().
 */
function setupStore(opts: {
  installId?: string;
  telemetryEnabled?: boolean;
  lastActiveDate?: string | null;
  aliased?: boolean;
} = {}) {
  for (const k of Object.keys(storeData)) delete storeData[k];
  if (opts.installId !== undefined) storeData['installId'] = opts.installId;
  if (opts.telemetryEnabled !== undefined) storeData['telemetryEnabled'] = opts.telemetryEnabled;
  if (opts.lastActiveDate != null) storeData['lastActiveDate'] = opts.lastActiveDate;
  if (opts.aliased !== undefined) storeData['aliased'] = opts.aliased;

  mockGet.mockClear();
  mockSet.mockClear();
  mockSave.mockClear();
  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true });

  _resetForTest();
}

// ---------------------------------------------------------------------------

describe('Tauri analytics adapter', () => {

  beforeEach(() => {
    vi.stubEnv('VITE_POSTHOG_KEY', 'phc_test_key');
    vi.stubEnv('VITE_POSTHOG_HOST', 'https://ph.test');
    setupStore();
  });

  describe('no-op when telemetryEnabled is false (disabled branch)', () => {
    it('sends nothing when telemetryEnabled=false, regardless of key presence', async () => {
      // NOTE: POSTHOG_KEY is a module-level const captured at eval time.
      // True "key missing" coverage lives in analytics.nokey.test.ts, which imports
      // a fresh module without the key stub. This test instead covers the disabled
      // branch: key is present but telemetryEnabled=false, so nothing should fire.
      setupStore({ installId: MOCK_INSTALL_ID, telemetryEnabled: false });
      adapter.init();
      await analyticsReady;
      adapter.track('qr_generated', { type: 'url' });
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('disabled by default (telemetryEnabled=false)', () => {
    it('sends nothing when telemetryEnabled is false', async () => {
      // No telemetryEnabled in store → defaults to false
      setupStore({ installId: MOCK_INSTALL_ID });
      adapter.init();
      await analyticsReady;
      adapter.track('qr_generated');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('install ID', () => {
    it('mints a UUID and persists it on first load', async () => {
      // No installId in store → should mint one
      setupStore();
      adapter.init();
      await analyticsReady;

      expect(mockSet).toHaveBeenCalledWith('installId', MOCK_INSTALL_ID);
      expect(mockSave).toHaveBeenCalled();
    });

    it('reuses existing installId and does NOT call set for installId again', async () => {
      setupStore({ installId: 'existing-id-999' });
      adapter.init();
      await analyticsReady;

      const installIdSetCalls = mockSet.mock.calls.filter(([k]) => k === 'installId');
      expect(installIdSetCalls).toHaveLength(0);
    });
  });

  describe('app_active dedup', () => {
    it('fires app_active when lastActiveDate is a past date', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: '2020-01-01',
      });

      adapter.init();
      await analyticsReady;

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { event: string; distinct_id: string };
      expect(body.event).toBe('app_active');
      expect(body.distinct_id).toBe(MOCK_INSTALL_ID);
    });

    it('does NOT fire app_active if lastActiveDate is already today', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('persists today as lastActiveDate after firing app_active', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: '2020-01-01',
      });

      adapter.init();
      await analyticsReady;

      const setCall = mockSet.mock.calls.find(([k]) => k === 'lastActiveDate');
      expect(setCall).toBeTruthy();
      expect(setCall![1]).toBe(TODAY);
    });
  });

  describe('identify — alias then identify, switches distinct_id', () => {
    it('sends $create_alias then $identify when identifying from anonymous state', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.identify('user-123', { email: 'a@b.com', plan_tier: 'free' });
      await new Promise((r) => setTimeout(r, 20));

      const events = mockFetch.mock.calls.map((c) => {
        return JSON.parse(c[1].body as string) as { event: string; distinct_id: string; properties: Record<string, unknown> };
      });

      const alias = events.find((e) => e.event === '$create_alias');
      expect(alias).toBeTruthy();
      expect(alias!.distinct_id).toBe(MOCK_INSTALL_ID);
      expect(alias!.properties.alias).toBe('user-123');

      const identify = events.find((e) => e.event === '$identify');
      expect(identify).toBeTruthy();
      expect(identify!.distinct_id).toBe('user-123');
    });

    it('uses userId as distinct_id for subsequent track calls after identify', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.identify('user-456', { email: 'x@y.com' });
      await new Promise((r) => setTimeout(r, 20));
      mockFetch.mockClear();

      adapter.track('qr_generated');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { distinct_id: string };
      expect(body.distinct_id).toBe('user-456');
    });

    it('does NOT send $create_alias on second identify call (distinct_id already userId)', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.identify('user-789');
      await new Promise((r) => setTimeout(r, 20));
      mockFetch.mockClear();

      adapter.identify('user-789');
      await new Promise((r) => setTimeout(r, 20));

      const events = mockFetch.mock.calls.map((c) => {
        return JSON.parse(c[1].body as string) as { event: string };
      });
      expect(events.filter((e) => e.event === '$create_alias')).toHaveLength(0);
    });
  });

  describe('reset', () => {
    it('reverts activeDistinctId to installId so subsequent tracks use the anonymous id', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.identify('user-reset-me');
      await new Promise((r) => setTimeout(r, 20));
      mockFetch.mockClear();

      adapter.reset();
      await new Promise((r) => setTimeout(r, 20));

      adapter.track('some_event');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { distinct_id: string };
      expect(body.distinct_id).toBe(MOCK_INSTALL_ID);
    });
  });

  describe('central properties', () => {
    it('attaches platform, app_version, and os to every event', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.track('test_event');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).toHaveBeenCalledOnce();
      const body = JSON.parse(mockFetch.mock.calls[0][1].body as string) as { properties: Record<string, unknown> };
      expect(body.properties.platform).toBe('desktop');
      expect(body.properties.app_version).toBeDefined();
      expect(body.properties.os).toBeDefined();
    });
  });

  describe('alias-once regression — shared-device multi-user', () => {
    it('sends $create_alias exactly once even after logout and re-login as a different user', async () => {
      // CRITICAL: identify(A) → reset() → identify(B) must NOT fire a second alias.
      // If it did, PostHog would permanently merge user-A and user-B into one person.
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      // First login: should alias installId → user-A and $identify as user-A
      adapter.identify('user-A', { email: 'a@example.com' });
      await new Promise((r) => setTimeout(r, 20));

      // Logout: reverts activeDistinctId to installId
      adapter.reset();
      await new Promise((r) => setTimeout(r, 20));

      // Second login as a different user: must NOT alias again
      adapter.identify('user-B', { email: 'b@example.com' });
      await new Promise((r) => setTimeout(r, 20));

      const events = mockFetch.mock.calls.map((c) =>
        JSON.parse(c[1].body as string) as { event: string; distinct_id: string; properties: Record<string, unknown> }
      );

      const aliasEvents = events.filter((e) => e.event === '$create_alias');
      expect(aliasEvents).toHaveLength(1);
      expect(aliasEvents[0].properties.alias).toBe('user-A'); // never user-B

      // user-B still gets a $identify (they can still be tracked, just not aliased)
      const identifyForB = events.filter(
        (e) => e.event === '$identify' && e.distinct_id === 'user-B'
      );
      expect(identifyForB).toHaveLength(1);

      // aliased flag was persisted
      const setAliasedCall = mockSet.mock.calls.find(([k]) => k === 'aliased');
      expect(setAliasedCall).toBeTruthy();
      expect(setAliasedCall![1]).toBe(true);
    });
  });

  describe('persisted aliased flag — respected across restarts', () => {
    it('skips $create_alias when prefs.aliased is already true on init', async () => {
      // Simulates a restart where aliasing already happened in a prior session.
      // The flag in the store prevents re-aliasing even though activeDistinctId === installId.
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
        aliased: true, // persisted from a prior session
      });

      adapter.init();
      await analyticsReady;

      adapter.identify('user-X', { email: 'x@example.com' });
      await new Promise((r) => setTimeout(r, 20));

      const events = mockFetch.mock.calls.map((c) =>
        JSON.parse(c[1].body as string) as { event: string }
      );

      expect(events.filter((e) => e.event === '$create_alias')).toHaveLength(0);
      expect(events.filter((e) => e.event === '$identify')).toHaveLength(1);
    });
  });

  describe('GeoIP suppression', () => {
    it('attaches $geoip_disable:true and $ip:"0" to every event', async () => {
      // Ensures IP-based location data cannot be inferred by PostHog.
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      adapter.track('test_geoip_event');
      await new Promise((r) => setTimeout(r, 20));

      const body = JSON.parse(
        mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body as string
      ) as { properties: Record<string, unknown> };
      expect(body.properties.$geoip_disable).toBe(true);
      expect(body.properties.$ip).toBe('0');
    });

    it('privacy props cannot be overridden by call-site properties (defense-in-depth)', async () => {
      // WHY: The privacy guarantee ($ip:'0', $geoip_disable:true, platform:'desktop')
      // must hold even if a future call site inadvertently passes conflicting values.
      // This test fails if ...properties is spread AFTER the fixed central props,
      // i.e. if the spread order is ever reverted to the unsafe form.
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      // Attempt to override the three privacy-critical central props from a call site.
      adapter.track('some_event', {
        $ip: 'attacker-ip',
        platform: 'web',
        $geoip_disable: false,
      });
      await new Promise((r) => setTimeout(r, 20));

      const body = JSON.parse(
        mockFetch.mock.calls[mockFetch.mock.calls.length - 1][1].body as string
      ) as { properties: Record<string, unknown> };

      // All three must reflect the fixed central values, not the caller-supplied values.
      expect(body.properties.$ip).toBe('0');
      expect(body.properties.$geoip_disable).toBe(true);
      expect(body.properties.platform).toBe('desktop');
    });
  });

  describe('empty distinct_id guard', () => {
    it('does not call fetch when installId was never loaded (no init)', async () => {
      // Without init(), installId is '' → sendCapture must early-return to avoid
      // creating a junk anonymous person in PostHog.
      setupStore(); // do NOT call adapter.init()
      await setTelemetryEnabledRuntime(true);

      adapter.track('should_be_blocked');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe('setTelemetryEnabledRuntime', () => {
    it('immediately stops sending when flipped to false', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: true,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      await setTelemetryEnabledRuntime(false);
      mockFetch.mockClear();

      adapter.track('should_not_send');
      await new Promise((r) => setTimeout(r, 20));

      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('immediately starts sending when flipped to true', async () => {
      setupStore({
        installId: MOCK_INSTALL_ID,
        telemetryEnabled: false,
        lastActiveDate: TODAY,
      });

      adapter.init();
      await analyticsReady;

      await setTelemetryEnabledRuntime(true);

      adapter.track('now_sending');
      await new Promise((r) => setTimeout(r, 20));

      const events = mockFetch.mock.calls.map((c) => {
        return JSON.parse(c[1].body as string) as { event: string };
      });
      expect(events.some((e) => e.event === 'now_sending')).toBe(true);
    });
  });
});
