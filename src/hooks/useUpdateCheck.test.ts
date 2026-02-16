import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, cleanup } from '@testing-library/react';

const { mockCheck, mockDownloadAndInstall, mockRelaunch } = vi.hoisted(() => ({
  mockCheck: vi.fn(),
  mockDownloadAndInstall: vi.fn(),
  mockRelaunch: vi.fn(),
}));

vi.mock('../lib/platform', () => ({
  isTauri: vi.fn(() => true),
}));

vi.mock('@tauri-apps/plugin-updater', () => ({
  check: (...args: unknown[]) => mockCheck(...args),
}));

vi.mock('@tauri-apps/plugin-process', () => ({
  relaunch: (...args: unknown[]) => mockRelaunch(...args),
}));

import { isTauri } from '../lib/platform';
import { useUpdateCheck } from './useUpdateCheck';

/**
 * Flush pending microtasks from dynamic imports and async effects.
 * The hook chains `await import(...)` → `await check()` → setState,
 * which requires multiple microtask ticks to fully settle.
 * Two ticks handle the two sequential awaits in the effect.
 */
async function flushAsync(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

describe('useUpdateCheck', () => {
  beforeEach(() => {
    vi.mocked(isTauri).mockReturnValue(true);
    mockCheck.mockReset();
    mockDownloadAndInstall.mockReset();
    mockRelaunch.mockReset();
  });

  afterEach(async () => {
    cleanup();
    await flushAsync();
  });

  it('initializes with no update and not installing', async () => {
    mockCheck.mockResolvedValue(null);
    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();

    expect(result.current.updateAvailable).toBe(false);
    expect(result.current.installing).toBe(false);
  });

  it('skips update check on non-Tauri platforms', async () => {
    vi.mocked(isTauri).mockReturnValue(false);
    const { result } = renderHook(() => useUpdateCheck());

    // Allow time for the effect to (not) run
    await flushAsync();

    expect(mockCheck).not.toHaveBeenCalled();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('sets updateAvailable when an update is found', async () => {
    mockCheck.mockResolvedValue({ downloadAndInstall: mockDownloadAndInstall });

    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();

    expect(result.current.updateAvailable).toBe(true);
  });

  it('does not set updateAvailable when no update exists', async () => {
    mockCheck.mockResolvedValue(null);
    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();

    expect(result.current.updateAvailable).toBe(false);
  });

  it('silently handles check errors', async () => {
    mockCheck.mockRejectedValue(new Error('offline'));
    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();

    expect(result.current.updateAvailable).toBe(false);
  });

  it('does not update state if unmounted before check completes', async () => {
    let resolveCheck: (value: unknown) => void;
    mockCheck.mockReturnValue(new Promise((resolve) => { resolveCheck = resolve; }));

    const { result, unmount } = renderHook(() => useUpdateCheck());
    unmount();

    await act(async () => {
      resolveCheck!({ downloadAndInstall: mockDownloadAndInstall });
    });

    expect(result.current.updateAvailable).toBe(false);
  });

  it('downloads, installs, and relaunches on install()', async () => {
    mockCheck.mockResolvedValue({ downloadAndInstall: mockDownloadAndInstall });
    mockDownloadAndInstall.mockResolvedValue(undefined);
    mockRelaunch.mockResolvedValue(undefined);

    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();
    expect(result.current.updateAvailable).toBe(true);

    await act(async () => {
      result.current.install();
    });
    await flushAsync();

    expect(mockDownloadAndInstall).toHaveBeenCalledOnce();
    expect(result.current.installing).toBe(true);
  });

  it('prevents concurrent install calls', async () => {
    mockCheck.mockResolvedValue({ downloadAndInstall: mockDownloadAndInstall });
    mockDownloadAndInstall.mockReturnValue(new Promise(() => {})); // never resolves

    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();
    expect(result.current.updateAvailable).toBe(true);

    act(() => {
      result.current.install();
      result.current.install();
    });

    expect(mockDownloadAndInstall).toHaveBeenCalledOnce();
  });

  it('resets installing state on install error', async () => {
    mockCheck.mockResolvedValue({ downloadAndInstall: mockDownloadAndInstall });
    mockDownloadAndInstall.mockRejectedValue(new Error('download failed'));

    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();
    expect(result.current.updateAvailable).toBe(true);

    await act(async () => {
      result.current.install();
    });

    expect(result.current.installing).toBe(false);
  });

  it('does nothing when install() is called without a pending update', async () => {
    mockCheck.mockResolvedValue(null);
    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();

    await act(async () => {
      result.current.install();
    });

    expect(mockDownloadAndInstall).not.toHaveBeenCalled();
    expect(result.current.installing).toBe(false);
  });

  it('dismiss clears updateAvailable', async () => {
    mockCheck.mockResolvedValue({ downloadAndInstall: mockDownloadAndInstall });
    const { result } = renderHook(() => useUpdateCheck());

    await flushAsync();
    expect(result.current.updateAvailable).toBe(true);

    act(() => {
      result.current.dismiss();
    });

    expect(result.current.updateAvailable).toBe(false);
  });
});
