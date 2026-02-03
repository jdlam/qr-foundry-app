# QR Foundry — Product Specification

## App Name Ideas

- **QR Foundry** (craftsmanship connotation, memorable)
- QR Mint
- QR Press
- Codestamp

---

## 1. Pricing Model

**$9.99 one-time purchase** — all features included, no tiers, no subscriptions.

- Mac App Store: $9.99 → ~$8.50 net (Apple 15% commission under Small Business Program)
- Direct download (Gumroad): $9.99 → ~$9.00 net (Gumroad 10%)
- Windows/Linux (Gumroad): $9.99 → ~$9.00 net
- Break-even: ~12 sales/year covers Apple Developer Program fee ($99/yr)

---

## 2. Feature Set (All Included)

### QR Generation

| Feature | Details |
|---|---|
| Input types | URL, plain text, WiFi, phone, vCard, email, SMS, geo location, calendar event |
| Live preview | Real-time QR updates as you type |
| Error correction | Manual L/M/Q/H selection with guidance |
| Clipboard support | One-click copy to clipboard |

### Customization

| Feature | Details |
|---|---|
| Brand colors | Foreground/background color picker |
| Gradient fills | Linear gradient across QR dots |
| Logo embedding | Drag-drop logo with placement options: center, individual corners, or all three finder eyes |
| Logo sizing | Adjustable 10-40% of QR code area with real-time preview |
| Logo shape | Square or circle mask with automatic padding |
| Dot styles | Square, rounded, dots, diamond |
| Eye/corner styles | Square, rounded, circle, leaf |
| Transparent background | PNG/SVG with alpha channel |

### Validation

| Feature | Details |
|---|---|
| Built-in scan validation | Renders QR to image, decodes it back, confirms content matches — one-click verify |
| Three-state feedback | ✓ Pass (scans clean), ⚠ Marginal (scans but low confidence), ✕ Fail (can't decode) |
| Smart warnings | Proactive tips when logo size + EC level combo risks scanability |
| Auto-reset | Validation resets when any style or content changes, prompting re-check |
| Batch validation | Validates every code during batch generation, flags failures before export |

### Export

| Feature | Details |
|---|---|
| PNG export | Up to 4096×4096, multiple size presets |
| SVG export | Vector output, infinitely scalable |
| PDF export | Print-ready with optional bleed/trim marks |
| EPS export | For professional print workflows |
| Web asset pack | Full favicon set + manifest.json + HTML meta tags |

### Power Features

| Feature | Details |
|---|---|
| Batch generation | Import CSV → generate multiple codes at once, export as ZIP |
| QR scanning/reading | Drag-drop or paste image to decode |
| History | Searchable history of all generated codes |
| Templates | Save and reuse brand style presets |

---

## 2. UI Layout — Main Views

### 2.1 Primary View: Generator

```
┌─────────────────────────────────────────────────────────────────────┐
│  QR Foundry                                          [_] [□] [×]     │
├──────────────────────┬──────────────────────────────────────────────┤
│                      │                                              │
│  INPUT               │            LIVE PREVIEW                      │
│  ┌────────────────┐  │                                              │
│  │ ○ URL          │  │         ┌──────────────────┐                 │
│  │ ○ Text         │  │         │                  │                 │
│  │ ○ WiFi         │  │         │    ██ ██ ██      │                 │
│  │ ○ vCard    🔒  │  │         │    ██    ██      │                 │
│  │ ○ Email    🔒  │  │         │    ██ ██ ██      │                 │
│  │ ○ SMS      🔒  │  │         │       [LOGO]     │                 │
│  │ ○ Phone       │  │         │    ██ ██ ██      │                 │
│  │ ○ Geo      🔒  │  │         │    ██    ██      │                 │
│  │ ○ Calendar 🔒  │  │         │    ██ ██ ██      │                 │
│  └────────────────┘  │         │                  │                 │
│                      │         └──────────────────┘                 │
│  ┌────────────────┐  │                                              │
│  │ Enter URL...   │  │     Size: 1024×1024  EC: Medium              │
│  └────────────────┘  │                                              │
│                      │  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐        │
│  STYLE          🔒   │  │ PNG  │ │ SVG  │ │ PDF  │ │ Copy │        │
│  ┌────────────────┐  │  │      │ │  🔒  │ │  🔒  │ │      │        │
│  │ Dot: ■ ● ◆ ♦  │  │  └──────┘ └──────┘ └──────┘ └──────┘        │
│  │ Eye: ■ ● ◗    │  │                                              │
│  │ FG:  [██████]  │  │  ┌──────────────────────────────┐            │
│  │ BG:  [██████]  │  │  │  ★ Unlock all features $4.99 │            │
│  │ Logo: [+drop]  │  │  └──────────────────────────────┘            │
│  └────────────────┘  │                                              │
│                      │                                              │
│  ERROR CORRECTION    │                                              │
│  [L] [M] [Q] [H] 🔒 │                                              │
│                      │                                              │
├──────────────────────┴──────────────────────────────────────────────┤
│  [Generator]  [Batch 🔒]  [Scanner]  [History 🔒]  [Templates 🔒]  │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.2 Batch View (Premium)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Batch Generation                                                   │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────┐                  │
│  │                                               │                  │
│  │   Drop CSV file here or click to browse       │                  │
│  │   Expected columns: content, [type], [label]  │                  │
│  │                                               │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                     │
│  Apply Style: [Current Template ▼]    Export As: [PNG ▼] [SVG ▼]   │
│                                                                     │
│  ┌──────┬──────────────────────┬────────┬────────┐                  │
│  │  #   │  Content             │  Type  │ Status │                  │
│  ├──────┼──────────────────────┼────────┼────────┤                  │
│  │  1   │  https://example.com │  URL   │   ✓    │                  │
│  │  2   │  https://shop.io/p1  │  URL   │   ✓    │                  │
│  │  3   │  +1-555-0123         │  Phone │   ✓    │                  │
│  │  ...                                          │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                     │
│  ┌─────────────────────────────────────┐                            │
│  │  Generate All (24 codes)  [START]   │                            │
│  └─────────────────────────────────────┘                            │
│                                                                     │
│  Export: [Download ZIP]  [Export to Folder]                          │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.3 Scanner View

```
┌─────────────────────────────────────────────────────────────────────┐
│  QR Scanner                                                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌───────────────────────────────────────────────┐                  │
│  │                                               │                  │
│  │   Drop QR code image here                     │                  │
│  │   or paste from clipboard (⌘V)                │                  │
│  │   or click to browse                          │                  │
│  │                                               │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                     │
│  Decoded Content:                                                   │
│  ┌───────────────────────────────────────────────┐                  │
│  │  https://example.com/landing-page             │                  │
│  │                                               │                  │
│  │  Type: URL                                    │                  │
│  │  EC Level: H (30%)                            │                  │
│  │  Version: 4                                   │                  │
│  └───────────────────────────────────────────────┘                  │
│                                                                     │
│  [Copy Content]  [Open in Browser]  [Re-generate]                   │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### 2.4 Web Asset Pack Export (Premium)

```
┌─────────────────────────────────────────────────────────────────────┐
│  Web Asset Pack                                                     │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  Source Image: [logo.png ✓]   URL: [https://mysite.com]             │
│                                                                     │
│  Generated Assets:                                                  │
│  ┌──────────────────────────────────────────────────────┐           │
│  │  ✓  favicon.ico (16×16, 32×32, 48×48)               │           │
│  │  ✓  favicon-16x16.png                                │           │
│  │  ✓  favicon-32x32.png                                │           │
│  │  ✓  apple-touch-icon.png (180×180)                   │           │
│  │  ✓  android-chrome-192x192.png                       │           │
│  │  ✓  android-chrome-512x512.png                       │           │
│  │  ✓  mstile-150x150.png                               │           │
│  │  ✓  safari-pinned-tab.svg                            │           │
│  │  ✓  site.webmanifest                                 │           │
│  │  ✓  browserconfig.xml                                │           │
│  │  ✓  HTML <head> snippet                              │           │
│  └──────────────────────────────────────────────────────┘           │
│                                                                     │
│  [Download ZIP]  [Copy HTML Snippet]                                │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 3. Technical Architecture

### 3.1 Stack

```
┌─────────────────────────────────────────────┐
│                  QR Foundry                    │
├─────────────────────────────────────────────┤
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │          Frontend (Webview)         │    │
│  │                                     │    │
│  │  React + TypeScript                 │    │
│  │  Tailwind CSS                       │    │
│  │  Vite (bundler)                     │    │
│  │                                     │    │
│  │  QR Libraries:                      │    │
│  │  ├─ qr-code-styling (render/style)  │    │
│  │  ├─ qrcode (core generation)        │    │
│  │  └─ jsQR (scanning/decoding)        │    │
│  │                                     │    │
│  │  UI Libraries:                      │    │
│  │  ├─ @radix-ui (primitives)          │    │
│  │  └─ react-colorful (color picker)   │    │
│  │                                     │    │
│  └──────────────┬──────────────────────┘    │
│                 │ Tauri IPC (invoke/events)  │
│  ┌──────────────┴──────────────────────┐    │
│  │          Backend (Rust)             │    │
│  │                                     │    │
│  │  Tauri Core                         │    │
│  │  ├─ File system access              │    │
│  │  ├─ Native dialogs (save/open)      │    │
│  │  ├─ Clipboard integration           │    │
│  │  ├─ System tray (optional)          │    │
│  │  └─ Auto-updater                    │    │
│  │                                     │    │
│  │  Image Processing:                  │    │
│  │  ├─ image-rs (resize/format)        │    │
│  │  ├─ resvg (SVG rendering)           │    │
│  │  ├─ rqrr (QR decode for validation) │    │
│  │  └─ ico (favicon generation)        │    │
│  │                                     │    │
│  │  Data:                              │    │
│  │  ├─ serde_json (serialization)      │    │
│  │  ├─ csv (batch parsing)             │    │
│  │  └─ SQLite (history/templates)      │    │
│  │                                     │    │
│  └─────────────────────────────────────┘    │
│                                             │
├─────────────────────────────────────────────┤
│  Platform: macOS (primary), Windows, Linux  │
│  Bundle: ~10-15MB                           │
│  Min macOS: 12.0 (Monterey)                │
└─────────────────────────────────────────────┘
```

### 3.2 Project Structure

```
qr-foundry/
├── src-tauri/                   # Rust backend
│   ├── src/
│   │   ├── main.rs              # Tauri entry point
│   │   ├── commands/
│   │   │   ├── mod.rs
│   │   │   ├── export.rs        # File export (PNG/SVG/PDF/EPS)
│   │   │   ├── validate.rs      # QR validation: render → decode → compare
│   │   │   ├── batch.rs         # CSV parsing + batch generation + validation
│   │   │   ├── scanner.rs       # QR decode from image
│   │   │   ├── favicon.rs       # Web asset pack generation
│   │   │   ├── history.rs       # SQLite CRUD for history
│   │   │   └── settings.rs      # App settings management
│   │   ├── db/
│   │   │   ├── mod.rs
│   │   │   ├── schema.sql       # History + templates tables
│   │   │   └── migrations/
│   │   └── utils/
│   │       ├── image.rs         # Image processing helpers
│   │       └── fs.rs            # File system helpers
│   ├── Cargo.toml
│   ├── tauri.conf.json          # Tauri configuration
│   ├── icons/                   # App icons
│   └── Info.plist               # macOS metadata
│
├── src/                         # React frontend
│   ├── main.tsx                 # React entry
│   ├── App.tsx                  # Root layout + routing
│   ├── components/
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx      # Navigation tabs
│   │   │   ├── TitleBar.tsx     # Custom window title bar
│   │   │   └── StatusBar.tsx    # Bottom info bar
│   │   ├── generator/
│   │   │   ├── InputPanel.tsx   # Type selector + input fields
│   │   │   ├── StylePanel.tsx   # Customization controls
│   │   │   ├── Preview.tsx      # Live QR preview canvas
│   │   │   ├── ExportBar.tsx    # Export format buttons
│   │   │   └── inputs/
│   │   │       ├── UrlInput.tsx
│   │   │       ├── TextInput.tsx
│   │   │       ├── WifiInput.tsx
│   │   │       ├── VCardInput.tsx
│   │   │       ├── EmailInput.tsx
│   │   │       ├── SmsInput.tsx
│   │   │       ├── PhoneInput.tsx
│   │   │       ├── GeoInput.tsx
│   │   │       └── CalendarInput.tsx
│   │   ├── batch/
│   │   │   ├── BatchView.tsx
│   │   │   ├── CsvDropzone.tsx
│   │   │   └── BatchTable.tsx
│   │   ├── scanner/
│   │   │   ├── ScannerView.tsx
│   │   │   └── DecodeResult.tsx
│   │   ├── history/
│   │   │   ├── HistoryView.tsx
│   │   │   └── HistoryItem.tsx
│   │   ├── templates/
│   │   │   ├── TemplatesView.tsx
│   │   │   └── TemplateCard.tsx
│   │   ├── web-assets/
│   │   │   └── WebAssetView.tsx
│   │   └── shared/
│   │       ├── ColorPicker.tsx
│   │       ├── DotStylePicker.tsx
│   │       ├── EyeStylePicker.tsx
│   │       └── LogoUploader.tsx
│   ├── hooks/
│   │   ├── useQrGenerator.ts    # Core QR generation logic
│   │   ├── useExport.ts         # Export handling via Tauri IPC
│   │   ├── useValidation.ts     # QR validation via Tauri IPC
│   │   ├── useHistory.ts        # History CRUD
│   │   └── useTemplates.ts      # Template CRUD
│   ├── stores/
│   │   ├── qrStore.ts           # Zustand store for QR state
│   │   └── appStore.ts          # App-wide state (license, prefs)
│   ├── lib/
│   │   ├── qr.ts               # QR generation wrapper
│   │   ├── validators.ts        # Input validation per type
│   │   └── formatters.ts        # vCard/WiFi/etc string builders
│   ├── types/
│   │   ├── qr.ts               # QR config types
│   │   └── templates.ts        # Template types
│   └── styles/
│       └── global.css           # Tailwind + custom styles
│
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.ts
└── README.md
```

### 3.3 Data Flow

```
User Input                    QR Generation                   Export
─────────                    ──────────────                   ──────

┌──────────┐   onChange    ┌───────────────┐   canvas      ┌──────────┐
│  Input   │ ──────────►  │  qr-code-     │ ──────────►   │  Preview │
│  Fields  │              │  styling      │   render      │  Canvas  │
└──────────┘              └───────────────┘               └────┬─────┘
                                │                              │
┌──────────┐   onChange         │                              │
│  Style   │ ──────────────────┘                              │
│  Controls│                                                   │
└──────────┘                                                   │
                                                               │
                                                    ┌──────────┴──────────┐
                                                    │                     │
                                                    ▼                     ▼
                                              ┌───────────┐       ┌───────────┐
                                              │ Validate  │       │  Export   │
                                              │ (Rust)    │       │  (Rust)   │
                                              └─────┬─────┘       └─────┬─────┘
                                                    │                   │
                                              ┌─────┴─────┐     ┌──────┴──────┐
                                              │  Render   │     │ PNG/SVG/PDF │
                                              │  to image │     │  to disk    │
                                              └─────┬─────┘     └──────┬──────┘
                                                    │                  │
                                              ┌─────┴─────┐     ┌─────┴──────┐
                                              │  Decode   │     │ Native     │
                                              │  (jsQR)   │     │ Save Dialog│
                                              └─────┬─────┘     └────────────┘
                                                    │
                                              ┌─────┴─────┐
                                              │  Compare  │
                                              │  content  │
                                              └─────┬─────┘
                                                    │
                                              ┌─────┴─────┐
                                              │ ✓ Pass    │
                                              │ ⚠ Warn    │
                                              │ ✕ Fail    │
                                              └───────────┘

Validation Pipeline (Rust-side):
1. Render QR with full styling (colors, logo, dots) to in-memory PNG
2. Feed rendered PNG to QR decoder (rqrr crate)
3. Compare decoded content with original input content
4. Assess confidence: exact match = pass, partial/slow decode = warn, no decode = fail
5. Return ValidationResult with suggestions if warn/fail
```

### 3.4 Database Schema (SQLite)

```sql
-- History of generated QR codes
CREATE TABLE history (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    content     TEXT NOT NULL,           -- The encoded content
    type        TEXT NOT NULL,           -- url, text, wifi, vcard, etc.
    label       TEXT,                    -- User-defined label
    style_json  TEXT,                    -- JSON blob of style config
    thumbnail   BLOB,                   -- Small PNG preview
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Saved style templates
CREATE TABLE templates (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT NOT NULL,
    style_json  TEXT NOT NULL,           -- Full style configuration
    preview     BLOB,                   -- Template preview image
    is_default  BOOLEAN DEFAULT FALSE,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- App settings
CREATE TABLE settings (
    key         TEXT PRIMARY KEY,
    value       TEXT NOT NULL
);
```

### 3.5 Key TypeScript Types

```typescript
// QR content types
type QrType =
  | 'url' | 'text' | 'wifi' | 'vcard' | 'email'
  | 'sms' | 'phone' | 'geo' | 'calendar';

// Dot style options
type DotStyle = 'square' | 'rounded' | 'dots' | 'diamond';
type EyeStyle = 'square' | 'rounded' | 'circle' | 'leaf';

// Error correction levels
type ErrorCorrection = 'L' | 'M' | 'Q' | 'H';

// Export formats
type ExportFormat = 'png' | 'svg' | 'pdf' | 'eps';

// Logo placement positions
type LogoPosition = 'center' | 'top-left' | 'top-right' | 'bottom-left' | 'all-corners';

// Validation result
type ValidationState = 'idle' | 'validating' | 'pass' | 'warn' | 'fail';

interface ValidationResult {
  state: ValidationState;
  decodedContent?: string;       // What was actually decoded
  contentMatch: boolean;          // Does decoded content match input?
  confidence: number;             // 0-1 scan confidence score
  message: string;                // Human-readable feedback
  suggestions?: string[];         // Tips to improve scanability
}

// Core QR configuration
interface QrConfig {
  content: string;
  type: QrType;
  style: QrStyle;
  errorCorrection: ErrorCorrection;
  size: number;            // pixels
}

interface QrStyle {
  dotStyle: DotStyle;
  eyeStyle: EyeStyle;
  foreground: string;      // hex color
  background: string;      // hex color
  gradient?: {
    type: 'linear' | 'radial';
    colors: [string, string];
    angle?: number;
  };
  logo?: LogoConfig;
  transparentBg: boolean;
}

interface LogoConfig {
  src: string;              // base64 or file path
  position: LogoPosition;   // where to place the logo
  size: number;             // percentage of QR area (10-40)
  margin: number;           // padding around logo in px
  shape: 'square' | 'circle';
}

// Template
interface Template {
  id: number;
  name: string;
  style: QrStyle;
  preview?: string;        // base64 thumbnail
  isDefault: boolean;
}

// Batch item (now includes validation)
interface BatchItem {
  row: number;
  content: string;
  type: QrType;
  label?: string;
  status: 'pending' | 'generating' | 'validating' | 'done' | 'error';
  validation?: ValidationResult;
  error?: string;
}

// WiFi-specific input
interface WifiConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

// vCard input
interface VCardConfig {
  firstName: string;
  lastName: string;
  organization?: string;
  title?: string;
  email?: string;
  phone?: string;
  url?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
    country: string;
  };
}
```

### 3.6 Tauri IPC Commands (Rust → JS bridge)

```
Commands exposed to frontend:
─────────────────────────────

export_png(config, path)      → Save QR as PNG to disk
export_svg(config, path)      → Save QR as SVG to disk
export_pdf(config, path)      → Save QR as PDF to disk
export_eps(config, path)      → Save QR as EPS to disk

validate_qr(config)           → Render QR → decode → compare content → return ValidationResult
validate_batch(items, style)  → Validate all batch items, return results per row

batch_parse_csv(path)         → Parse CSV, return BatchItem[]
batch_generate(items, style)  → Generate all (with validation), return zip path

scan_image(path)              → Decode QR from image file
scan_clipboard()              → Decode QR from clipboard image

generate_favicon_pack(image, url) → Generate full web asset pack

history_list(limit, offset)   → Paginated history
history_save(item)            → Save to history
history_delete(id)            → Remove from history

template_list()               → All templates
template_save(template)       → Create/update template
template_delete(id)           → Remove template

get_settings()                → Load app settings
set_setting(key, value)       → Save setting
```

---

## 4. Distribution Strategy

### 4.1 Platforms & Pricing

| Platform | Distribution | Price | Your Cut |
|---|---|---|---|
| macOS | Mac App Store | $9.99 | ~$8.50 (15% commission) |
| macOS | Direct download (Gumroad) | $9.99 | ~$9.00 (Gumroad 10%) |
| Windows | Microsoft Store | $9.99 | ~$8.50 (15% < $10M) |
| Windows | Direct download (Gumroad) | $9.99 | ~$9.00 |
| Linux | Direct download (Gumroad) | $9.99 | ~$9.00 |

### 4.2 No Licensing Complexity

Since it's a paid download with no free tier:

- **Mac App Store**: Purchase = full access, handled by Apple
- **Direct download**: Gumroad license key validated once at first launch
- **No account required**: No sign-up, no login, no tracking
- **Offline-first**: Works completely offline after purchase

### 4.3 Marketing Funnel

```
            GitHub (CLI tool, open source)
                        │
                        ▼
            Blog posts (SEO: "branded QR codes",
            "QR code sizes for print", etc.)
                        │
                        ▼
            Landing page with live demo
            (interactive preview, can't export)
                        │
                        ▼
            Product Hunt launch
                        │
                        ▼
            App Store listing
            (polished screenshots, preview video)
```

---

## 5. Development Phases

### Phase 1: Core MVP (2-3 weeks) ✅ COMPLETE

- [x] Tauri project scaffold with React + TypeScript
- [x] Basic QR generation (URL, text, WiFi, phone)
- [x] Live preview canvas
- [x] PNG export with native save dialog
- [x] Clipboard copy
- [x] Clean, native-feeling UI

### Phase 2: Customization & Export (2-3 weeks) ✅ COMPLETE

- [x] Style customization (colors, dots, eyes)
- [x] Logo embedding with drag-drop
- [x] Gradient fills
- [x] SVG export via Rust backend
- [ ] PDF export via Rust backend (not implemented)
- [ ] EPS export via Rust backend (not implemented)
- [x] Error correction manual control
- [x] Transparent backgrounds

### Phase 3: Power Features (2 weeks) ✅ COMPLETE

- [x] vCard, email, SMS, geo, calendar inputs
- [x] Batch generation from CSV
- [x] History (SQLite)
- [x] Templates (save/load styles)
- [x] QR scanner/decoder
- [x] QR validation (scan and verify content matches)

### Phase 4: Distribution (1-2 weeks)

- [ ] Web asset pack generator
- [ ] Mac App Store submission (paid app, no IAP needed)
- [ ] Auto-updater setup
- [ ] Landing page
- [ ] Gumroad direct download setup for Windows/Linux

### Phase 5: Marketing (ongoing)

- [ ] Product Hunt launch
- [ ] Blog posts (3-5 SEO articles)
- [ ] Free web app version
- [ ] Open source CLI tool
- [ ] App Store screenshot optimization

### Future Features (Backlog)

#### Settings/Preferences System

- [ ] Create settings infrastructure (Tauri store or SQLite)
- [ ] Native macOS Preferences menu item (Cmd+,)
- [ ] Settings window or in-app settings tab

**Proposed settings:**

- Default export format (PNG/SVG)
- Default export size (512px, 1024px, 2048px, 4096px)
- Default error correction level (L/M/Q/H)
- Theme preference (dark/light/system)
- Default template to apply on startup
- History settings:
  - Auto-save generated QRs to history (on/off)
  - History retention period (7 days, 30 days, forever)
  - Clear history on app quit (on/off)
- Batch export settings:
  - Default output folder
  - Filename pattern template

#### Native App Menu

- [ ] Implement Tauri native menu system
- [ ] File menu: New QR, Open (history item), Export, Export As...
- [ ] Edit menu: Undo, Redo, Cut, Copy, Paste, Select All
- [ ] View menu: Toggle sidebar, Zoom controls
- [ ] QR menu: Validate, Copy to Clipboard, Save to History
- [ ] Window menu: Standard window controls
- [ ] Help menu: Documentation, Check for Updates, About

#### Other Future Ideas

- [ ] Keyboard shortcuts customization
- [ ] iCloud sync for templates and history
- [ ] Quick Actions / Shortcuts integration (macOS)
- [ ] Menu bar quick-generate mode
- [ ] PDF/EPS export formats
- [ ] Dynamic QR codes (with tracking URL)
