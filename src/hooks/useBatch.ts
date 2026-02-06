import { useCallback } from 'react';
import { batchAdapter, filesystemAdapter } from '@platform';
import {
  useBatchStore,
  type BatchItem,
  type BatchGenerateItem,
  type BatchValidationResult,
} from '../stores/batchStore';

// Re-export types for convenience
export type { BatchItem, BatchGenerateItem, BatchValidationResult };

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
      const result = await batchAdapter.parseCsvFile(filePath);
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
      const result = await batchAdapter.parseCsvContent(content);
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
      const result = await filesystemAdapter.pickCsvFile();
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
        const results = await batchAdapter.validateBatch(generatedItems);

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
    ) => {
      setIsGenerating(true);
      try {
        const result = await batchAdapter.generateZip(generatedItems, format, validate);

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
    ) => {
      setIsGenerating(true);
      try {
        const result = await batchAdapter.saveFiles(generatedItems, format, baseName);
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
