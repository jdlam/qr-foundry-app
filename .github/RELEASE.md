# Release Management

This document outlines the release process for QR Forge, separating development workflow from store releases.

## Branching Strategy

```
main (stable)
  │
  ├── feature/xxx  ──► PR ──► merge to main
  ├── fix/xxx      ──► PR ──► merge to main
  │
  └── release/vX.Y.Z  ──► tag ──► build ──► publish to stores
```

## Development Workflow

### 1. Feature/Fix Development
- Create a branch from `main`: `feature/description` or `fix/description`
- Make changes and commit
- Open a PR to `main`
- PR must pass review and any CI checks
- Merge to `main` when approved

### 2. Main Branch
- `main` is the stable development branch
- All PRs merge into `main`
- Code in `main` should always be buildable
- Merging to `main` does NOT trigger a release

## Release Process

Releases are intentional and separate from regular PR merges.

### 1. Prepare Release
```bash
# Ensure main is up to date
git checkout main
git pull origin main

# Create release branch
git checkout -b release/vX.Y.Z
```

### 2. Update Version Numbers
Update version in these files:
- `package.json` → `"version": "X.Y.Z"`
- `src-tauri/tauri.conf.json` → `"version": "X.Y.Z"`
- `src-tauri/Cargo.toml` → `version = "X.Y.Z"`

### 3. Update Changelog
Create or update `CHANGELOG.md`:
```markdown
## [X.Y.Z] - YYYY-MM-DD

### Added
- New feature descriptions

### Changed
- Changes to existing features

### Fixed
- Bug fixes
```

### 4. Commit Release Prep
```bash
git add -A
git commit -m "chore: prepare release vX.Y.Z"
git push origin release/vX.Y.Z
```

### 5. Create Release PR
- Open PR from `release/vX.Y.Z` to `main`
- Title: `Release vX.Y.Z`
- Include changelog in description
- Get approval and merge

### 6. Tag Release
```bash
git checkout main
git pull origin main
git tag -a vX.Y.Z -m "Release vX.Y.Z"
git push origin vX.Y.Z
```

### 7. Build Release Artifacts
```bash
# Build for current platform
npm run tauri build

# Artifacts will be in:
# - macOS: src-tauri/target/release/bundle/dmg/
# - Windows: src-tauri/target/release/bundle/msi/
# - Linux: src-tauri/target/release/bundle/appimage/
```

### 8. Create GitHub Release
```bash
gh release create vX.Y.Z \
  --title "QR Forge vX.Y.Z" \
  --notes-file CHANGELOG.md \
  ./src-tauri/target/release/bundle/dmg/*.dmg
```

## Store Submission

Store submissions are manual and intentional.

### Mac App Store
1. Build with App Store signing:
   ```bash
   npm run tauri build -- --target universal-apple-darwin
   ```
2. Upload to App Store Connect via Transporter
3. Submit for review in App Store Connect
4. Wait for approval (typically 24-48 hours)

### Microsoft Store
1. Build MSIX package:
   ```bash
   npm run tauri build -- --target x86_64-pc-windows-msvc
   ```
2. Upload to Partner Center
3. Submit for certification
4. Wait for approval

### Direct Download (Gumroad)
1. Upload DMG/MSI/AppImage to Gumroad
2. Update download links on website
3. Notify existing customers (optional)

## Version Numbering

Follow [Semantic Versioning](https://semver.org/):
- **MAJOR (X)**: Breaking changes, major new features
- **MINOR (Y)**: New features, backward compatible
- **PATCH (Z)**: Bug fixes, minor improvements

### Examples
- `1.0.0` - Initial release
- `1.1.0` - Added batch export feature
- `1.1.1` - Fixed validation bug
- `2.0.0` - Major UI redesign

## Release Checklist

Before every release:

- [ ] All tests pass locally
- [ ] App runs without errors (`npm run tauri dev`)
- [ ] QR generation works for all input types
- [ ] Export functions work (PNG, SVG, clipboard)
- [ ] Validation passes for generated codes
- [ ] Version numbers updated consistently
- [ ] Changelog updated
- [ ] Release notes written
- [ ] Built and tested on target platform(s)

## Hotfix Process

For critical bugs in production:

1. Create branch from latest tag: `git checkout -b hotfix/vX.Y.Z tags/vX.Y.Z`
2. Fix the issue
3. Update patch version (X.Y.Z → X.Y.Z+1)
4. Follow release process from step 4
5. After release, merge hotfix back to `main`

## Automation (Future)

Consider adding GitHub Actions for:
- [ ] Automated builds on tag push
- [ ] Draft release creation with artifacts
- [ ] Changelog generation from commits
- [ ] Version bump automation
