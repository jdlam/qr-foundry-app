import { useCallback, useState } from 'react';
import { exportAdapter, clipboardAdapter, filesystemAdapter } from '@platform';
import type { ExportResult } from '../platform/types';

export type { ExportResult };

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [lastExportPath, setLastExportPath] = useState<string | null>(null);

  const exportPng = useCallback(
    async (imageDataUrl: string, suggestedName?: string): Promise<ExportResult> => {
      setIsExporting(true);
      try {
        const result = await exportAdapter.exportPng(imageDataUrl, suggestedName);

        if (result.success && result.path) {
          setLastExportPath(result.path);
        }

        return result;
      } catch (error) {
        console.error('Export error:', error);
        return {
          success: false,
          path: null,
          error: `Export failed: ${error}`,
        };
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const exportSvg = useCallback(
    async (svgData: string, suggestedName?: string): Promise<ExportResult> => {
      setIsExporting(true);
      try {
        const result = await exportAdapter.exportSvg(svgData, suggestedName);

        if (result.success && result.path) {
          setLastExportPath(result.path);
        }

        return result;
      } catch (error) {
        console.error('Export error:', error);
        return {
          success: false,
          path: null,
          error: `Export failed: ${error}`,
        };
      } finally {
        setIsExporting(false);
      }
    },
    []
  );

  const copyToClipboard = useCallback(async (imageDataUrl: string): Promise<boolean> => {
    try {
      await clipboardAdapter.copyImage(imageDataUrl);
      return true;
    } catch (error) {
      console.error('Copy to clipboard error:', error);
      return false;
    }
  }, []);

  const pickImageFile = useCallback(async (): Promise<string | null> => {
    try {
      const result = await filesystemAdapter.pickImageFile();
      return result;
    } catch (error) {
      console.error('Pick file error:', error);
      return null;
    }
  }, []);

  return {
    exportPng,
    exportSvg,
    copyToClipboard,
    pickImageFile,
    isExporting,
    lastExportPath,
  };
}
