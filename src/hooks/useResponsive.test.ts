import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useResponsive, useBreakpoint, useMinBreakpoint } from './useResponsive';

describe('useResponsive', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth);
  });

  it('returns mobile value on mobile viewport', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value'
      })
    );
    expect(result.current).toBe('mobile-value');
  });

  it('returns tablet value on tablet viewport', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value'
      })
    );
    expect(result.current).toBe('tablet-value');
  });

  it('returns desktop value on desktop viewport', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 'mobile-value',
        tablet: 'tablet-value',
        desktop: 'desktop-value'
      })
    );
    expect(result.current).toBe('desktop-value');
  });

  it('falls back to mobile when tablet not specified', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 'mobile-value',
        desktop: 'desktop-value'
      })
    );
    expect(result.current).toBe('mobile-value');
  });

  it('falls back to tablet when desktop not specified', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 'mobile-value',
        tablet: 'tablet-value'
      })
    );
    expect(result.current).toBe('tablet-value');
  });

  it('works with numeric values', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: 100,
        tablet: 200,
        desktop: 300
      })
    );
    expect(result.current).toBe(100);
  });

  it('works with object values', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() =>
      useResponsive({
        mobile: { columns: 1 },
        tablet: { columns: 2 },
        desktop: { columns: 3 }
      })
    );
    expect(result.current).toEqual({ columns: 3 });
  });
});

describe('useBreakpoint', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth);
  });

  it('returns true when breakpoint matches mobile', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => useBreakpoint('mobile'));
    expect(result.current).toBe(true);
  });

  it('returns false when breakpoint does not match', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useBreakpoint('mobile'));
    expect(result.current).toBe(false);
  });

  it('returns true when breakpoint matches tablet', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => useBreakpoint('tablet'));
    expect(result.current).toBe(true);
  });

  it('returns true when breakpoint matches desktop', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useBreakpoint('desktop'));
    expect(result.current).toBe(true);
  });
});

describe('useMinBreakpoint', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    vi.stubGlobal('innerWidth', originalInnerWidth);
  });

  it('mobile is always at least mobile', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => useMinBreakpoint('mobile'));
    expect(result.current).toBe(true);
  });

  it('mobile is not at least tablet', () => {
    vi.stubGlobal('innerWidth', 375);
    const { result } = renderHook(() => useMinBreakpoint('tablet'));
    expect(result.current).toBe(false);
  });

  it('tablet is at least tablet', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => useMinBreakpoint('tablet'));
    expect(result.current).toBe(true);
  });

  it('desktop is at least tablet', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useMinBreakpoint('tablet'));
    expect(result.current).toBe(true);
  });

  it('tablet is not at least desktop', () => {
    vi.stubGlobal('innerWidth', 800);
    const { result } = renderHook(() => useMinBreakpoint('desktop'));
    expect(result.current).toBe(false);
  });

  it('desktop is at least desktop', () => {
    vi.stubGlobal('innerWidth', 1200);
    const { result } = renderHook(() => useMinBreakpoint('desktop'));
    expect(result.current).toBe(true);
  });
});
