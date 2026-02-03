import { useState, useEffect } from 'react';

export interface PlatformInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTauri: boolean;
  screenWidth: number;
  screenHeight: number;
  isPortrait: boolean;
  isLandscape: boolean;
}

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
} as const;

function getPlatformInfo(): PlatformInfo {
  const width = typeof window !== 'undefined' ? window.innerWidth : 1024;
  const height = typeof window !== 'undefined' ? window.innerHeight : 768;
  const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  const isIOS = /iPad|iPhone|iPod/.test(userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(userAgent);
  const isTauri = typeof window !== 'undefined' && '__TAURI__' in window;

  return {
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    isIOS,
    isAndroid,
    isTauri,
    screenWidth: width,
    screenHeight: height,
    isPortrait: height > width,
    isLandscape: width > height,
  };
}

export function usePlatform(): PlatformInfo {
  const [platform, setPlatform] = useState<PlatformInfo>(getPlatformInfo);

  useEffect(() => {
    function handleResize() {
      setPlatform(getPlatformInfo());
    }

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);

  return platform;
}

export function useIsMobile(): boolean {
  const { isMobile } = usePlatform();
  return isMobile;
}

export function useIsTablet(): boolean {
  const { isTablet } = usePlatform();
  return isTablet;
}

export function useIsDesktop(): boolean {
  const { isDesktop } = usePlatform();
  return isDesktop;
}
