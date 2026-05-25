/**
 * Tests the `if (!POSTHOG_KEY) return` guards in the Tauri analytics adapter.
 *
 * WHY this is a separate file:
 * POSTHOG_KEY is a module-level const captured at eval time (import.meta.env.VITE_POSTHOG_KEY).
 * analytics.test.ts sets the key via vi.hoisted so all tests there run with a key present.
 * To test the guard that fires when no key exists, we need a fresh module import that
 * evaluates WITHOUT the env stub — so this file deliberately does NOT stub the env var.
 *
 * Each test here confirms that init/track/identify/reset all no-op when the PostHog
 * project key is absent, regardless of whether telemetry is enabled.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Set up @tauri-apps/plugin-store mock WITHOUT stubbing VITE_POSTHOG_KEY
// so the adapter module evaluates with POSTHOG_KEY === undefined.
const { storeData, MockLazyStore } = vi.hoisted(() => {
  // Intentionally no vi.stubEnv('VITE_POSTHOG_KEY', ...) here.
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
  return { storeData, MockLazyStore };
});

vi.mock('@tauri-apps/plugin-store', () => ({
  LazyStore: MockLazyStore,
}));

const mockFetch = vi.fn();
vi.stubGlobal('fetch', mockFetch);

const MOCK_INSTALL_ID = 'bbbbbbbb-0000-0000-0000-000000000002';
vi.stubGlobal('crypto', { randomUUID: vi.fn(() => MOCK_INSTALL_ID) });

// Import the adapter AFTER the mocks — no key stub was set above, so POSTHOG_KEY
// evaluates to undefined at module load time.
import {
  analyticsAdapter as adapter,
  analyticsReady,
  setTelemetryEnabledRuntime,
  _resetForTest,
} from './analytics';

beforeEach(() => {
  for (const k of Object.keys(storeData)) delete storeData[k];
  storeData['installId'] = MOCK_INSTALL_ID;
  storeData['telemetryEnabled'] = true; // even with telemetry enabled, no key → no send
  storeData['lastActiveDate'] = '2020-01-01';

  mockFetch.mockReset();
  mockFetch.mockResolvedValue({ ok: true });

  _resetForTest();
});

describe('Tauri analytics adapter — no PostHog key', () => {
  it('init() does not fire app_active when POSTHOG_KEY is undefined', async () => {
    // The `if (!POSTHOG_KEY) return` guard in init() must block all activity.
    adapter.init();
    await analyticsReady;

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('track() does not call fetch when POSTHOG_KEY is undefined', async () => {
    adapter.init();
    await analyticsReady;

    adapter.track('qr_generated', { type: 'url' });
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('identify() does not call fetch (no alias, no $identify) when POSTHOG_KEY is undefined', async () => {
    adapter.init();
    await analyticsReady;

    adapter.identify('user-nokey', { email: 'x@example.com' });
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('setTelemetryEnabledRuntime(true) + track does not call fetch when POSTHOG_KEY is undefined', async () => {
    // Ensures the runtime toggle cannot bypass the key guard.
    await setTelemetryEnabledRuntime(true);

    adapter.track('should_not_fire');
    await new Promise((r) => setTimeout(r, 20));

    expect(mockFetch).not.toHaveBeenCalled();
  });
});
