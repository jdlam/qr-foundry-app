import { LazyStore } from '@tauri-apps/plugin-store';

const store = new LazyStore('prefs.json');

const INSTALL_ID_KEY = 'installId';
const TELEMETRY_ENABLED_KEY = 'telemetryEnabled';
const TELEMETRY_PROMPTED_KEY = 'telemetryPrompted';
const LAST_ACTIVE_DATE_KEY = 'lastActiveDate';
const ALIASED_KEY = 'aliased';

export interface Prefs {
  installId: string;
  telemetryEnabled: boolean;
  telemetryPrompted: boolean;
  lastActiveDate: string | null;
  /** Whether installId has ever been aliased to a userId. Persisted so we never
   *  re-alias across restarts — re-aliasing would merge distinct users in PostHog. */
  aliased: boolean;
}

/**
 * Loads prefs from the store, minting an installId on first read.
 * The installId is a random UUID (v4) — not derived from hardware.
 * Re-installing produces a new ID by design.
 */
export async function loadPrefs(): Promise<Prefs> {
  let installId = await store.get<string>(INSTALL_ID_KEY);
  if (!installId) {
    installId = crypto.randomUUID();
    await store.set(INSTALL_ID_KEY, installId);
    await store.save();
  }

  const telemetryEnabled = (await store.get<boolean>(TELEMETRY_ENABLED_KEY)) ?? false;
  const telemetryPrompted = (await store.get<boolean>(TELEMETRY_PROMPTED_KEY)) ?? false;
  const lastActiveDate = (await store.get<string>(LAST_ACTIVE_DATE_KEY)) ?? null;
  const aliased = (await store.get<boolean>(ALIASED_KEY)) ?? false;

  return { installId, telemetryEnabled, telemetryPrompted, lastActiveDate, aliased };
}

export async function setTelemetryEnabled(enabled: boolean): Promise<void> {
  await store.set(TELEMETRY_ENABLED_KEY, enabled);
  await store.save();
}

export async function setTelemetryPrompted(prompted: boolean): Promise<void> {
  await store.set(TELEMETRY_PROMPTED_KEY, prompted);
  await store.save();
}

export async function setLastActiveDate(date: string): Promise<void> {
  await store.set(LAST_ACTIVE_DATE_KEY, date);
  await store.save();
}

export async function setAliased(value: boolean): Promise<void> {
  await store.set(ALIASED_KEY, value);
  await store.save();
}
