import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useExport } from './useExport';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
const mockInvoke = vi.mocked(invoke);

describe('useExport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useExport());

    expect(result.current.isExporting).toBe(false);
    expect(result.current.lastExportPath).toBeNull();
  });

  describe('exportPng', () => {
    it('calls export_png with image data and suggested name', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        path: '/Users/test/qr-code.png',
        error: null,
      });

      const { result } = renderHook(() => useExport());

      let exportResult: unknown;
      await act(async () => {
        exportResult = await result.current.exportPng('data:image/png;base64,abc', 'my-qr.png');
      });

      expect(mockInvoke).toHaveBeenCalledWith('export_png', {
        imageData: 'data:image/png;base64,abc',
        suggestedName: 'my-qr.png',
      });
      expect(exportResult).toEqual({
        success: true,
        path: '/Users/test/qr-code.png',
        error: null,
      });
      expect(result.current.lastExportPath).toBe('/Users/test/qr-code.png');
    });

    it('uses default name when not provided', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        path: '/test/qr-code.png',
        error: null,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportPng('data:image/png;base64,abc');
      });

      expect(mockInvoke).toHaveBeenCalledWith('export_png', {
        imageData: 'data:image/png;base64,abc',
        suggestedName: 'qr-code.png',
      });
    });

    it('handles cancelled save', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        path: null,
        error: 'Save cancelled by user',
      });

      const { result } = renderHook(() => useExport());

      let exportResult: unknown;
      await act(async () => {
        exportResult = await result.current.exportPng('data:image/png;base64,abc');
      });

      expect((exportResult as { success: boolean }).success).toBe(false);
      expect(result.current.lastExportPath).toBeNull();
    });

    it('handles API error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Failed to write file'));

      const { result } = renderHook(() => useExport());

      let exportResult: unknown;
      await act(async () => {
        exportResult = await result.current.exportPng('data:image/png;base64,abc');
      });

      expect((exportResult as { success: boolean; error: string }).success).toBe(false);
      expect((exportResult as { error: string }).error).toContain('Export failed');
    });
  });

  describe('exportSvg', () => {
    it('calls export_svg with SVG data', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        path: '/Users/test/qr-code.svg',
        error: null,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportSvg('<svg>...</svg>', 'my-qr.svg');
      });

      expect(mockInvoke).toHaveBeenCalledWith('export_svg', {
        svgData: '<svg>...</svg>',
        suggestedName: 'my-qr.svg',
      });
      expect(result.current.lastExportPath).toBe('/Users/test/qr-code.svg');
    });

    it('uses default name when not provided', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        path: '/test/qr-code.svg',
        error: null,
      });

      const { result } = renderHook(() => useExport());

      await act(async () => {
        await result.current.exportSvg('<svg></svg>');
      });

      expect(mockInvoke).toHaveBeenCalledWith('export_svg', {
        svgData: '<svg></svg>',
        suggestedName: 'qr-code.svg',
      });
    });

    it('handles error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Disk full'));

      const { result } = renderHook(() => useExport());

      const exportResult = await act(async () => {
        return await result.current.exportSvg('<svg></svg>');
      });

      expect(exportResult.success).toBe(false);
      expect(exportResult.error).toContain('Export failed');
    });
  });

  describe('copyToClipboard', () => {
    it('calls copy_image_to_clipboard', async () => {
      mockInvoke.mockResolvedValueOnce(true);

      const { result } = renderHook(() => useExport());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.copyToClipboard('data:image/png;base64,abc');
      });

      expect(mockInvoke).toHaveBeenCalledWith('copy_image_to_clipboard', {
        imageData: 'data:image/png;base64,abc',
      });
      expect(success).toBe(true);
    });

    it('returns false on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Clipboard unavailable'));

      const { result } = renderHook(() => useExport());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.copyToClipboard('data:image/png;base64,abc');
      });

      expect(success).toBe(false);
    });
  });

  describe('pickImageFile', () => {
    it('returns file path on selection', async () => {
      mockInvoke.mockResolvedValueOnce('/Users/test/image.png');

      const { result } = renderHook(() => useExport());

      let path: string | null = null;
      await act(async () => {
        path = await result.current.pickImageFile();
      });

      expect(mockInvoke).toHaveBeenCalledWith('pick_image_file');
      expect(path).toBe('/Users/test/image.png');
    });

    it('returns null when cancelled', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useExport());

      let path: string | null = 'something';
      await act(async () => {
        path = await result.current.pickImageFile();
      });

      expect(path).toBeNull();
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Dialog failed'));

      const { result } = renderHook(() => useExport());

      let path: string | null = 'something';
      await act(async () => {
        path = await result.current.pickImageFile();
      });

      expect(path).toBeNull();
    });
  });

  it('sets isExporting during export operations', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useExport());

    act(() => {
      result.current.exportPng('data:image/png;base64,abc');
    });

    expect(result.current.isExporting).toBe(true);

    await act(async () => {
      resolvePromise!({ success: true, path: '/test.png', error: null });
      await pendingPromise;
    });

    expect(result.current.isExporting).toBe(false);
  });
});
