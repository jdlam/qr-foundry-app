# iOS & Mobile Support Plan

## Overview

This document outlines the plan to add iOS support and responsive mobile layouts to QR Foundry. The goal is to create a simplified, touch-optimized mobile experience while maintaining feature parity for core functionality.

## Current State

- **Tauri Version:** 2.x (supports iOS/Android)
- **Mobile Entry Point:** Already prepared in `lib.rs`
- **UI:** Desktop-only fixed layouts (800px+ minimum)
- **Features:** Full-featured QR generator, batch processing, scanning, history, templates

## Goals

1. **iOS App Store deployment** via Tauri 2.0 mobile
2. **Responsive UI** that adapts to phone and tablet screens
3. **Simplified mobile workflow** optimized for touch
4. **Shared codebase** between desktop and mobile (90%+ code reuse)

---

## Architecture Decisions

### Platform Strategy

| Approach | Pros | Cons | Decision |
|----------|------|------|----------|
| Single responsive app | One codebase, unified experience | Complex CSS, some compromises | **Selected** |
| Separate mobile app | Optimized per platform | Duplicate code, harder maintenance | Rejected |
| Mobile-only features hidden | Simpler implementation | Confusing UX | Rejected |

### Feature Scope for Mobile

| Feature | Desktop | Mobile | Notes |
|---------|---------|--------|-------|
| QR Generator | Full | Full | Core feature |
| Style Customization | Full | Simplified | Fewer options visible by default |
| Batch Processing | Full | Limited | Single file, smaller batches |
| Scanner | File drop | Camera + File | Camera is primary on mobile |
| History | Full | Full | Essential for mobile |
| Templates | Full | Full | Quick access important |
| Export | File dialog | Share sheet | Platform-native sharing |

---

## Mobile UI Strategy

### Breakpoints

```css
/* Tailwind breakpoint strategy */
--mobile: 0px - 639px      /* sm: prefix */
--tablet: 640px - 1023px   /* md: prefix */
--desktop: 1024px+         /* lg: prefix */
```

### Layout Transformations

**Desktop (1024px+):** Side-by-side panels
**Tablet (640-1023px):** Stacked panels with visible preview
**Mobile (<640px):** Single-panel with preview overlay/sheet

### Navigation Changes

**Desktop:** Bottom tab bar (current)
**Mobile:** Bottom tab bar + floating action button for primary action

---

## Screen Mockups

### 1. Generator - Mobile (Portrait)

```
┌─────────────────────────────┐
│ ← QR Foundry          ⚙️    │ Header with settings
├─────────────────────────────┤
│                             │
│      ┌───────────────┐      │
│      │   ┌─┐ ┌─┐     │      │
│      │   └─┘ └─┘     │      │
│      │   ┌───────┐   │      │ QR Preview
│      │   │ LOGO  │   │      │ (tappable to expand)
│      │   └───────┘   │      │
│      │   ┌─┐ ┌─┐     │      │
│      │   └─┘ └─┘     │      │
│      └───────────────┘      │
│                             │
│  ✓ Valid QR Code            │ Validation status
├─────────────────────────────┤
│ Content Type:  [URL      ▼] │
├─────────────────────────────┤
│ ┌─────────────────────────┐ │
│ │ https://example.com     │ │ Content input
│ └─────────────────────────┘ │
├─────────────────────────────┤
│ [🎨 Style] [⬇️ Export] [✓]  │ Quick actions
├─────────────────────────────┤
│                             │
│ 🏠    📋    📷    🕐    💾  │ Bottom tabs
│ Gen  Batch  Scan  Hist  Tmpl│
└─────────────────────────────┘
```

### 2. Generator - Style Sheet (Bottom Sheet)

```
┌─────────────────────────────┐
│ (dimmed preview above)      │
│                             │
├─────────────────────────────┤ ← Drag handle
│ ━━━━━━━━━                   │
│ Style Options          Done │
├─────────────────────────────┤
│                             │
│ Colors                      │
│ ┌─────┐ ┌─────┐            │
│ │ ██  │ │ ░░  │            │
│ │ FG  │ │ BG  │            │
│ └─────┘ └─────┘            │
│                             │
│ Dot Style                   │
│ [■] [●] [◆] [▣] [✧]        │
│                             │
│ Corner Style                │
│ [■] [●] [◆]                │
│                             │
│ Logo                        │
│ [📷 Add Logo] [✕ Remove]    │
│                             │
│ Error Correction            │
│ [L] [M] [Q] [H]             │
│                             │
└─────────────────────────────┘
```

### 3. Generator - Export Sheet

```
┌─────────────────────────────┐
│ (dimmed preview above)      │
├─────────────────────────────┤
│ ━━━━━━━━━                   │
│ Export QR Code        Done  │
├─────────────────────────────┤
│                             │
│ Format                      │
│ [PNG ✓] [SVG]               │
│                             │
│ Size                        │
│ [512] [1024 ✓] [2048]       │
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │     📤 Share            │ │ Primary action
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     📋 Copy to Clipboard│ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     💾 Save to Photos   │ │ iOS-specific
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### 4. Scanner - Mobile (Camera Primary)

```
┌─────────────────────────────┐
│ ← Scanner             🖼️    │ Image picker toggle
├─────────────────────────────┤
│                             │
│                             │
│     ┌─────────────────┐     │
│     │                 │     │
│     │    📷 Camera    │     │
│     │    Viewfinder   │     │
│     │                 │     │
│     │   ┌─────────┐   │     │
│     │   │ ▢▢▢▢▢▢▢ │   │     │ Scan target area
│     │   │ ▢     ▢ │   │     │
│     │   │ ▢     ▢ │   │     │
│     │   │ ▢▢▢▢▢▢▢ │   │     │
│     │   └─────────┘   │     │
│     │                 │     │
│     └─────────────────┘     │
│                             │
│  Point camera at QR code    │
│                             │
├─────────────────────────────┤
│ 🔦 Flash    🔄 Flip Camera  │
├─────────────────────────────┤
│ 🏠    📋    📷    🕐    💾  │
└─────────────────────────────┘
```

### 5. Scanner - Result Sheet

```
┌─────────────────────────────┐
│ (camera paused above)       │
├─────────────────────────────┤
│ ━━━━━━━━━                   │
│ QR Code Detected      Done  │
├─────────────────────────────┤
│                             │
│ Type: URL                   │
│ ┌─────────────────────────┐ │
│ │ https://example.com/    │ │
│ │ page?ref=qr             │ │
│ └─────────────────────────┘ │
│                             │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │     🌐 Open URL         │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     📋 Copy             │ │
│ └─────────────────────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │     🔄 Re-generate QR   │ │
│ └─────────────────────────┘ │
│                             │
│ [Scan Another]              │
└─────────────────────────────┘
```

### 6. History - Mobile List

```
┌─────────────────────────────┐
│ History              🗑️ Edit│
├─────────────────────────────┤
│ 🔍 Search history...        │
├─────────────────────────────┤
│                             │
│ Today                       │
│ ┌─────────────────────────┐ │
│ │ ┌───┐                   │ │
│ │ │QR │ https://example.. │ │
│ │ └───┘ URL • 2:34 PM     │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ ┌───┐                   │ │
│ │ │QR │ WiFi: HomeNetwork │ │
│ │ └───┘ WiFi • 1:15 PM    │ │
│ └─────────────────────────┘ │
│                             │
│ Yesterday                   │
│ ┌─────────────────────────┐ │
│ │ ┌───┐                   │ │
│ │ │QR │ John Smith vCard  │ │
│ │ └───┘ vCard • 4:22 PM   │ │
│ └─────────────────────────┘ │
│                             │
│ ... (scrollable)            │
│                             │
├─────────────────────────────┤
│ 🏠    📋    📷    🕐    💾  │
└─────────────────────────────┘
```

### 7. History Item Detail

```
┌─────────────────────────────┐
│ ← Back                Share │
├─────────────────────────────┤
│                             │
│      ┌───────────────┐      │
│      │               │      │
│      │   QR Preview  │      │
│      │   (tappable)  │      │
│      │               │      │
│      └───────────────┘      │
│                             │
│ Type: URL                   │
│ Created: Today, 2:34 PM     │
├─────────────────────────────┤
│ Content                     │
│ ┌─────────────────────────┐ │
│ │ https://example.com/    │ │
│ │ very/long/path/here     │ │
│ └─────────────────────────┘ │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │   🔄 Load in Generator  │ │
│ └─────────────────────────┘ │
│                             │
│ ┌───────────┐ ┌───────────┐ │
│ │  📤 Share │ │  📋 Copy  │ │
│ └───────────┘ └───────────┘ │
│                             │
│ ┌─────────────────────────┐ │
│ │   🗑️ Delete from History│ │
│ └─────────────────────────┘ │
│                             │
└─────────────────────────────┘
```

### 8. Templates - Mobile Grid

```
┌─────────────────────────────┐
│ Templates            + New  │
├─────────────────────────────┤
│                             │
│ ┌───────────┐ ┌───────────┐ │
│ │  ┌─────┐  │ │  ┌─────┐  │ │
│ │  │ QR  │  │ │  │ QR  │  │ │
│ │  └─────┘  │ │  └─────┘  │ │
│ │  Business │ │  Personal │ │
│ │  Blue/Wht │ │  Green    │ │
│ └───────────┘ └───────────┘ │
│                             │
│ ┌───────────┐ ┌───────────┐ │
│ │  ┌─────┐  │ │  ┌─────┐  │ │
│ │  │ QR  │  │ │  │ QR  │  │ │
│ │  └─────┘  │ │  └─────┘  │ │
│ │  Minimal  │ │  Brand    │ │
│ │  B&W      │ │  w/ Logo  │ │
│ └───────────┘ └───────────┘ │
│                             │
│ ... (scrollable grid)       │
│                             │
├─────────────────────────────┤
│ 🏠    📋    📷    🕐    💾  │
└─────────────────────────────┘
```

### 9. Batch - Mobile (Simplified)

```
┌─────────────────────────────┐
│ ← Batch Processing          │
├─────────────────────────────┤
│                             │
│ ┌─────────────────────────┐ │
│ │                         │ │
│ │   📄 Select CSV File    │ │
│ │                         │ │
│ │   or paste content      │ │
│ │                         │ │
│ └─────────────────────────┘ │
│                             │
│ CSV Format:                 │
│ name,content               │
│ "Label 1","https://..."    │
│ "Label 2","wifi:..."       │
│                             │
├─────────────────────────────┤
│ Limits on mobile:           │
│ • Max 50 QR codes           │
│ • PNG export only           │
│ • 1024px size               │
├─────────────────────────────┤
│                             │
│ 🏠    📋    📷    🕐    💾  │
└─────────────────────────────┘
```

### 10. Batch - Processing View

```
┌─────────────────────────────┐
│ ← Batch          Cancel     │
├─────────────────────────────┤
│                             │
│ Processing 24 QR codes...   │
│                             │
│ ████████████░░░░░░░░  60%   │
│                             │
│ ┌─────────────────────────┐ │
│ │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │ │
│ │ │ ✓ │ │ ✓ │ │ ✓ │ │ ✓ │ │ │
│ │ └───┘ └───┘ └───┘ └───┘ │ │ Mini previews
│ │ ┌───┐ ┌───┐ ┌───┐ ┌───┐ │ │
│ │ │ ✓ │ │ ✓ │ │ ◌ │ │ ◌ │ │ │
│ │ └───┘ └───┘ └───┘ └───┘ │ │
│ └─────────────────────────┘ │
│                             │
│ ✓ 14 generated              │
│ ◌ 10 pending                │
│ ✗ 0 failed                  │
│                             │
├─────────────────────────────┤
│ [         Pause         ]   │
├─────────────────────────────┤
│ 🏠    📋    📷    🕐    💾  │
└─────────────────────────────┘
```

---

## Tauri iOS Configuration

### Required Changes to `tauri.conf.json`

```json
{
  "bundle": {
    "identifier": "com.jonathanlam.qr-foundry",
    "iOS": {
      "minimumSystemVersion": "13.0"
    }
  },
  "app": {
    "withGlobalTauri": true
  }
}
```

### Required Cargo.toml Features

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }

[target.'cfg(target_os = "ios")'.dependencies]
# iOS-specific dependencies if needed
```

### New Files Required

```
src-tauri/
├── gen/
│   └── apple/              # Generated by `tauri ios init`
│       ├── qr-foundry.xcodeproj/
│       └── qr-foundry/
│           ├── Assets.xcassets/
│           ├── Info.plist
│           └── LaunchScreen.storyboard
```

### Build Commands

```bash
# Initialize iOS project
npm run tauri ios init

# Development
npm run tauri ios dev

# Build for device
npm run tauri ios build

# Open in Xcode
npm run tauri ios open
```

---

## Implementation Phases

### Phase 1: Responsive Foundation (Week 1-2)
- [ ] Add Tailwind responsive breakpoints
- [ ] Create mobile-first base styles
- [ ] Implement responsive navigation
- [ ] Add bottom sheet component
- [ ] Create shared layout components

### Phase 2: Generator Mobile UI (Week 2-3)
- [ ] Stack layout for mobile
- [ ] Style options as bottom sheet
- [ ] Export options as bottom sheet
- [ ] Touch-optimized controls
- [ ] Safe area handling

### Phase 3: Scanner with Camera (Week 3-4)
- [ ] Integrate camera API (via Tauri plugin or web API)
- [ ] Camera permission handling
- [ ] QR detection overlay
- [ ] Result action sheet
- [ ] Fallback to file picker

### Phase 4: History & Templates Mobile (Week 4)
- [ ] Responsive list/grid layouts
- [ ] Swipe actions for delete
- [ ] Detail view with actions
- [ ] Quick load functionality

### Phase 5: Batch Simplified (Week 5)
- [ ] Mobile file picker
- [ ] Progress overlay
- [ ] Share sheet for export
- [ ] Batch limits for mobile

### Phase 6: iOS Build & Deploy (Week 5-6)
- [ ] Initialize Tauri iOS project
- [ ] Configure app icons and launch screen
- [ ] Handle iOS permissions
- [ ] Test on physical devices
- [ ] App Store preparation

---

## Component Architecture

### New Shared Components

```typescript
// Mobile-aware layout wrapper
<ResponsiveLayout>
  <MobileView>  {/* <640px */}
  <TabletView>  {/* 640-1023px */}
  <DesktopView> {/* 1024px+ */}
</ResponsiveLayout>

// Bottom sheet for mobile options
<BottomSheet open={open} onClose={onClose}>
  <SheetHeader title="Style Options" />
  <SheetContent>...</SheetContent>
</BottomSheet>

// Platform-aware export
<ExportButton onExport={handleExport}>
  {/* Renders Share on mobile, Save Dialog on desktop */}
</ExportButton>
```

### Hooks for Platform Detection

```typescript
// Detect platform and screen size
const { isMobile, isTablet, isDesktop, isIOS } = usePlatform();

// Responsive value helper
const panelWidth = useResponsive({
  mobile: '100%',
  tablet: '50%',
  desktop: '320px'
});
```

---

## File Changes Summary

### New Files
- `src/components/shared/BottomSheet.tsx`
- `src/components/shared/ResponsiveLayout.tsx`
- `src/components/shared/ExportSheet.tsx`
- `src/components/shared/StyleSheet.tsx`
- `src/components/scanner/CameraScanner.tsx`
- `src/hooks/usePlatform.ts`
- `src/hooks/useResponsive.ts`
- `src/styles/mobile.css`

### Modified Files
- `src/App.tsx` - Responsive navigation
- `src/components/generator/GeneratorView.tsx` - Mobile layout
- `src/components/scanner/ScannerView.tsx` - Camera integration
- `src/components/batch/BatchView.tsx` - Simplified mobile mode
- `src/components/history/HistoryView.tsx` - List layout
- `src/components/templates/TemplatesView.tsx` - Grid layout
- `src/styles/global.css` - Breakpoints, safe areas
- `tauri.conf.json` - iOS configuration
- `Cargo.toml` - iOS features

---

## Testing Strategy

### Device Matrix
- iPhone SE (375px) - Smallest supported
- iPhone 14 (390px) - Standard
- iPhone 14 Pro Max (430px) - Large phone
- iPad Mini (744px) - Small tablet
- iPad Pro 11" (834px) - Standard tablet

### Test Cases
1. Portrait and landscape orientations
2. Keyboard appearance doesn't break layout
3. Safe areas respected (notch, home indicator)
4. Touch targets are 44pt minimum
5. Gestures work (swipe, pinch-to-zoom on QR)
6. Camera permissions flow
7. Share sheet integration
8. Background/foreground transitions

---

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tauri iOS stability | High | Pin to stable version, test thoroughly |
| Camera API complexity | Medium | Start with file picker, add camera later |
| App Store rejection | Medium | Follow HIG, proper permissions |
| Performance on older devices | Medium | Limit batch size, optimize renders |
| UI complexity | Low | Use existing Radix components |

---

## Success Metrics

1. **Feature Parity:** 90%+ of desktop features available
2. **Performance:** QR generation < 500ms on iPhone 12
3. **Bundle Size:** < 15MB iOS app
4. **Usability:** All touch targets 44pt+
5. **Store Readiness:** Pass App Store review first submission
