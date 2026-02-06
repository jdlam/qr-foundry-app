import { invoke } from '@tauri-apps/api/core';
import type {
  BatchAdapter,
  BatchParseResult,
  BatchGenerateItem,
  BatchValidationResult,
  BatchGenerateResult,
  BatchSaveFilesResult,
} from '../types';

export const batchAdapter: BatchAdapter = {
  async parseCsvFile(filePath: string): Promise<BatchParseResult> {
    return invoke<BatchParseResult>('batch_parse_csv', { filePath });
  },

  async parseCsvContent(content: string): Promise<BatchParseResult> {
    return invoke<BatchParseResult>('batch_parse_csv_content', { content });
  },

  async validateBatch(items: BatchGenerateItem[]): Promise<BatchValidationResult[]> {
    return invoke<BatchValidationResult[]>('batch_validate', { items });
  },

  async generateZip(
    items: BatchGenerateItem[],
    format: 'png' | 'svg',
    validate: boolean,
  ): Promise<BatchGenerateResult> {
    return invoke<BatchGenerateResult>('batch_generate_zip', { items, format, validate });
  },

  async saveFiles(
    items: BatchGenerateItem[],
    format: 'png' | 'svg',
    baseName: string,
  ): Promise<BatchSaveFilesResult> {
    return invoke<BatchSaveFilesResult>('batch_save_files', { items, format, baseName });
  },
};
