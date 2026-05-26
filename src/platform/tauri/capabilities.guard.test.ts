/**
 * Regression guard: Tauri store plugin capability must be granted.
 *
 * WHY this test exists:
 * Tauri v2 uses a deny-by-default ACL system. `tauri-plugin-store` is registered
 * in src-tauri/src/lib.rs and used by TWO critical paths:
 *   - src/platform/tauri/prefs.ts  → LazyStore('prefs.json')  → telemetry consent + install-id
 *   - src/platform/tauri/auth.ts   → LazyStore('auth.json')   → JWT token persistence
 *
 * WITHOUT a `store:` permission in capabilities/default.json, every
 * store.get / store.set / store.save / store.delete call REJECTS at runtime in
 * the real desktop build. The consent dialog silently never renders (its mount
 * effect awaits getConsent() → loadPrefs() which rejects, leaving `open` stuck
 * at null), and the user is permanently logged out after each restart.
 *
 * Unit tests that mock `@tauri-apps/plugin-store` cannot catch this because the
 * ACL is enforced by the native Tauri runtime, not the JS module. This test
 * reads the real capability file to close that gap.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const CAPABILITIES_PATH = resolve(
  __dirname,
  '../../../src-tauri/capabilities/default.json',
);

describe('Tauri capabilities — store plugin ACL guard', () => {
  it('grants a store: permission so prefs.json and auth.json stores work at runtime', () => {
    const raw = readFileSync(CAPABILITIES_PATH, 'utf-8');
    const capabilities = JSON.parse(raw) as { permissions?: string[] };

    const permissions: string[] = capabilities.permissions ?? [];

    // The exact grant "store:default" is required — not just any store:-prefixed string.
    // "store:default" is the permission-set identifier that covers ALL store plugin
    // commands (get, set, save, delete, load, etc.) as confirmed by the generated ACL
    // manifest at src-tauri/gen/schemas/acl-manifests.json.
    //
    // A narrowed grant (e.g. "store:allow-get" alone) or a typo would pass a loose
    // prefix check while still breaking set/save/delete at runtime — failures that
    // mocked unit tests can never see because the ACL is enforced by the native Tauri
    // runtime, not the JS module. Pinning the exact string ensures any accidental
    // narrowing or rename is caught here before it reaches a desktop build.
    expect(permissions, [
      '"store:default" is missing from src-tauri/capabilities/default.json.',
      'The exact grant "store:default" is required: any other store:-prefixed value',
      '(e.g. "store:allow-get") is insufficient and will cause tauri-plugin-store to',
      'reject set/save/delete calls at runtime, silently breaking telemetry consent',
      '(prefs.json) and JWT persistence (auth.json).',
      'Add the exact string "store:default" to the permissions array to fix.',
    ].join(' ')).toContain('store:default');
  });
});
