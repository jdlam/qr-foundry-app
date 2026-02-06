import { decodeWithJsQr, detectQrType } from '../../lib/scanHelpers';
import type {
  BatchAdapter,
  BatchParseResult,
  BatchGenerateItem,
  BatchValidationResult,
  BatchGenerateResult,
  BatchSaveFilesResult,
  BatchItem,
} from '../types';

// Simple CSV parser that handles quoted fields
function parseCsvLines(text: string): string[][] {
  const lines: string[][] = [];
  let current = '';
  let inQuotes = false;
  const row: string[] = [];

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < text.length && text[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(current.trim());
      current = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && i + 1 < text.length && text[i + 1] === '\n') {
        i++; // skip \r\n
      }
      row.push(current.trim());
      if (row.some((cell) => cell !== '')) {
        lines.push([...row]);
      }
      row.length = 0;
      current = '';
    } else {
      current += ch;
    }
  }

  // Last row
  row.push(current.trim());
  if (row.some((cell) => cell !== '')) {
    lines.push([...row]);
  }

  return lines;
}

function parseCsvToItems(text: string): BatchParseResult {
  const lines = parseCsvLines(text);
  if (lines.length < 2) {
    return { success: false, items: [], error: 'CSV must have a header row and at least one data row', totalRows: 0 };
  }

  const header = lines[0].map((h) => h.toLowerCase());
  const contentIdx = header.indexOf('content');
  if (contentIdx === -1) {
    return { success: false, items: [], error: 'CSV must have a "content" column', totalRows: 0 };
  }

  const typeIdx = header.indexOf('type');
  const labelIdx = header.indexOf('label');

  const items: BatchItem[] = [];
  for (let i = 1; i < lines.length; i++) {
    const row = lines[i];
    const content = row[contentIdx] || '';
    if (!content) continue;

    const qrType = typeIdx >= 0 && row[typeIdx] ? row[typeIdx].toLowerCase() : detectQrType(content);
    const label = labelIdx >= 0 ? row[labelIdx] || null : null;

    items.push({
      row: i,
      content,
      qrType,
      label,
    });
  }

  if (items.length === 0) {
    return { success: false, items: [], error: 'No valid rows found', totalRows: 0 };
  }

  return { success: true, items, error: null, totalRows: items.length };
}

export const batchAdapter: BatchAdapter = {
  async parseCsvFile(_filePath: string): Promise<BatchParseResult> {
    // On web, filePath is actually the CSV text content (from filesystemAdapter.pickCsvFile)
    return parseCsvToItems(_filePath);
  },

  async parseCsvContent(content: string): Promise<BatchParseResult> {
    return parseCsvToItems(content);
  },

  async validateBatch(items: BatchGenerateItem[]): Promise<BatchValidationResult[]> {
    const results: BatchValidationResult[] = [];

    for (const item of items) {
      const scanResult = await decodeWithJsQr(item.imageData);
      results.push({
        row: item.row,
        success: scanResult.success,
        decodedContent: scanResult.content,
        contentMatch: scanResult.content === item.content,
        error: scanResult.error,
      });
    }

    return results;
  },

  async generateZip(): Promise<BatchGenerateResult> {
    return {
      success: false,
      zipPath: null,
      validationResults: [],
      error: 'ZIP export is not available in the web version. Use individual downloads instead.',
    };
  },

  async saveFiles(): Promise<BatchSaveFilesResult> {
    return {
      success: false,
      directory: null,
      filesSaved: 0,
      error: 'Batch save to directory is not available in the web version. Use individual downloads instead.',
    };
  },
};
