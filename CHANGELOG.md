# Changelog

All notable changes to QR Foundry will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
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
