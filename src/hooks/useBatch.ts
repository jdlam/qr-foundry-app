import { useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import {
  useBatchStore,
  type BatchItem,
  type BatchGenerateItem,
  type BatchValidationResult,
} from '../stores/batchStore';

// Re-export types for convenience
export type { BatchItem, BatchGenerateItem, BatchValidationResult };

interface BatchParseResult {
  success: boolean;
  items: BatchItem[];
  error: string | null;
  totalRows: number;
}

interface BatchGenerateResult {
  success: boolean;
  zipPath: string | null;
  validationResults: BatchValidationResult[];
  error: string | null;
}

interface BatchSaveFilesResult {
  success: boolean;
  directory: string | null;
  filesSaved: number;
  error: string | null;
}

export function useBatch() {
  const {
    items,
    isLoading,
    isParsing,
    isGenerating,
    parseError,
    validationResults,
    setItems,
    setIsParsing,
    setIsGenerating,
    setIsLoading,
    setParseError,
    setValidationResults,
    clear,
  } = useBatchStore();

  const parseCsvFile = useCallback(async (filePath: string): Promise<boolean> => {
    console.log('[useBatch] parseCsvFile called with:', filePath);
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await invoke<BatchParseResult>('batch_parse_csv', { filePath });
      console.log('[useBatch] parseCsvFile result:', result);
      if (result.success) {
        setItems(result.items);
        return true;
      } else {
        setParseError(result.error || 'Failed to parse CSV');
        return false;
      }
    } catch (error) {
      console.error('[useBatch] parseCsvFile error:', error);
      setParseError(`Failed to parse CSV: ${error}`);
      return false;
    } finally {
      setIsParsing(false);
    }
  }, [setIsParsing, setParseError, setItems]);

  const parseCsvContent = useCallback(async (content: string): Promise<boolean> => {
    console.log('[useBatch] parseCsvContent called, content length:', content.length);
    setIsParsing(true);
    setParseError(null);
    try {
      const result = await invoke<BatchParseResult>('batch_parse_csv_content', { content });
      console.log('[useBatch] parseCsvContent result:', result);
      if (result.success) {
        setItems(result.items);
        return true;
      } else {
        setParseError(result.error || 'Failed to parse CSV');
        return false;
      }
    } catch (error) {
      console.error('[useBatch] parseCsvContent error:', error);
      setParseError(`Failed to parse CSV: ${error}`);
      return false;
    } finally {
      setIsParsing(false);
    }
  }, [setIsParsing, setParseError, setItems]);

  const pickCsvFile = useCallback(async (): Promise<string | null> => {
    try {
      const result = await invoke<string | null>('pick_csv_file');
      return result;
    } catch (error) {
      console.error('Failed to pick CSV file:', error);
      return null;
    }
  }, []);

  const validateBatch = useCallback(
    async (generatedItems: BatchGenerateItem[]): Promise<BatchValidationResult[]> => {
      setIsLoading(true);
      try {
        const results = await invoke<BatchValidationResult[]>('batch_validate', {
          items: generatedItems,
        });

        const resultsMap = new Map<number, BatchValidationResult>();
        results.forEach((r) => resultsMap.set(r.row, r));
        setValidationResults(resultsMap);

        return results;
      } catch (error) {
        console.error('Failed to validate batch:', error);
        return [];
      } finally {
        setIsLoading(false);
      }
    },
    [setIsLoading, setValidationResults]
  );

  const generateZip = useCallback(
    async (
      generatedItems: BatchGenerateItem[],
      format: 'png' | 'svg',
      validate: boolean
    ): Promise<BatchGenerateResult | null> => {
      setIsGenerating(true);
      try {
        const result = await invoke<BatchGenerateResult>('batch_generate_zip', {
          items: generatedItems,
          format,
          validate,
        });

        if (result.validationResults.length > 0) {
          const resultsMap = new Map<number, BatchValidationResult>();
          result.validationResults.forEach((r) => resultsMap.set(r.row, r));
          setValidationResults(resultsMap);
        }

        return result;
      } catch (error) {
        console.error('Failed to generate ZIP:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [setIsGenerating, setValidationResults]
  );

  const saveFiles = useCallback(
    async (
      generatedItems: BatchGenerateItem[],
      format: 'png' | 'svg',
      baseName: string = 'qr-code'
    ): Promise<BatchSaveFilesResult | null> => {
      setIsGenerating(true);
      try {
        const result = await invoke<BatchSaveFilesResult>('batch_save_files', {
          items: generatedItems,
          format,
          baseName,
        });
        return result;
      } catch (error) {
        console.error('Failed to save files:', error);
        return null;
      } finally {
        setIsGenerating(false);
      }
    },
    [setIsGenerating]
  );

  const clearBatch = useCallback(() => {
    clear();
  }, [clear]);

  return {
    items,
    isLoading,
    isParsing,
    isGenerating,
    parseError,
    validationResults,
    parseCsvFile,
    parseCsvContent,
    pickCsvFile,
    validateBatch,
    generateZip,
    saveFiles,
    clearBatch,
  };
}
