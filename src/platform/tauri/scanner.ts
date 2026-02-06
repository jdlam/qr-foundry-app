import { invoke } from '@tauri-apps/api/core';
import { decodeWithJsQr, fileDataToDataUrl } from '../../lib/scanHelpers';
import { filesystemAdapter } from './filesystem';
import type { ScannerAdapter, ScanResult, ValidationResult } from '../types';

export const scannerAdapter: ScannerAdapter = {
  async validateQr(imageDataUrl: string, expectedContent: string): Promise<ValidationResult> {
    return invoke<ValidationResult>('validate_qr', {
      imageData: imageDataUrl,
      expectedContent,
    });
  },

  async scanFromFile(filePath: string): Promise<ScanResult> {
    try {
      // Try Rust decoder first
      const result = await invoke<ScanResult>('scan_qr_from_file', { filePath });

      // If Rust decoder failed, try jsqr as fallback (better with styled QR codes)
      if (!result.success) {
        console.log('Rust decoder failed, trying jsqr fallback...');
        try {
          const data = await filesystemAdapter.readFile(filePath);
          const imageData = await fileDataToDataUrl(data, filePath);
          const jsqrResult = await decodeWithJsQr(imageData);
          if (jsqrResult.success) {
            return jsqrResult;
          }
        } catch (fallbackError) {
          console.error('jsqr fallback failed:', fallbackError);
        }
      }

      return result;
    } catch (error) {
      console.error('Scan error:', error);

      // Try jsqr fallback on error
      console.log('Rust decoder error, trying jsqr fallback...');
      try {
        const data = await filesystemAdapter.readFile(filePath);
        const imageData = await fileDataToDataUrl(data, filePath);
        const jsqrResult = await decodeWithJsQr(imageData);
        if (jsqrResult.success) {
          return jsqrResult;
        }
      } catch (fallbackError) {
        console.error('jsqr fallback failed:', fallbackError);
      }

      return {
        success: false,
        content: null,
        qrType: null,
        error: `Scan error: ${error}`,
      };
    }
  },

  async scanFromData(imageData: string): Promise<ScanResult> {
    try {
      // Try Rust decoder first
      const result = await invoke<ScanResult>('scan_qr_from_data', { imageData });

      // If Rust decoder failed, try jsqr as fallback (better with styled QR codes)
      if (!result.success) {
        console.log('Rust decoder failed, trying jsqr fallback...');
        const jsqrResult = await decodeWithJsQr(imageData);
        if (jsqrResult.success) {
          return jsqrResult;
        }
      }

      return result;
    } catch (error) {
      console.error('Scan error:', error);

      // Try jsqr fallback on error
      console.log('Rust decoder error, trying jsqr fallback...');
      const jsqrResult = await decodeWithJsQr(imageData);
      if (jsqrResult.success) {
        return jsqrResult;
      }

      return {
        success: false,
        content: null,
        qrType: null,
        error: `Scan error: ${error}`,
      };
    }
  },
};
