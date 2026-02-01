# QR Foundry

A Tauri-based desktop QR code generator with React + TypeScript frontend.

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run tauri dev

# Type check
npm run typecheck

# Lint
npm run lint

# Build for production
npm run tauri build
```

## Project Structure

```
qr-foundry/
├── src/                    # React frontend
│   ├── components/         # UI components by feature
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── lib/                # Utility functions
│   ├── types/              # TypeScript definitions
│   └── styles/             # CSS/Tailwind
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── commands/       # Tauri IPC commands
│   │   └── db/             # SQLite database
│   └── Cargo.toml
└── CLAUDE.md               # This file
```

## Validation Checklist

After making changes, validate using this checklist:

### Core Functionality
- [ ] `npm run tauri dev` starts without errors
- [ ] QR code renders in preview when content is entered
- [ ] Changing content updates preview in real-time
- [ ] Style changes (colors, dot style) reflect immediately

### Export
- [ ] PNG download saves valid image file
- [ ] SVG export produces scalable vector
- [ ] Clipboard copy works (paste into another app)

### QR Validation
- [ ] "Validate QR" button triggers validation
- [ ] Pass state shows green checkmark
- [ ] Large logo + low EC level triggers warn/fail

### Input Types
- [ ] URL: Scan opens browser
- [ ] WiFi: Scan prompts WiFi connection
- [ ] vCard: Scan creates contact
- [ ] Phone: Scan offers to call
- [ ] Email: Scan opens mail compose

### Scanner
- [ ] Dropping QR image decodes content
- [ ] Clipboard paste (Cmd+V) decodes
- [ ] "Re-generate" loads content into Generator

### History & Templates
- [ ] Generated QRs appear in History
- [ ] Clicking history item loads it
- [ ] Saving template preserves all style settings
- [ ] Loading template applies all styles

### Batch
- [ ] CSV drop parses rows correctly
- [ ] Generate creates ZIP with all QRs
- [ ] Failed validations show in status column

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
- `src/stores/qrStore.test.ts` - Zustand store
- `src/hooks/*.test.ts` - Custom React hooks
- `src/components/**/*.test.tsx` - React components

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

## Feature Flags

None currently. All features are enabled.

## Dependencies

### Frontend
- `qr-code-styling` - QR code generation with styling
- `jsqr` - QR code decoding
- `zustand` - State management
- `@radix-ui/*` - UI primitives
- `react-colorful` - Color picker

### Backend (Rust)
- `tauri` - Desktop app framework
- `rqrr` - QR code decoding for validation
- `image` - Image processing
- `rusqlite` - SQLite database
- `csv` - CSV parsing for batch
