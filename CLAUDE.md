# QR Foundry

A QR code generator shipping as both a **Tauri desktop app** (macOS, Windows, Linux)
and a **web app** (`app.qr-foundry.com`). React + TypeScript frontend shared between
both targets; Rust backend for desktop-only features.

## System Architecture

QR Foundry is composed of five services.
See [`ARCHITECTURE.md`](../plans/architecture/ARCHITECTURE.md) for the full system diagram.

| Service | Domain | Repo | Stack |
|---------|--------|------|-------|
| Desktop App | downloadable | `qr-foundry-app` (this repo) | Tauri + React |
| Web App | `app.qr-foundry.com` | `qr-foundry-app` (this repo, separate build target) | React (no Tauri) |
| Redirect Worker | `qrfo.link` | `qr-foundry-worker` | Cloudflare Worker + KV |
| Billing API | `api.qr-foundry.com` | `qr-foundry-api` | Hono + Drizzle + Turso |
| Marketing Site | `qr-foundry.com` | `qr-foundry-site` | Astro + Tailwind (planned) |

### How they connect

- **Desktop/Web App → Billing API** — auth (login/signup), plan tier checks, subscription management
- **Desktop/Web App → Worker CRUD API** — create, list, update, delete dynamic QR codes
- **Billing API → Worker KV** — writes `_quota::` keys after purchase/subscription events
- **Browser (scan) → Worker Redirect** — public 302 redirects for scanned QR codes

### Pricing tiers

| Tier | Price | Key features |
|------|-------|--------------|
| Free | $0 | Basic QR types, basic colors, PNG export, clipboard, scanner, limited history (10) |
| Pro Trial | $0 / 7 days | All Pro features for 7 days after signup. Reverts to Free. |
| Pro | ~$12-15 one-time | Full customization, all export formats, batch, templates, unlimited history |
| Subscription | ~$5-7/month | Everything in Pro + dynamic QR codes, scan analytics, code management (25 active codes) |

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

# Shared plans and product docs live in the parent directory: ../plans/
# ../plans/PLAN.md                         — Plan index (start here)
# ../plans/architecture/FEATURES.md       — Master feature list, user stories, status
# ../plans/architecture/ARCHITECTURE.md   — System-wide architecture
# ../plans/architecture/product-spec.md   — Original product specification
# ../plans/services/app.md                — Desktop + Web App implementation phases
# ../plans/services/worker.md             — Redirect Worker implementation phases
# ../plans/services/billing-api.md        — Billing API implementation phases
# ../plans/services/marketing-site.md     — Marketing site implementation phases
# ../plans/design/mockups.md              — Marketing site design mockups
# ../plans/design/qr-forge-mockup.jsx     — React UI mockup component
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
- [x] QR generation (URL, text, WiFi, phone, vCard, email, SMS, geo, calendar)
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

**IMPORTANT: Update shared docs whenever a feature or change is implemented.**
These docs are the source of truth across all QR Foundry repos.
After implementing a feature, fixing a bug, or making an architectural change:

- **`../plans/architecture/FEATURES.md`** — Check off `[x]` completed features,
  change `[ ]` to `[~]` for partial implementations,
  update the summary table counts at the bottom
- **`../plans/services/app.md`** — Check off `[x]` completed items in the
  relevant phase, add new sub-items if implementation reveals additional work,
  move items between phases if scope changes
- **`../plans/PLAN.md`** — Update the status column in the Per-Service Plans
  table if a major milestone is reached
- **`../plans/architecture/ARCHITECTURE.md`** — Update if the system architecture,
  data flows, API contracts, or environment configuration changes
- If a new feature is discovered during implementation that isn't in FEATURES.md, add it

### Remaining work (see `../plans/` for details)

- **App** — Auth integration, feature gating, dynamic code UI, analytics dashboard, web app deployment. See [`../plans/services/app.md`](../plans/services/app.md).
- **Worker** — Custom domain, rate limiting, production deployment. See [`../plans/services/worker.md`](../plans/services/worker.md).
- **Billing API** — Quota writes to Worker KV, production deployment. See [`../plans/services/billing-api.md`](../plans/services/billing-api.md).
- **Marketing Site** — Landing page, pricing, SEO, deployment. See [`../plans/services/marketing-site.md`](../plans/services/marketing-site.md).

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

### External Services (planned)

- **Cloudflare Workers + KV** - Dynamic QR code redirects and CRUD
- **Cloudflare Analytics Engine** - Scan analytics
- **Stripe** - Payment processing (Pro purchases, subscriptions)

## Feature Flags

None currently. Feature gating by plan tier is planned (see [`../plans/services/app.md`](../plans/services/app.md) Phase 2).
