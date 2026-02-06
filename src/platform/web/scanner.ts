import { decodeWithJsQr } from '../../lib/scanHelpers';
import type { ScannerAdapter, ScanResult, ValidationResult } from '../types';

export const scannerAdapter: ScannerAdapter = {
  async validateQr(imageDataUrl: string, expectedContent: string): Promise<ValidationResult> {
    const result = await decodeWithJsQr(imageDataUrl);

    if (!result.success || !result.content) {
      return {
        state: 'fail',
        decodedContent: null,
        contentMatch: false,
        message: result.error || 'No QR code detected in image',
        suggestions: ['Try increasing error correction level', 'Ensure the QR code is clearly visible'],
      };
    }

    const contentMatch = result.content === expectedContent;

    if (contentMatch) {
      return {
        state: 'pass',
        decodedContent: result.content,
        contentMatch: true,
        message: 'QR code scans correctly',
        suggestions: [],
      };
    }

    return {
      state: 'warn',
      decodedContent: result.content,
      contentMatch: false,
      message: 'QR code scans but content does not match',
      suggestions: ['The decoded content differs from expected'],
    };
  },

  async scanFromFile(filePath: string): Promise<ScanResult> {
    // On web, filePath is a data URL
    return decodeWithJsQr(filePath);
  },

  async scanFromData(imageData: string): Promise<ScanResult> {
    return decodeWithJsQr(imageData);
  },
};
