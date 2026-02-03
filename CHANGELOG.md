# Changelog

All notable changes to QR Foundry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Toast notifications for user feedback across all operations (export, copy, history, templates, scanner)
- Batch preview gallery with keyboard navigation (arrow keys) and thumbnail selection
- Batch validation pipeline that verifies generated QR codes are scannable
- Export format selector (PNG/SVG) for batch generation with automatic regeneration on format change
- Individual QR code download from batch preview
- Batch tab state persistence - state survives tab switches
- Drag-and-drop logo upload with automatic optimization:
  - Auto-trim transparent borders
  - Auto-resize to 512px max dimension
  - Auto-compress under 500KB
  - Scales logo to 90% of content area

### Fixed
- Transparent background PNG export now correctly renders with alpha channel
- Batch preview now shows QR codes immediately when selecting items
- Logo upload no longer rejects large files - auto-resizes instead

### Technical
- Initial app implementation with Tauri + React + TypeScript
- QR code generation for multiple input types:
  - URL, Plain Text, WiFi, vCard, Email, SMS, Phone, Geo
- Live preview with real-time updates
- Style customization:
  - Dot styles (square, rounded, dots, classy, classy-rounded, extra-rounded)
  - Corner square styles
  - Corner dot styles
  - Foreground/background colors
  - Gradient fills
  - Logo embedding
  - Transparent backgrounds
- Error correction level selection (L, M, Q, H)
- Export options:
  - PNG export (512-4096px)
  - SVG export
  - Clipboard copy
- QR validation (scan and verify content matches)
- QR scanner (decode from image or clipboard)
- History (SQLite-backed, searchable)
- Templates (save and load style presets)
- Batch generation from CSV
- Custom app icons and branding
- PR template for contributions
- Release management documentation

### Technical
- Tauri 2.x backend with Rust
- React 19 frontend
- Zustand for state management
- Tailwind CSS v4 for styling
- SQLite for local storage
- Sharp for icon generation

---

## Release History

<!--
## [1.0.0] - YYYY-MM-DD

### Added
- Feature descriptions

### Changed
- Changes to existing features

### Fixed
- Bug fixes

### Removed
- Removed features
-->
