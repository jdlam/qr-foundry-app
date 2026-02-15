# Changelog

All notable changes to QR Foundry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
