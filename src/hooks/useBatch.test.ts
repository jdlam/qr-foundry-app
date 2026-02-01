import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBatch } from './useBatch';
import { invoke } from '@tauri-apps/api/core';

vi.mock('@tauri-apps/api/core');
const mockInvoke = vi.mocked(invoke);

const mockBatchItems = [
  { row: 1, content: 'https://example.com', qrType: 'url', label: 'Example' },
  { row: 2, content: 'tel:+15551234567', qrType: 'phone', label: null },
];

const mockGenerateItems = [
  { row: 1, content: 'https://example.com', label: 'Example', imageData: 'data:image/png;base64,abc' },
  { row: 2, content: 'tel:+15551234567', label: null, imageData: 'data:image/png;base64,xyz' },
];

describe('useBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns initial state', () => {
    const { result } = renderHook(() => useBatch());

    expect(result.current.items).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isParsing).toBe(false);
    expect(result.current.isGenerating).toBe(false);
    expect(result.current.parseError).toBeNull();
    expect(result.current.validationResults.size).toBe(0);
  });

  describe('parseCsvFile', () => {
    it('parses CSV file successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        items: mockBatchItems,
        error: null,
        totalRows: 2,
      });

      const { result } = renderHook(() => useBatch());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.parseCsvFile('/path/to/file.csv');
      });

      expect(mockInvoke).toHaveBeenCalledWith('batch_parse_csv', {
        filePath: '/path/to/file.csv',
      });
      expect(success).toBe(true);
      expect(result.current.items).toEqual(mockBatchItems);
      expect(result.current.parseError).toBeNull();
    });

    it('handles parse failure', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        items: [],
        error: 'Missing content column',
        totalRows: 0,
      });

      const { result } = renderHook(() => useBatch());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.parseCsvFile('/path/to/invalid.csv');
      });

      expect(success).toBe(false);
      expect(result.current.items).toEqual([]);
      expect(result.current.parseError).toBe('Missing content column');
    });

    it('handles API error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('File not found'));

      const { result } = renderHook(() => useBatch());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.parseCsvFile('/nonexistent.csv');
      });

      expect(success).toBe(false);
      expect(result.current.parseError).toContain('Failed to parse CSV');
    });

    it('sets isParsing during parse', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

      const { result } = renderHook(() => useBatch());

      act(() => {
        result.current.parseCsvFile('/path/to/file.csv');
      });

      expect(result.current.isParsing).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, items: [], error: null, totalRows: 0 });
        await pendingPromise;
      });

      expect(result.current.isParsing).toBe(false);
    });
  });

  describe('parseCsvContent', () => {
    it('parses CSV content successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        items: mockBatchItems,
        error: null,
        totalRows: 2,
      });

      const { result } = renderHook(() => useBatch());

      let success: boolean = false;
      await act(async () => {
        success = await result.current.parseCsvContent('content,type\nhttps://example.com,url');
      });

      expect(mockInvoke).toHaveBeenCalledWith('batch_parse_csv_content', {
        content: 'content,type\nhttps://example.com,url',
      });
      expect(success).toBe(true);
      expect(result.current.items).toEqual(mockBatchItems);
    });

    it('handles parse failure', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        items: [],
        error: 'Invalid CSV format',
        totalRows: 0,
      });

      const { result } = renderHook(() => useBatch());

      let success: boolean = true;
      await act(async () => {
        success = await result.current.parseCsvContent('invalid');
      });

      expect(success).toBe(false);
      expect(result.current.parseError).toBe('Invalid CSV format');
    });
  });

  describe('pickCsvFile', () => {
    it('returns file path on selection', async () => {
      mockInvoke.mockResolvedValueOnce('/Users/test/data.csv');

      const { result } = renderHook(() => useBatch());

      let path: string | null = null;
      await act(async () => {
        path = await result.current.pickCsvFile();
      });

      expect(mockInvoke).toHaveBeenCalledWith('pick_csv_file');
      expect(path).toBe('/Users/test/data.csv');
    });

    it('returns null when cancelled', async () => {
      mockInvoke.mockResolvedValueOnce(null);

      const { result } = renderHook(() => useBatch());

      let path: string | null = 'something';
      await act(async () => {
        path = await result.current.pickCsvFile();
      });

      expect(path).toBeNull();
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Dialog failed'));

      const { result } = renderHook(() => useBatch());

      let path: string | null = 'something';
      await act(async () => {
        path = await result.current.pickCsvFile();
      });

      expect(path).toBeNull();
    });
  });

  describe('validateBatch', () => {
    it('validates batch items', async () => {
      const validationResults = [
        { row: 1, success: true, decodedContent: 'https://example.com', contentMatch: true, error: null },
        { row: 2, success: true, decodedContent: 'tel:+15551234567', contentMatch: true, error: null },
      ];
      mockInvoke.mockResolvedValueOnce(validationResults);

      const { result } = renderHook(() => useBatch());

      let results: unknown[] = [];
      await act(async () => {
        results = await result.current.validateBatch(mockGenerateItems);
      });

      expect(mockInvoke).toHaveBeenCalledWith('batch_validate', {
        items: mockGenerateItems,
      });
      expect(results).toEqual(validationResults);
      expect(result.current.validationResults.get(1)?.success).toBe(true);
      expect(result.current.validationResults.get(2)?.success).toBe(true);
    });

    it('handles validation with failures', async () => {
      const validationResults = [
        { row: 1, success: true, decodedContent: 'https://example.com', contentMatch: true, error: null },
        { row: 2, success: false, decodedContent: null, contentMatch: false, error: 'No QR code detected' },
      ];
      mockInvoke.mockResolvedValueOnce(validationResults);

      const { result } = renderHook(() => useBatch());

      await act(async () => {
        await result.current.validateBatch(mockGenerateItems);
      });

      expect(result.current.validationResults.get(1)?.success).toBe(true);
      expect(result.current.validationResults.get(2)?.success).toBe(false);
      expect(result.current.validationResults.get(2)?.error).toBe('No QR code detected');
    });

    it('returns empty array on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('Validation failed'));

      const { result } = renderHook(() => useBatch());

      let results: unknown[] = [1, 2, 3];
      await act(async () => {
        results = await result.current.validateBatch(mockGenerateItems);
      });

      expect(results).toEqual([]);
    });
  });

  describe('generateZip', () => {
    it('generates ZIP successfully', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        zipPath: '/Users/test/qr-codes.zip',
        validationResults: [],
        error: null,
      });

      const { result } = renderHook(() => useBatch());

      let generateResult: unknown;
      await act(async () => {
        generateResult = await result.current.generateZip(mockGenerateItems, false);
      });

      expect(mockInvoke).toHaveBeenCalledWith('batch_generate_zip', {
        items: mockGenerateItems,
        validate: false,
      });
      expect((generateResult as { success: boolean }).success).toBe(true);
      expect((generateResult as { zipPath: string }).zipPath).toBe('/Users/test/qr-codes.zip');
    });

    it('generates ZIP with validation', async () => {
      const validationResults = [
        { row: 1, success: true, decodedContent: 'https://example.com', contentMatch: true, error: null },
      ];
      mockInvoke.mockResolvedValueOnce({
        success: true,
        zipPath: '/Users/test/qr-codes.zip',
        validationResults,
        error: null,
      });

      const { result } = renderHook(() => useBatch());

      await act(async () => {
        await result.current.generateZip(mockGenerateItems, true);
      });

      expect(mockInvoke).toHaveBeenCalledWith('batch_generate_zip', {
        items: mockGenerateItems,
        validate: true,
      });
      expect(result.current.validationResults.get(1)?.success).toBe(true);
    });

    it('handles cancelled save', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: false,
        zipPath: null,
        validationResults: [],
        error: 'Save cancelled by user',
      });

      const { result } = renderHook(() => useBatch());

      let generateResult: unknown;
      await act(async () => {
        generateResult = await result.current.generateZip(mockGenerateItems, false);
      });

      expect((generateResult as { success: boolean }).success).toBe(false);
    });

    it('returns null on error', async () => {
      mockInvoke.mockRejectedValueOnce(new Error('ZIP creation failed'));

      const { result } = renderHook(() => useBatch());

      let generateResult: unknown = { something: true };
      await act(async () => {
        generateResult = await result.current.generateZip(mockGenerateItems, false);
      });

      expect(generateResult).toBeNull();
    });

    it('sets isGenerating during generation', async () => {
      let resolvePromise: (value: unknown) => void;
      const pendingPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockInvoke.mockReturnValueOnce(pendingPromise as Promise<unknown>);

      const { result } = renderHook(() => useBatch());

      act(() => {
        result.current.generateZip(mockGenerateItems, false);
      });

      expect(result.current.isGenerating).toBe(true);

      await act(async () => {
        resolvePromise!({ success: true, zipPath: '/test.zip', validationResults: [], error: null });
        await pendingPromise;
      });

      expect(result.current.isGenerating).toBe(false);
    });
  });

  describe('clearBatch', () => {
    it('clears all batch state', async () => {
      mockInvoke.mockResolvedValueOnce({
        success: true,
        items: mockBatchItems,
        error: null,
        totalRows: 2,
      });

      const { result } = renderHook(() => useBatch());

      await act(async () => {
        await result.current.parseCsvContent('content\ntest');
      });

      // Set some validation results
      mockInvoke.mockResolvedValueOnce([
        { row: 1, success: true, decodedContent: 'test', contentMatch: true, error: null },
      ]);

      await act(async () => {
        await result.current.validateBatch([mockGenerateItems[0]]);
      });

      expect(result.current.items.length).toBeGreaterThan(0);
      expect(result.current.validationResults.size).toBeGreaterThan(0);

      act(() => {
        result.current.clearBatch();
      });

      expect(result.current.items).toEqual([]);
      expect(result.current.parseError).toBeNull();
      expect(result.current.validationResults.size).toBe(0);
    });
  });
});
