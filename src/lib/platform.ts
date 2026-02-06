export type PlatformName = 'tauri' | 'web';

export function platformName(): PlatformName {
  return (import.meta.env.VITE_PLATFORM as PlatformName) || 'tauri';
}

export function isWeb(): boolean {
  return platformName() === 'web';
}

export function isTauri(): boolean {
  return platformName() === 'tauri';
}
