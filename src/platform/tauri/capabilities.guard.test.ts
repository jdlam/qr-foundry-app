/**
 * Regression guard: every Tauri plugin used in production source must have a
 * matching permission grant in src-tauri/capabilities/default.json.
 *
 * WHY this test exists:
 * Tauri v2 uses a deny-by-default ACL system. Any plugin command invoked from
 * JS — `store.get`, `clipboard.writeText`, `fs.readFile`, etc. — REJECTS at
 * runtime in the real desktop build if the corresponding `<plugin>:` permission
 * is absent from the capabilities file. The rejection happens in the native
 * runtime; it is invisible to unit tests that mock the plugin modules.
 *
 * This guard closes that gap by:
 *   1. Scanning all production TS/TSX source files for `@tauri-apps/plugin-*`
 *      imports (both static `import … from` and dynamic `import(…)` forms).
 *   2. Deriving the permission namespace (strip the `@tauri-apps/plugin-` prefix).
 *   3. Asserting at least one granted permission starts with `<namespace>:` for
 *      every plugin found.
 *
 * If a developer adds a new plugin import but forgets to add its capability,
 * this test fails with a message that names the plugin and explains why.
 *
 * SPECIFIC HARDENED CHECK:
 * Beyond the generic coverage assertion, `store:default` is pinned exactly.
 * `tauri-plugin-store` is used by two critical paths:
 *   - src/platform/tauri/prefs.ts  → LazyStore('prefs.json') → telemetry
 *     consent + install-id
 *   - src/platform/tauri/auth.ts   → LazyStore('auth.json')  → JWT persistence
 *
 * A narrowed grant (e.g. "store:allow-get" alone) would satisfy the prefix
 * check above while still breaking set/save/delete at runtime. Pinning the
 * exact string "store:default" ensures any accidental narrowing or rename is
 * caught before it reaches a desktop build.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'fs';
import { resolve, join } from 'path';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Walk a directory tree and return all file paths matching the predicate. */
function walkSync(dir: string, predicate: (filePath: string) => boolean): string[] {
  const results: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results.push(...walkSync(full, predicate));
    } else if (predicate(full)) {
      results.push(full);
    }
  }
  return results;
}

/**
 * Return the set of Tauri plugin namespaces imported in production source.
 *
 * Matches both:
 *   import … from '@tauri-apps/plugin-<name>'
 *   import('@tauri-apps/plugin-<name>')
 *
 * Test files (*.test.ts / *.test.tsx) are excluded because they mock the
 * plugins and their imports don't represent real runtime dependencies.
 */
function discoverPluginNamespaces(srcDir: string): Set<string> {
  const PLUGIN_RE = /@tauri-apps\/plugin-([\w-]+)/g;
  const TEST_FILE_RE = /\.test\.(ts|tsx)$/;

  const files = walkSync(srcDir, (f) => {
    if (TEST_FILE_RE.test(f)) return false;
    return f.endsWith('.ts') || f.endsWith('.tsx');
  });

  const namespaces = new Set<string>();
  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    for (const match of content.matchAll(PLUGIN_RE)) {
      namespaces.add(match[1]);
    }
  }
  return namespaces;
}

// ---------------------------------------------------------------------------
// Fixture paths (relative to __dirname so the test is portable)
// ---------------------------------------------------------------------------

const CAPABILITIES_PATH = resolve(
  __dirname,
  '../../../src-tauri/capabilities/default.json',
);

// __dirname is src/platform/tauri — walk from src/
const PRODUCTION_SRC_DIR = resolve(__dirname, '../..');

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tauri capabilities — plugin ACL coverage guard', () => {
  const raw = readFileSync(CAPABILITIES_PATH, 'utf-8');
  const capabilities = JSON.parse(raw) as { permissions?: string[] };
  const permissions: string[] = capabilities.permissions ?? [];

  const pluginNamespaces = discoverPluginNamespaces(PRODUCTION_SRC_DIR);

  // ── Generic coverage: every imported plugin must have at least one grant ──

  it('grants at least one <plugin>: permission for every plugin imported in production source', () => {
    const ungrantedPlugins: string[] = [];

    for (const ns of pluginNamespaces) {
      const hasGrant = permissions.some((p) => p.startsWith(`${ns}:`));
      if (!hasGrant) {
        ungrantedPlugins.push(ns);
      }
    }

    expect(ungrantedPlugins, buildUngrantedMessage(ungrantedPlugins)).toHaveLength(0);
  });

  // ── Exact pin: store:default must be present verbatim ────────────────────

  it('grants "store:default" exactly so all store plugin commands (get/set/save/delete) work at runtime', () => {
    // The exact grant "store:default" is required — not just any store:-prefixed string.
    // "store:default" is the permission-set identifier that covers ALL store plugin
    // commands (get, set, save, delete, load, etc.) as confirmed by the generated ACL
    // manifest at src-tauri/gen/schemas/acl-manifests.json.
    //
    // A narrowed grant (e.g. "store:allow-get" alone) or a typo would pass the
    // prefix check above while still breaking set/save/delete at runtime — failures
    // that mocked unit tests can never see because the ACL is enforced by the native
    // Tauri runtime, not the JS module. Pinning the exact string ensures any accidental
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

  // ── Discovery sanity: confirm we found the expected core plugins ──────────

  it('discovers at least the known-critical plugin namespaces from production source', () => {
    // This assertion documents which plugins are currently expected. If this
    // fails, a plugin was removed without updating this guard — investigate
    // whether the capability should also be removed.
    const knownCritical = ['store', 'fs', 'opener'];
    for (const ns of knownCritical) {
      expect(
        pluginNamespaces,
        `Expected to find '@tauri-apps/plugin-${ns}' imported in production source. ` +
        `If the plugin was removed, update this guard and remove its capability grant.`,
      ).toContain(ns);
    }
  });
});

// ---------------------------------------------------------------------------
// Error message helper
// ---------------------------------------------------------------------------

function buildUngrantedMessage(ungrantedPlugins: string[]): string {
  if (ungrantedPlugins.length === 0) return '';
  const list = ungrantedPlugins.map((ns) => `  - @tauri-apps/plugin-${ns}  (needs at least one "${ns}:" permission)`).join('\n');
  return [
    '',
    'The following Tauri plugins are imported in production source but have NO',
    'matching permission grant in src-tauri/capabilities/default.json:',
    '',
    list,
    '',
    'Tauri v2 is deny-by-default: every plugin command called from JS rejects at',
    'runtime in the real desktop build unless an explicit `<plugin>:` permission is',
    'granted in capabilities/default.json. This failure is INVISIBLE to unit tests',
    'that mock the plugin modules — only this file-system guard catches it.',
    '',
    'To fix: add at least one `"<plugin>:default"` (or a narrower set of',
    '`"<plugin>:allow-*"` permissions) to the "permissions" array in',
    'src-tauri/capabilities/default.json for each plugin listed above.',
  ].join('\n');
}
