# Desktop Telemetry — Manual QA

How to exercise and verify the desktop app's opt-in telemetry end to end against a
local capture endpoint. This is a **manual** procedure, not a CI gate.

## Why this is manual

Desktop telemetry runs through two layers our unit tests can't reach: the native
**Tauri store plugin + capability ACL** (where consent/install-id are persisted) and
the **PostHog `/capture/` transport**. The 694 vitest tests mock `@tauri-apps/plugin-store`,
so the ACL is never enforced in them. That blind spot once shipped a real bug — a
missing `store:default` capability that silently killed telemetry *and* auth-token
persistence in the built app while every unit test stayed green. (A static guard now
catches that class: `src/platform/tauri/capabilities.guard.test.ts`. This document
covers everything the static guard can't — the live runtime behaviour.)

A full Tauri end-to-end harness (`tauri-driver` + WebDriver) isn't worth it here:
macOS WebView WebDriver support is poor, it needs a built binary, and the web build
can't exercise the desktop-only path. Hence: run it by hand, ~10 minutes.

## What you need

| Thing | How |
|-------|-----|
| Capture sink | `node scripts/telemetry-capture-sink.mjs` — CORS-enabled, logs to `/tmp/qrf-capture.log` |
| Local env | `.env.local` (gitignored) with the two vars below |
| Desktop app | `npm run tauri dev` |
| Web build (absence checks) | `npm run dev:web` → http://localhost:1420 |
| Sign-in test | local Billing API + dev impersonation — see [`../plans/LOCAL_DEV.md`](../../plans/LOCAL_DEV.md) |

`.env.local` (copy from `.env.local.example`):

```
VITE_POSTHOG_KEY=phc_localtest        # any non-empty value flips the adapter out of no-op mode
VITE_POSTHOG_HOST=http://localhost:9000 # point ingest at the local sink
```

> **Remove `.env.local` before committing.** It sets `VITE_POSTHOG_KEY`, which makes
> the `analytics.nokey.test.ts` tests (they assert no-key behaviour) fail in the
> pre-commit hook. The branch suite is green only without it.

> **CORS matters.** The webview sends a cross-origin `application/json` POST, which
> triggers a preflight. The sink answers it; without those headers the browser blocks
> the real POST and no events arrive. Real PostHog returns the same headers, so this
> only bites the local sink.

The desktop dev build (`import.meta.env.DEV`) exposes a bottom-right **dev login
widget** (FREE / SUB / SUB+ADD) and `__dev.simulateSubscription()` /
`__dev.simulateFreeTier()` in the devtools console (right-click → Inspect). These hit
the local impersonation endpoint — no real signup or Stripe needed.

## Quick start

```bash
# terminal 1 — the sink
node scripts/telemetry-capture-sink.mjs

# terminal 2 — the app (after writing .env.local)
npm run tauri dev

# terminal 3 — watch events land
tail -f /tmp/qrf-capture.log
```

## prefs.json — your control surface

macOS path (quit the app before editing — `LazyStore` writes on save, not on quit):

```
~/Library/Application Support/com.jonathanlam.qr-foundry/prefs.json
```

| To simulate | Do |
|-------------|----|
| Fresh install | delete `prefs.json` |
| Pre-telemetry user who auto-updated | reduce to `{ "installId": "<existing-uuid>" }` |
| New UTC day (re-fire `app_active`) | set `"lastActiveDate"` to an old date, e.g. `"2020-01-01"` |
| Declined / opted-in state | set `telemetryPrompted` / `telemetryEnabled` |

## The matrix

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| 1 | First-run dialog | Delete `prefs.json`, launch | Consent dialog appears; sink silent (not opted in) |
| 2 | Decline persists | Click **No thanks**; relaunch | `prefs` gets `telemetryPrompted:true`, `telemetryEnabled` stays false/absent; dialog does **not** reappear; no events |
| 3 | Opt-in fires events | Click **Enable**, then **export/copy/validate** a QR | `qr_generated` (`committed_via:"export"`) + `qr_exported` land in the sink |
| 4 | `app_active` once/day + dedup | Backdate `lastActiveDate`, launch → fires; relaunch same day → nothing; toggle off + backdate → nothing **and** date not stamped | Exactly one `app_active` per UTC day; none when disabled |
| 5 | No Privacy settings on web | `npm run dev:web`, open Settings | No Privacy/telemetry section exists |
| 6 | Toggle persists | Settings → Privacy → off; relaunch | Stays off across restart; no events while off |
| 7 | Auto-update prompt | Reduce `prefs` to `{installId}`, launch | Dialog appears; **install ID preserved**, not regenerated |
| 8 | No dialog on web | `npm run dev:web` | Consent dialog never renders |
| 9 | Identify + alias-once | Dev widget: click **SUB** then **FREE** | Exactly **one** `$create_alias` total (install-id → user-id, *not* per login); one `$identify` per user carrying `plan_tier` (`subscription`, then `free`) + `email` |

### Cross-cutting checks (apply to every event)

- **Privacy props present and exact:** `platform:"desktop"`, `$ip:"0"`, `$geoip_disable:true`,
  `app_version`, `os` — and nothing else identifying.
- **No QR content leaks:** the URL/Wi-Fi/contact data you encoded must appear in **no**
  payload. `qr_generated` sends only the `input_type` enum + `committed_via`; content
  stays local. Verify:
  ```bash
  grep -i "<the text or URL you encoded>" /tmp/qrf-capture.log   # must return nothing
  ```
- **Install ID** is a UUID v4 and **stable across restarts** (same `distinct_id` /
  `installId` every launch; never regenerated).

## What good looks like

A healthy event in the sink log:

```json
{
  "api_key": "phc_localtest",
  "distinct_id": "8d610f40-11fd-46a7-bc5d-9526afa2ac75",
  "event": "qr_generated",
  "properties": {
    "input_type": "text",
    "committed_via": "export",
    "platform": "desktop",
    "app_version": "0.4.1",
    "os": "macos",
    "$ip": "0",
    "$geoip_disable": true
  },
  "timestamp": "2026-05-26T02:25:26.698Z"
}
```

Note `app_active` fires on the *next* launch after opting in (the `init()` check
already ran before you clicked Enable), and only once per UTC day thereafter.
