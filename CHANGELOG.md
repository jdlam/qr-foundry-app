# Changelog

All notable changes to QR Foundry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.4.1] - 2026-05-23

### Added — Product analytics (web only)

10 new tracked events covering the auth, generation, export, dynamic-code lifecycle, analytics-view, paywall, and template flows. All client-side, no PII (only enums, counts, booleans). Tauri desktop build remains telemetry-free via the no-op `@platform` adapter.

- `login_completed` — fires on `authStore.login` success (separate from `signup_completed`)
- `paywall_hit { feature }` — logged-in free user hits a gated feature in `useFeatureAccess.requireAccess` (the friction signal for free→trial conversion)
- `auth_modal_opened { trigger }` — `authModalStore.open` with a typed trigger enum (`sidebar`, `gated_feature`, `dynamic_code_button`, `dynamic_code_inline_create`)
- `dynamic_code_updated { changed_destination, changed_label }` — `useDynamicCodes.updateCode` on success
- `dynamic_code_paused` — additional event when an update sets status='paused' (separates intent-to-cancel from generic edits)
- `dynamic_code_deleted` — `useDynamicCodes.deleteCode` on success
- `analytics_viewed { scope }` — fires on mount of `AnalyticsView` (per_code) and `AnalyticsOverview` (overview)
- `qr_generated { input_type, committed_via }` — fires once per `(input_type, content)` pair on the first commit action (validate/export/copy). Content itself is never sent, only the enum
- `qr_exported { format }` — `useExport` on success for PNG/SVG/clipboard
- `template_saved` / `template_loaded` — `useTemplates.saveTemplate` and `TemplatesView.handleApplyTemplate` (#61)

### Changed

- `authModalStore.open` now accepts an optional `trigger` argument. A new `setOpen(bool)` exists for the Radix Dialog `onOpenChange` bridge — it does NOT fire analytics, preventing double-counts when the dialog state changes

## [0.4.0] - 2026-05-22

### Added

- **Product analytics (web only)** — PostHog integration in identified mode for the authenticated web app (`app.qr-foundry.com`). Identifies users by ID with `email` and `plan_tier` properties on login, signup, session restore, and impersonation; emits `signup_completed` and `dynamic_code_created` events (the latter from both the manager and inline-preview creation paths). Resets analytics on logout and on initialize failure paths so events aren't attributed to prior users. Architecture decision and per-surface config in [ADR-0001](../qr-foundry/plans/architecture/adr/0001-analytics-posthog-split-config.md) (#58)
- `AnalyticsAdapter` interface (`init`, `identify`, `track`, `reset`) added to `src/platform/types.ts` with web (PostHog) and Tauri (no-op) implementations behind the `@platform` alias

### Privacy

- **Tauri desktop build ships no telemetry.** `posthog-js` is not bundled into the desktop binary — Vite resolves `@platform` to the no-op Tauri adapter at build time. Marketing site and web app are scoped separately per ADR-0001
- Web app uses identified events with cookies/localStorage; this is acceptable because the user has authenticated and accepted the ToS, and is documented in the ADR

### CI/Tooling

- `deploy-web.yml` now passes `VITE_POSTHOG_KEY` from a GitHub repo variable (public client key, not a secret) into the web build step. Tauri builds in `ci.yml` and `deploy.yml` are unchanged

## [0.3.0] - 2026-05-18

### Added

- **Calendar Event QR type** — VCALENDAR/VEVENT formatter with title, location, start/end datetime, description, and all-day toggle (UID + DTSTAMP per RFC 5545). Scanning prompts the user to add the event to their calendar (#45)
- **Bitcoin Payment QR type** — BIP 21 URI formatter with address, optional amount (strict decimal validation), label, and message. Scanning opens the user's Bitcoin wallet pre-filled (#47)
- **Google Review QR type** — Google Place ID input with format validation, formatted as a direct review URL. Scanning takes customers straight to the review form (#46)
- Auto-release workflow: pushing a new `## [X.Y.Z]` entry to `CHANGELOG.md` on `main` now bumps all version files (`package.json`, `tauri.conf.json`, `Cargo.toml`, `Cargo.lock`) and creates a GitHub Release that triggers the binary build + attach workflow (#40)

### Fixed

- Removed stale "7-day Pro trial" toast on signup — the Pro tier is gone and there is no 7-day trial. The free 14-day trial of the Subscription tier is surfaced by the Billing API/site (#49)
- Aligned `Cargo.lock` version with `v0.2.0` so subsequent release tooling sees a clean version file (#39)

### CI/Tooling

- macOS x86_64 build: switched to `macos-13` runner and install Rosetta 2 on ARM runners so the DMG actually builds (#42, #44)
- Bumped GitHub Actions Node.js from 20 → 24 across all workflows, silencing deprecation warnings (#41, #43)

## [0.2.0] - 2026-02-14

### Added

- Web deploy pipeline: Cloudflare Workers deployment at `app.qr-foundry.com` with 3-environment pattern (dev/preview/production)
- `wrangler.toml` with SPA routing (`not_found_handling = "single-page-application"`) for client-side navigation
- `deploy-web.yml` GitHub Actions workflow: PR → dev, merge → preview, release → production
- Dev persona switcher in sidebar (Free | Sub | Sub+Add) for both logged-in and logged-out development sessions
- API-backed impersonation flow in auth state (`billingApi.impersonate()` + `useAuthStore().impersonate()`)
- Regression coverage for persona switching while logged out and logged in, plus failure-path toast handling

### Changed

- Updated from original plan: `__dev` console helpers now call the real impersonation/logout flows instead of mutating local auth state directly
- Test execution remains shuffled in Vitest to keep order-dependent flakes visible

### Fixed

- Added runtime dev guard to prevent `/api/dev/impersonate` calls in non-dev builds
- Added user-facing error toast when impersonation fails in the dev persona switcher

## [0.1.0] - 2026-02-13

Initial release of the QR Foundry desktop and web app.

### Added

- Add auto-updater and release pipeline (#32)
- Session expiry 401 interceptor (#31)
- "Make Dynamic" toggle in generator (#30)
- Scan analytics views for dynamic codes (#29)
- Dynamic codes management view with CRUD (#28)
- Worker API client + types for dynamic codes (#27)
- Add functional feature gating for pro features (#25)
- Add per-environment .env files for API URL targeting (#23)
- Color picker popover, foreground/background controls, collapsible sidebar, compact type selector (#21)
- Add auth integration with API client, token storage, and login UI (#19)
- App redesign with sidebar nav, theming, new icons, and updated styles (#17)
- Add platform abstraction layer for web + desktop builds (#15)
- Add toast notifications for user feedback (#11)
- Persist batch tab state and improve validation (#10)
- Improve batch view with preview gallery and export options (#9)
- Add drag-and-drop logo upload with auto-optimization (#6)
- Add unit tests and rename app to QR Foundry (#2)

### Fixed

- Scale down macOS dock icon to match system icon sizing (#20)
- Transparent background PNG export and preview visibility (#7)

### Changed

- Remove Pro tier gating — all QR features are now free (#26)
- Use strip_data_url_prefix helper instead of inline logic (#5)

[0.2.0]: https://github.com/jdlam/qr-foundry-app/releases/tag/v0.2.0
[0.1.0]: https://github.com/jdlam/qr-foundry-app/releases/tag/v0.1.0
[Unreleased]: https://github.com/jdlam/qr-foundry-app/compare/v0.2.0...HEAD
