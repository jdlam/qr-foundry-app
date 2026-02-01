# Contributing to QR Foundry

Thank you for your interest in contributing to QR Foundry!

## Development Setup

### Prerequisites
- Node.js 18+
- Rust toolchain (install via [rustup](https://rustup.rs/))
- Platform-specific dependencies:
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: Visual Studio Build Tools
  - **Linux**: See [Tauri prerequisites](https://tauri.app/v1/guides/getting-started/prerequisites)

### Getting Started
```bash
# Clone the repository
git clone https://github.com/jdlam/qr-foundry.git
cd qr-foundry

# Install dependencies
npm install

# Run development server
npm run tauri dev
```

## Development Workflow

### 1. Create a Branch
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 2. Make Changes
- Follow existing code style
- Keep changes focused and atomic
- Test your changes locally

### 3. Commit Guidelines
Use clear, descriptive commit messages:
```
type: brief description

Longer explanation if needed.
```

Types:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation only
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactor (no functional change)
- `test`: Adding tests
- `chore`: Build, CI, dependencies

### 4. Open a Pull Request
- Push your branch: `git push origin your-branch-name`
- Open a PR against `main`
- Fill out the PR template
- Wait for review

## Code Style

### TypeScript/React
- Use TypeScript strict mode
- Prefer functional components with hooks
- Use Zustand for state management
- Follow existing patterns in the codebase

### Rust
- Run `cargo fmt` before committing
- Run `cargo clippy` to check for warnings
- Follow Rust API guidelines

### CSS
- Use Tailwind CSS utility classes
- Custom styles go in `src/styles/`

## Testing

### Manual Testing
Use the validation checklist in `CLAUDE.md` after making changes.

### Running Checks
```bash
# TypeScript type check
npm run typecheck

# Lint
npm run lint

# Rust checks
cd src-tauri && cargo check && cargo clippy
```

## Project Structure

```
qr-foundry/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # Custom React hooks
│   ├── stores/             # Zustand state stores
│   ├── lib/                # Utilities
│   └── types/              # TypeScript types
├── src-tauri/              # Rust backend
│   ├── src/commands/       # Tauri IPC commands
│   └── src/db/             # SQLite database
└── scripts/                # Build scripts
```

## Questions?

Open an issue for questions or discussions.
