import { describe, it, expect, beforeEach } from 'vitest';
import { useBatchStore, type BatchItem, type BatchItemWithStatus, type BatchValidationResult } from './batchStore';

describe('batchStore', () => {
  beforeEach(() => {
    // Reset store before each test
    useBatchStore.getState().clear();
  });

  describe('initial state', () => {
    it('has correct default values', () => {
      const state = useBatchStore.getState();

      expect(state.items).toEqual([]);
      expect(state.itemsWithStatus).toEqual([]);
      expect(state.generatedItems).toEqual([]);
      expect(state.validationResults.size).toBe(0);
      expect(state.parseError).toBeNull();
      expect(state.isParsing).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.isValidating).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.generateProgress).toBe(0);
      expect(state.previewIndex).toBe(0);
      expect(state.exportFormat).toBe('png');
    });
  });

  describe('setItems', () => {
    it('sets items and creates itemsWithStatus', () => {
      const items: BatchItem[] = [
        { row: 1, content: 'https://example.com', qrType: 'url', label: 'Example' },
        { row: 2, content: 'tel:+15551234567', qrType: 'phone', label: null },
      ];

      useBatchStore.getState().setItems(items);

      const state = useBatchStore.getState();
      expect(state.items).toEqual(items);
      expect(state.itemsWithStatus).toHaveLength(2);
      expect(state.itemsWithStatus[0].status).toBe('pending');
      expect(state.itemsWithStatus[1].status).toBe('pending');
    });

    it('resets generatedItems when items change', () => {
      useBatchStore.getState().setGeneratedItems([
        { row: 1, content: 'test', label: null, imageData: 'data:image/png;base64,abc' },
      ]);

      useBatchStore.getState().setItems([
        { row: 1, content: 'new', qrType: 'text', label: null },
      ]);

      expect(useBatchStore.getState().generatedItems).toEqual([]);
    });

    it('resets previewIndex when items change', () => {
      useBatchStore.getState().setPreviewIndex(5);
      useBatchStore.getState().setItems([
        { row: 1, content: 'test', qrType: 'text', label: null },
      ]);

      expect(useBatchStore.getState().previewIndex).toBe(0);
    });

    it('resets validationResults when items change', () => {
      const results = new Map<number, BatchValidationResult>();
      results.set(1, { row: 1, success: true, decodedContent: 'test', contentMatch: true, error: null });
      useBatchStore.getState().setValidationResults(results);

      useBatchStore.getState().setItems([
        { row: 1, content: 'new', qrType: 'text', label: null },
      ]);

      expect(useBatchStore.getState().validationResults.size).toBe(0);
    });
  });

  describe('setItemsWithStatus', () => {
    it('updates itemsWithStatus directly', () => {
      const itemsWithStatus: BatchItemWithStatus[] = [
        { row: 1, content: 'test', qrType: 'text', label: null, status: 'done', imageData: 'data:...' },
      ];

      useBatchStore.getState().setItemsWithStatus(itemsWithStatus);

      expect(useBatchStore.getState().itemsWithStatus).toEqual(itemsWithStatus);
    });
  });

  describe('updateItemStatus', () => {
    it('updates a single item status', () => {
      useBatchStore.getState().setItems([
        { row: 1, content: 'test1', qrType: 'text', label: null },
        { row: 2, content: 'test2', qrType: 'text', label: null },
      ]);

      useBatchStore.getState().updateItemStatus(0, { status: 'generating' });

      const state = useBatchStore.getState();
      expect(state.itemsWithStatus[0].status).toBe('generating');
      expect(state.itemsWithStatus[1].status).toBe('pending');
    });

    it('can update multiple fields at once', () => {
      useBatchStore.getState().setItems([
        { row: 1, content: 'test', qrType: 'text', label: null },
      ]);

      useBatchStore.getState().updateItemStatus(0, {
        status: 'done',
        imageData: 'data:image/png;base64,abc',
      });

      const item = useBatchStore.getState().itemsWithStatus[0];
      expect(item.status).toBe('done');
      expect(item.imageData).toBe('data:image/png;base64,abc');
    });

    it('can set error state', () => {
      useBatchStore.getState().setItems([
        { row: 1, content: 'test', qrType: 'text', label: null },
      ]);

      useBatchStore.getState().updateItemStatus(0, {
        status: 'error',
        error: 'Failed to generate',
      });

      const item = useBatchStore.getState().itemsWithStatus[0];
      expect(item.status).toBe('error');
      expect(item.error).toBe('Failed to generate');
    });
  });

  describe('setGeneratedItems', () => {
    it('sets generated items', () => {
      const generated = [
        { row: 1, content: 'test', label: 'Label', imageData: 'data:...' },
      ];

      useBatchStore.getState().setGeneratedItems(generated);

      expect(useBatchStore.getState().generatedItems).toEqual(generated);
    });
  });

  describe('setValidationResults', () => {
    it('sets validation results map', () => {
      const results = new Map<number, BatchValidationResult>();
      results.set(1, { row: 1, success: true, decodedContent: 'test', contentMatch: true, error: null });
      results.set(2, { row: 2, success: false, decodedContent: null, contentMatch: false, error: 'No QR found' });

      useBatchStore.getState().setValidationResults(results);

      const state = useBatchStore.getState();
      expect(state.validationResults.size).toBe(2);
      expect(state.validationResults.get(1)?.success).toBe(true);
      expect(state.validationResults.get(2)?.success).toBe(false);
    });
  });

  describe('UI state setters', () => {
    it('setParseError updates parse error', () => {
      useBatchStore.getState().setParseError('Missing content column');
      expect(useBatchStore.getState().parseError).toBe('Missing content column');

      useBatchStore.getState().setParseError(null);
      expect(useBatchStore.getState().parseError).toBeNull();
    });

    it('setIsParsing updates parsing state', () => {
      useBatchStore.getState().setIsParsing(true);
      expect(useBatchStore.getState().isParsing).toBe(true);

      useBatchStore.getState().setIsParsing(false);
      expect(useBatchStore.getState().isParsing).toBe(false);
    });

    it('setIsGenerating updates generating state', () => {
      useBatchStore.getState().setIsGenerating(true);
      expect(useBatchStore.getState().isGenerating).toBe(true);
    });

    it('setIsValidating updates validating state', () => {
      useBatchStore.getState().setIsValidating(true);
      expect(useBatchStore.getState().isValidating).toBe(true);
    });

    it('setIsLoading updates loading state', () => {
      useBatchStore.getState().setIsLoading(true);
      expect(useBatchStore.getState().isLoading).toBe(true);
    });

    it('setGenerateProgress updates progress', () => {
      useBatchStore.getState().setGenerateProgress(50);
      expect(useBatchStore.getState().generateProgress).toBe(50);

      useBatchStore.getState().setGenerateProgress(100);
      expect(useBatchStore.getState().generateProgress).toBe(100);
    });
  });

  describe('preview navigation', () => {
    it('setPreviewIndex updates preview index', () => {
      useBatchStore.getState().setPreviewIndex(3);
      expect(useBatchStore.getState().previewIndex).toBe(3);
    });

    it('preview index persists across other state changes', () => {
      useBatchStore.getState().setItems([
        { row: 1, content: 'test1', qrType: 'text', label: null },
        { row: 2, content: 'test2', qrType: 'text', label: null },
        { row: 3, content: 'test3', qrType: 'text', label: null },
      ]);
      useBatchStore.getState().setPreviewIndex(2);

      // Update other state
      useBatchStore.getState().setIsGenerating(true);
      useBatchStore.getState().setGenerateProgress(50);

      // Preview index should be preserved
      expect(useBatchStore.getState().previewIndex).toBe(2);
    });
  });

  describe('export format', () => {
    it('setExportFormat updates format', () => {
      expect(useBatchStore.getState().exportFormat).toBe('png');

      useBatchStore.getState().setExportFormat('svg');
      expect(useBatchStore.getState().exportFormat).toBe('svg');

      useBatchStore.getState().setExportFormat('png');
      expect(useBatchStore.getState().exportFormat).toBe('png');
    });

    it('export format persists across tab switches (simulated)', () => {
      useBatchStore.getState().setExportFormat('svg');

      // Simulate other operations that might happen during tab switches
      useBatchStore.getState().setIsLoading(true);
      useBatchStore.getState().setIsLoading(false);

      expect(useBatchStore.getState().exportFormat).toBe('svg');
    });
  });

  describe('clear', () => {
    it('resets all state to defaults', () => {
      // Set various state values
      useBatchStore.getState().setItems([
        { row: 1, content: 'test', qrType: 'text', label: null },
      ]);
      useBatchStore.getState().setGeneratedItems([
        { row: 1, content: 'test', label: null, imageData: 'data:...' },
      ]);
      const results = new Map<number, BatchValidationResult>();
      results.set(1, { row: 1, success: true, decodedContent: 'test', contentMatch: true, error: null });
      useBatchStore.getState().setValidationResults(results);
      useBatchStore.getState().setParseError('Some error');
      useBatchStore.getState().setIsParsing(true);
      useBatchStore.getState().setIsGenerating(true);
      useBatchStore.getState().setIsValidating(true);
      useBatchStore.getState().setIsLoading(true);
      useBatchStore.getState().setGenerateProgress(75);
      useBatchStore.getState().setPreviewIndex(5);

      // Clear
      useBatchStore.getState().clear();

      // Verify defaults
      const state = useBatchStore.getState();
      expect(state.items).toEqual([]);
      expect(state.itemsWithStatus).toEqual([]);
      expect(state.generatedItems).toEqual([]);
      expect(state.validationResults.size).toBe(0);
      expect(state.parseError).toBeNull();
      expect(state.isParsing).toBe(false);
      expect(state.isGenerating).toBe(false);
      expect(state.isValidating).toBe(false);
      expect(state.isLoading).toBe(false);
      expect(state.generateProgress).toBe(0);
      expect(state.previewIndex).toBe(0);
    });

    it('preserves exportFormat after clear', () => {
      useBatchStore.getState().setExportFormat('svg');
      useBatchStore.getState().clear();

      // Note: Based on the implementation, clear() doesn't reset exportFormat
      // This test documents that behavior
      expect(useBatchStore.getState().exportFormat).toBe('svg');
    });
  });

  describe('state persistence across operations', () => {
    it('maintains items state when updating statuses', () => {
      const items: BatchItem[] = [
        { row: 1, content: 'https://example.com', qrType: 'url', label: 'Example' },
        { row: 2, content: 'tel:+15551234567', qrType: 'phone', label: 'Phone' },
      ];

      useBatchStore.getState().setItems(items);
      useBatchStore.getState().updateItemStatus(0, { status: 'generating' });
      useBatchStore.getState().updateItemStatus(0, { status: 'done', imageData: 'data:...' });
      useBatchStore.getState().updateItemStatus(1, { status: 'generating' });

      // Original items should be unchanged
      expect(useBatchStore.getState().items).toEqual(items);
      // But itemsWithStatus should reflect updates
      expect(useBatchStore.getState().itemsWithStatus[0].status).toBe('done');
      expect(useBatchStore.getState().itemsWithStatus[1].status).toBe('generating');
    });

    it('handles validation state transitions', () => {
      useBatchStore.getState().setItems([
        { row: 1, content: 'test', qrType: 'text', label: null },
      ]);

      // Simulate generation -> validation flow
      useBatchStore.getState().updateItemStatus(0, { status: 'generating' });
      expect(useBatchStore.getState().itemsWithStatus[0].status).toBe('generating');

      useBatchStore.getState().updateItemStatus(0, { status: 'done', imageData: 'data:...' });
      expect(useBatchStore.getState().itemsWithStatus[0].status).toBe('done');

      useBatchStore.getState().setItemsWithStatus([
        { ...useBatchStore.getState().itemsWithStatus[0], status: 'validating' },
      ]);
      expect(useBatchStore.getState().itemsWithStatus[0].status).toBe('validating');

      useBatchStore.getState().setItemsWithStatus([
        { ...useBatchStore.getState().itemsWithStatus[0], status: 'validated' },
      ]);
      expect(useBatchStore.getState().itemsWithStatus[0].status).toBe('validated');
    });
  });
});
