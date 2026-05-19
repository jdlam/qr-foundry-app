# QR Foundry

A QR code generator shipping as both a **Tauri desktop app** (macOS, Windows, Linux)
and a **web app** (`app.qr-foundry.com`). React + TypeScript frontend shared between
both targets; Rust backend for desktop-only features.

## Quick Start

```bash
# Install dependencies
npm install

# Run desktop app (Tauri)
npm run tauri dev

# Run web app (browser only — no Tauri needed)
npm run dev:web          # browser-only dev (VITE_PLATFORM=web)

# Type check
npm run typecheck

# Lint
npm run lint

# Build desktop for production
npm run tauri build

# Build web for production
npm run build:web        # web production build (VITE_PLATFORM=web)
```

## Project Structure

```text
qr-foundry/
├── src/                        # React frontend (shared between desktop + web)
│   ├── App.tsx                 # Root layout + routing
│   ├── main.tsx                # React entry
│   ├── components/             # UI components by feature
│   │   ├── layout/             # Sidebar, TitleBar, StatusBar
│   │   ├── generator/          # InputPanel, StylePanel, Preview, ExportBar
│   │   │   └── inputs/         # Per-type input components (URL, WiFi, vCard, etc.)
│   │   ├── batch/              # BatchView, CsvDropzone, BatchTable
│   │   ├── scanner/            # ScannerView, DecodeResult
│   │   ├── history/            # HistoryView, HistoryItem
│   │   ├── templates/          # TemplatesView, TemplateCard
│   │   ├── dynamic/            # DynamicCodesView, CodeDetailView, AnalyticsView (planned)
│   │   ├── web-assets/         # WebAssetView (planned)
│   │   └── shared/             # ColorPicker, DotStylePicker, LogoUploader, FeatureGate
│   ├── hooks/                  # Custom React hooks
│   ├── stores/                 # Zustand state stores
│   ├── lib/                    # Utility functions (formatters, validators, image optimizer)
│   ├── types/                  # TypeScript definitions
│   ├── styles/                 # CSS/Tailwind
│   ├── api/                    # Shared API clients (planned)
│   │   ├── billing.ts          # Billing API client (auth, plan, purchases)
│   │   └── worker.ts           # Worker API client (CRUD, analytics)
│   └── platform/               # Platform-specific adapters
│       ├── types.ts            # Shared adapter interfaces (ExportAdapter, ClipboardAdapter, etc.)
│       ├── tauri/              # Tauri adapters (invoke Rust commands, native file dialogs)
│       └── web/                # Web adapters (localStorage, browser APIs, Blob downloads)
├── src-tauri/                  # Rust backend (desktop only)
│   ├── src/
│   │   ├── main.rs             # Tauri entry point
│   │   ├── lib.rs              # Module registration
│   │   ├── commands/           # Tauri IPC commands (export, validate, batch, scanner, etc.)
│   │   └── db/                 # SQLite database (history, templates)
│   └── Cargo.toml
└── CLAUDE.md                   # This file
```

### Code sharing: Desktop + Web

The same React codebase builds for both Tauri (desktop) and browser (web). Platform differences are abstracted behind adapters in `src/platform/`:

| Concern | Desktop (Tauri) | Web (Browser) |
|---------|----------------|---------------|
| Auth token storage | OS keychain via Tauri secure storage | `httpOnly` cookie or `localStorage` |
| File export | Native file dialogs via Tauri | Browser download API |
| Clipboard | Tauri clipboard API | Browser Clipboard API |
| QR scanning | Image file via Tauri | Browser `MediaDevices` API (later) |

Vite path aliases (`@platform/*`) resolve to the correct platform at build time.

## Current Status

### Desktop App: Core (complete)

- [x] Tauri project scaffold with React + TypeScript
- [x] QR generation (URL, text, WiFi, phone, vCard, email, SMS, geo, calendar, bitcoin, google-review)
- [x] Live preview canvas
- [x] Style customization (colors, dots, eyes, gradient fills)
- [x] Logo embedding with drag-drop
- [x] Error correction manual control
- [x] Transparent backgrounds
- [x] PNG export with native save dialog
- [x] SVG export via Rust backend
- [x] Clipboard copy
- [x] Batch generation from CSV
- [x] History (SQLite)
- [x] Templates (save/load styles)
- [x] QR scanner/decoder
- [x] QR validation (scan and verify content matches)

## Validation Checklist

After making changes, validate using this checklist:

### Core Functionality

- [x] `npm run tauri dev` starts without errors
- [x] QR code renders in preview when content is entered
- [x] Changing content updates preview in real-time
- [x] Style changes (colors, dot style) reflect immediately

### Export

- [x] PNG download saves valid image file
- [ ] SVG export produces scalable vector
- [ ] Clipboard copy works (paste into another app)

### QR Validation

- [x] "Validate QR" button triggers validation
- [x] Pass state shows green checkmark
- [x] Large logo + low EC level triggers warn/fail

### Input Types

- [x] URL: Scan opens browser
- [ ] WiFi: Scan prompts WiFi connection
- [ ] vCard: Scan creates contact
- [ ] Phone: Scan offers to call
- [ ] Email: Scan opens mail compose

### Scanner

- [x] Dropping QR image decodes content
- [ ] Clipboard paste (Cmd+V) decodes
- [x] "Re-generate" loads content into Generator

### History & Templates

- [x] Generated QRs appear in History
- [ ] Clicking history item loads it
- [x] Saving template preserves all style settings
- [x] Loading template applies all styles

### Batch

- [x] CSV drop parses rows correctly
- [x] Preview gallery shows QR codes
- [ ] Arrow keys navigate between previews
- [x] Format switch (PNG/SVG) resets generation state
- [x] Generate creates and validates all QRs
- [x] Failed validations show in status column
- [ ] ZIP export works with toast confirmation
- [x] Individual download works from preview

### Logo Upload

- [ ] Drag-drop image sets logo
- [x] Large images auto-resize (max 512px)
- [x] Transparent borders auto-trimmed
- [x] Files over 500KB auto-compressed

### Toasts

- [x] Success feedback on export/copy operations (inline visual state in Preview, toasts elsewhere)
- [x] Success toast on history/template load
- [x] Error toast on failures

## Common Issues

### "Command not found" errors

Ensure Rust toolchain is installed:

```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Tauri dev server won't start

Check that Xcode Command Line Tools are installed (macOS):

```bash
xcode-select --install
```

### QR code not rendering

1. Check browser console for errors
2. Verify qr-code-styling is imported correctly
3. Ensure canvas element has non-zero dimensions

### Validation always fails

1. Check that rqrr crate is added to Cargo.toml
2. Ensure image is rendered at sufficient resolution (min 256px)
3. Verify the QR content matches exactly (no trailing whitespace)

## Git Workflow

**IMPORTANT: Never push directly to `main`.** All code changes must go through a pull
request, even for small fixes. This ensures every change gets CI checks and a review
opportunity before merging. The only exception is documentation-only changes to the
shared plans repo.

### Branching

- `main` — Production-ready. Treat as protected — no direct pushes.
- Feature branches: `feat/description` (e.g. `feat/dynamic-code-ui`)
- Bug fixes: `fix/description` (e.g. `fix/svg-export-transparency`)

### Commits

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add dynamic code management UI
fix: resolve SVG export transparency issue
test: add coverage for auth store
docs: update platform adapter docs
```

### Pull Requests

- Every PR must pass CI (lint, typecheck, tests).
- PRs should be small and focused. One feature or fix per PR.
- Include a description of what changed and why.
- Update tests and documentation as part of the same PR, not separately.

## CI/CD

Two GitHub Actions workflows:

- **`ci.yml`** — Runs on PRs and pushes to `main`. Lint, typecheck, frontend tests
  (Ubuntu), then build matrix (macOS arm64, macOS x86_64, Ubuntu, Windows) on pushes
  to main only.
- **`deploy.yml`** — Runs on `release: published` and `workflow_dispatch`. Builds
  platform binaries via `tauri-apps/tauri-action` and attaches them to the GitHub
  Release (.dmg, .AppImage, .msi, .sig files, `latest.json`).

### Required GitHub Secrets (deploy.yml)

- `TAURI_SIGNING_PRIVATE_KEY` — Tauri updater signing private key
- `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — Private key password (if set)

## Releasing

Releases on this repo are **user-authored**, not bot-automated. Branch protection on `main` blocks the bot's direct push, so there's no `release.yml` workflow. The canonical release path:

1. Run `../scripts/release.sh app vX.Y.Z` from the parent `qr-foundry/` dir. The script bumps `package.json`, `package-lock.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, and `src-tauri/Cargo.lock` atomically, then commits `chore: release vX.Y.Z`.
2. The script's `git push origin main` will fail at branch protection. When it does, move the commit to a branch:
   ```bash
   git branch chore/release-vX.Y.Z
   git reset --hard origin/main
   git checkout chore/release-vX.Y.Z
   git push -u origin chore/release-vX.Y.Z
   ```
3. Open a PR titled `chore: release vX.Y.Z`. Wait for CI, then merge.
4. Pull `main`, then create the GitHub Release as yourself:
   ```bash
   awk '/^## \[X\.Y\.Z\]/{p=1;next} /^## \[/{p=0} p' CHANGELOG.md > /tmp/notes.md
   gh release create vX.Y.Z --target main --title vX.Y.Z --notes-file /tmp/notes.md
   ```
5. `release: published` fires `deploy.yml` (Tauri binary build matrix) and `deploy-web.yml` (web build). Both run automatically — no manual dispatch needed.

Use `--dry-run` with `release.sh` to preview without side effects.

Why this path instead of auto-release: branch protection blocks the workflow's push step. See [`../.claude/skills/ship/SKILL.md`](../.claude/skills/ship/SKILL.md) for the full context. The other three services (site, worker, api) use auto-release workflows that handle everything end-to-end; app is the only exception.

## Version Policy

The app version is canonically defined in **3 source files**:

- `package.json` → `"version"`
- `src-tauri/tauri.conf.json` → `"version"`
- `src-tauri/Cargo.toml` → `version` (under `[package]`)

Two lockfiles (`package-lock.json` and `src-tauri/Cargo.lock`) are derived from the above and must update in lockstep. `release.sh` handles all 5 files atomically (3 canonical + 2 derived).

**Never edit these manually.** Always use the release script.

## Auto-Updater

The desktop app checks for updates on startup via the Tauri updater plugin.

- **Endpoint:** `https://github.com/jdlam/qr-foundry-app/releases/latest/download/latest.json`
- **Public key:** Stored in `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
- **Private key:** `~/.tauri/qr-foundry.key` (local) and `TAURI_SIGNING_PRIVATE_KEY` GitHub secret
- **Behavior:** On startup, checks for a newer version. If found, shows a toast with "Install & restart" / "Later" actions.
- **Web builds:** The updater is tree-shaken out (dynamic import guarded by `isTauri()` check).

## Testing

**IMPORTANT: Always maintain test coverage when making changes.**

### Test Coverage Guidelines

When modifying code, you MUST:

1. **Update existing tests** if you change behavior of tested code
2. **Add new tests** for any new functionality
3. **Run tests before committing** to ensure nothing is broken

### Run All Tests

```bash
# Run frontend and backend tests
npm run test:all
```

### Frontend Tests (Vitest)

```bash
# Run tests once
npm run test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm run test:coverage
```

Test files are co-located with source files using `.test.ts` or `.test.tsx` suffix:

- `src/lib/formatters.test.ts` - QR content formatters
- `src/lib/imageOptimizer.test.ts` - Logo optimization
- `src/stores/qrStore.test.ts` - QR state store
- `src/stores/batchStore.test.ts` - Batch state store
- `src/hooks/*.test.ts` - Custom React hooks
- `src/components/generator/*.test.tsx` - Generator components
- `src/components/history/HistoryView.test.tsx` - History view
- `src/components/templates/TemplatesView.test.tsx` - Templates view
- `src/components/scanner/ScannerView.test.tsx` - Scanner view

### Backend Tests (Rust)

```bash
cd src-tauri && cargo test
```

Tests are in `#[cfg(test)]` modules within source files:

- `src/commands/batch.rs` - CSV parsing, filename sanitization
- `src/commands/validate.rs` - QR type detection
- `src/commands/export.rs` - Base64 handling
- `src/db/history.rs` - History database operations
- `src/db/templates.rs` - Template database operations

### Writing Tests

**Frontend (Vitest + React Testing Library):**

- Use `vi.mock()` for mocking Tauri APIs and external dependencies
- Use `renderHook()` from `@testing-library/react` for hooks
- Use `render()` and `screen` for component tests
- Test user interactions with `fireEvent` or `userEvent`

**Backend (Rust):**

- Use `#[cfg(test)]` module at end of source file
- Use in-memory SQLite with `Connection::open_in_memory()`
- Use `r##"..."##` for raw strings containing `#` (like hex colors)

### Manual Testing

Use the validation checklist above after each change.

## Dependencies

### Frontend

- `qr-code-styling` - QR code generation with styling
- `jsqr` - QR code decoding
- `zustand` - State management
- `@radix-ui/*` - UI primitives
- `react-colorful` - Color picker
- `sonner` - Toast notifications

### Backend (Rust)

- `tauri` - Desktop app framework
- `rqrr` - QR code decoding for validation
- `image` - Image processing
- `rusqlite` - SQLite database
- `csv` - CSV parsing for batch
