# QR Foundry

A powerful desktop QR code generator with live preview, customization, and batch generation. Built with Tauri, React, and TypeScript.

![QR Foundry](https://img.shields.io/badge/version-0.1.0-blue)
![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Windows%20%7C%20Linux-lightgrey)
![License](https://img.shields.io/badge/license-MIT-green)

## Features

- **Live Preview** - See your QR code update in real-time as you type
- **Multiple Input Types** - URL, Text, WiFi, vCard, Email, SMS, Phone, Geo location
- **Full Customization** - Dot styles, corner styles, colors, gradients, logo embedding
- **QR Validation** - Built-in scanner to verify your QR codes are readable
- **Export Options** - PNG, SVG with native file dialogs
- **History** - Browse and reload previously generated QR codes
- **Templates** - Save and reuse your favorite style configurations
- **Batch Generation** - Import CSV, generate multiple QR codes, export as ZIP

## Screenshots

*Coming soon*

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- [Rust](https://rustup.rs/) (install via rustup)

### Development

```bash
# Clone the repository
git clone https://github.com/yourusername/qr-foundry.git
cd qr-foundry

# Install dependencies
npm install

# Run in development mode
npm run tauri dev
```

### Build for Production

```bash
# Build the application
npm run tauri build
```

The built application will be in `src-tauri/target/release/bundle/`.

## Usage

### Generator Tab
1. Select your content type (URL, WiFi, vCard, etc.)
2. Enter your content
3. Customize the style (colors, dots, logo)
4. Click "Validate QR" to ensure it scans correctly
5. Export as PNG or SVG, or copy to clipboard

### Batch Generation
1. Prepare a CSV file with columns: `content`, `type`, `label`
2. Drop the CSV file into the Batch tab
3. Review the parsed items
4. Click "Generate" to create all QR codes
5. Save as a ZIP archive

### Templates
1. Configure your preferred style in the Generator
2. Go to Templates tab and click "Save Current"
3. Name your template
4. Apply it anytime with one click

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS, Zustand
- **Backend**: Rust, Tauri 2
- **QR Generation**: qr-code-styling
- **QR Decoding**: rqrr (Rust), jsQR (fallback)
- **Database**: SQLite (via rusqlite)

## Project Structure

```
qr-foundry/
├── src/                    # React frontend
│   ├── components/         # UI components
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
└── package.json
```

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.
