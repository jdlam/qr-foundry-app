import { usePlatform } from './usePlatform';

export interface ResponsiveValue<T> {
  mobile: T;
  tablet?: T;
  desktop?: T;
}

/**
 * Returns the appropriate value based on current screen size
 * Falls back to smaller breakpoint if larger isn't specified
 */
export function useResponsive<T>(values: ResponsiveValue<T>): T {
  const { isMobile, isTablet } = usePlatform();

  if (isMobile) {
    return values.mobile;
  }

  if (isTablet) {
    return values.tablet ?? values.mobile;
  }

  return values.desktop ?? values.tablet ?? values.mobile;
}

/**
 * Returns different class names based on screen size
 */
export function useResponsiveClass(values: ResponsiveValue<string>): string {
  return useResponsive(values);
}

/**
 * Returns whether the current breakpoint matches
 */
export function useBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop'): boolean {
  const { isMobile, isTablet, isDesktop } = usePlatform();

  switch (breakpoint) {
    case 'mobile':
      return isMobile;
    case 'tablet':
      return isTablet;
    case 'desktop':
      return isDesktop;
  }
}

/**
 * Returns true if screen is at least the specified breakpoint
 */
export function useMinBreakpoint(breakpoint: 'mobile' | 'tablet' | 'desktop'): boolean {
  const { isMobile, isTablet, isDesktop } = usePlatform();

  switch (breakpoint) {
    case 'mobile':
      return true;
    case 'tablet':
      return isTablet || isDesktop;
    case 'desktop':
      return isDesktop;
  }
}
