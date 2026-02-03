import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePlatform, useIsMobile, useIsTablet, useIsDesktop } from './usePlatform';

describe('usePlatform', () => {
  const originalInnerWidth = window.innerWidth;
  const originalInnerHeight = window.innerHeight;

  beforeEach(() => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
  });

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth);
    vi.stubGlobal('innerHeight', originalInnerHeight);
  });

  it('detects desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isDesktop).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isTablet).toBe(false);
  });

  it('detects tablet viewport', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isTablet).toBe(true);
    expect(result.current.isMobile).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('detects mobile viewport', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isTablet).toBe(false);
    expect(result.current.isDesktop).toBe(false);
  });

  it('detects portrait orientation', () => {
    vi.stubGlobal('innerWidth', 375);
    vi.stubGlobal('innerHeight', 812);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isPortrait).toBe(true);
    expect(result.current.isLandscape).toBe(false);
  });

  it('detects landscape orientation', () => {
    vi.stubGlobal('innerWidth', 812);
    vi.stubGlobal('innerHeight', 375);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isLandscape).toBe(true);
    expect(result.current.isPortrait).toBe(false);
  });

  it('updates on resize', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.isDesktop).toBe(true);

    act(() => {
      vi.stubGlobal('innerWidth', 375);
      window.dispatchEvent(new Event('resize'));
    });

    expect(result.current.isMobile).toBe(true);
    expect(result.current.isDesktop).toBe(false);
  });

  it('reports screen dimensions', () => {
    vi.stubGlobal('innerWidth', 1024);
    vi.stubGlobal('innerHeight', 768);
    const { result } = renderHook(() => usePlatform());

    expect(result.current.screenWidth).toBe(1024);
    expect(result.current.screenHeight).toBe(768);
  });

  it('detects Tauri environment', () => {
    const { result } = renderHook(() => usePlatform());
    // In test environment, __TAURI__ is not defined
    expect(result.current.isTauri).toBe(false);
  });
});

describe('useIsMobile', () => {
  it('returns true for mobile viewport', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(true);
  });

  it('returns false for desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);
  });
});

describe('useIsTablet', () => {
  it('returns true for tablet viewport', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(true);
  });

  it('returns false for mobile viewport', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => useIsTablet());
    expect(result.current).toBe(false);
  });
});

describe('useIsDesktop', () => {
  it('returns true for desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(true);
  });

  it('returns false for tablet viewport', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => useIsDesktop());
    expect(result.current).toBe(false);
  });
});
