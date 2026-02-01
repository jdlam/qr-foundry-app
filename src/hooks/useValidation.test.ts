import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useValidation, useScanQr } from './useValidation';
import { invoke } from '@tauri-apps/api/core';
import { useQrStore } from '../stores/qrStore';

vi.mock('@tauri-apps/api/core');
const mockInvoke = vi.mocked(invoke);

describe('useValidation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useQrStore.getState().reset();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useValidation());

    expect(result.current.isValidating).toBe(false);
    expect(result.current.result).toBeNull();
  });

  it('returns null when content is empty', async () => {
    useQrStore.getState().setContent('');
    const { result } = renderHook(() => useValidation());

    let validationResult: unknown;
    await act(async () => {
      validationResult = await result.current.validate('data:image/png;base64,abc');
    });

    expect(validationResult).toBeNull();
    expect(useQrStore.getState().validationState).toBe('fail');
  });

  it('calls validate_qr and updates state on success', async () => {
    useQrStore.getState().setContent('https://example.com');
    mockInvoke.mockResolvedValueOnce({
      state: 'pass',
      decodedContent: 'https://example.com',
      contentMatch: true,
      message: 'QR code scans correctly',
      suggestions: [],
    });

    const { result } = renderHook(() => useValidation());

    await act(async () => {
      await result.current.validate('data:image/png;base64,abc');
    });

    expect(mockInvoke).toHaveBeenCalledWith('validate_qr', {
      imageData: 'data:image/png;base64,abc',
      expectedContent: 'https://example.com',
    });
    expect(result.current.result?.state).toBe('pass');
    expect(result.current.isValidating).toBe(false);
    expect(useQrStore.getState().validationState).toBe('pass');
  });

  it('handles validation failure', async () => {
    useQrStore.getState().setContent('test content');
    mockInvoke.mockResolvedValueOnce({
      state: 'fail',
      decodedContent: null,
      contentMatch: false,
      message: 'No QR code detected',
      suggestions: ['Increase error correction'],
    });

    const { result } = renderHook(() => useValidation());

    await act(async () => {
      await result.current.validate('data:image/png;base64,xyz');
    });

    expect(result.current.result?.state).toBe('fail');
    expect(result.current.result?.suggestions).toContain('Increase error correction');
    expect(useQrStore.getState().validationState).toBe('fail');
  });

  it('handles API error gracefully', async () => {
    useQrStore.getState().setContent('test content');
    mockInvoke.mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useValidation());

    await act(async () => {
      await result.current.validate('data:image/png;base64,xyz');
    });

    expect(result.current.result?.state).toBe('fail');
    expect(result.current.result?.message).toContain('Validation error');
    expect(useQrStore.getState().validationState).toBe('fail');
  });

  it('sets isValidating during validation', async () => {
    useQrStore.getState().setContent('test');
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useValidation());

    // Start validation
    act(() => {
      result.current.validate('data:image/png;base64,abc');
    });

    // Should be validating
    expect(result.current.isValidating).toBe(true);
    expect(useQrStore.getState().validationState).toBe('validating');

    // Complete validation
    await act(async () => {
      resolvePromise!({
        state: 'pass',
        decodedContent: 'test',
        contentMatch: true,
        message: 'OK',
        suggestions: [],
      });
      await pendingPromise;
    });

    expect(result.current.isValidating).toBe(false);
  });

  it('resetValidation clears result and state', async () => {
    useQrStore.getState().setContent('test');
    mockInvoke.mockResolvedValueOnce({
      state: 'pass',
      decodedContent: 'test',
      contentMatch: true,
      message: 'OK',
      suggestions: [],
    });

    const { result } = renderHook(() => useValidation());

    await act(async () => {
      await result.current.validate('data:image/png;base64,abc');
    });

    expect(result.current.result).not.toBeNull();

    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.result).toBeNull();
    expect(useQrStore.getState().validationState).toBe('idle');
  });
});

describe('useScanQr', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useScanQr());

    expect(result.current.isScanning).toBe(false);
    expect(result.current.scanResult).toBeNull();
  });

  it('scanFromFile calls scan_qr_from_file', async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      content: 'https://example.com',
      qrType: 'url',
      error: null,
    });

    const { result } = renderHook(() => useScanQr());

    await act(async () => {
      await result.current.scanFromFile('/path/to/qr.png');
    });

    expect(mockInvoke).toHaveBeenCalledWith('scan_qr_from_file', {
      filePath: '/path/to/qr.png',
    });
    expect(result.current.scanResult?.success).toBe(true);
    expect(result.current.scanResult?.content).toBe('https://example.com');
    expect(result.current.scanResult?.qrType).toBe('url');
  });

  it('scanFromData calls scan_qr_from_data', async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      content: 'tel:+15551234567',
      qrType: 'phone',
      error: null,
    });

    const { result } = renderHook(() => useScanQr());

    await act(async () => {
      await result.current.scanFromData('data:image/png;base64,abc');
    });

    expect(mockInvoke).toHaveBeenCalledWith('scan_qr_from_data', {
      imageData: 'data:image/png;base64,abc',
    });
    expect(result.current.scanResult?.qrType).toBe('phone');
  });

  it('handles scan failure', async () => {
    mockInvoke.mockResolvedValueOnce({
      success: false,
      content: null,
      qrType: null,
      error: 'No QR code found',
    });

    const { result } = renderHook(() => useScanQr());

    await act(async () => {
      await result.current.scanFromFile('/path/to/image.png');
    });

    expect(result.current.scanResult?.success).toBe(false);
    expect(result.current.scanResult?.error).toBe('No QR code found');
  });

  it('handles API error', async () => {
    mockInvoke.mockRejectedValueOnce(new Error('File not found'));

    const { result } = renderHook(() => useScanQr());

    await act(async () => {
      await result.current.scanFromFile('/nonexistent.png');
    });

    expect(result.current.scanResult?.success).toBe(false);
    expect(result.current.scanResult?.error).toContain('Scan error');
  });

  it('clearScan resets scanResult', async () => {
    mockInvoke.mockResolvedValueOnce({
      success: true,
      content: 'test',
      qrType: 'text',
      error: null,
    });

    const { result } = renderHook(() => useScanQr());

    await act(async () => {
      await result.current.scanFromData('data:image/png;base64,abc');
    });

    expect(result.current.scanResult).not.toBeNull();

    act(() => {
      result.current.clearScan();
    });

    expect(result.current.scanResult).toBeNull();
  });

  it('sets isScanning during scan', async () => {
    let resolvePromise: (value: unknown) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });
    mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

    const { result } = renderHook(() => useScanQr());

    act(() => {
      result.current.scanFromData('data:image/png;base64,abc');
    });

    expect(result.current.isScanning).toBe(true);

    await act(async () => {
      resolvePromise!({ success: true, content: 'test', qrType: 'text', error: null });
      await pendingPromise;
    });

    expect(result.current.isScanning).toBe(false);
  });
});
