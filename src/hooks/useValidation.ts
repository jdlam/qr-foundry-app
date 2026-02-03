import { useCallback, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { readFile } from '@tauri-apps/plugin-fs';
import jsQR from 'jsqr';
import { useQrStore } from '../stores/qrStore';
import type { ValidationState } from '../types/qr';

// Helper to convert file data to data URL
async function fileToDataUrl(filePath: string): Promise<string> {
  const data = await readFile(filePath);
  const ext = filePath.toLowerCase().split('.').pop() || 'png';
  const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;
  const blob = new Blob([data], { type: mimeType });

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

interface ValidationResult {
  state: 'pass' | 'warn' | 'fail';
  decodedContent: string | null;
  contentMatch: boolean;
  message: string;
  suggestions: string[];
}

export function useValidation() {
  const [isValidating, setIsValidating] = useState(false);
  const [result, setResult] = useState<ValidationResult | null>(null);
  const { content, setValidationState } = useQrStore();

  const validate = useCallback(
    async (imageDataUrl: string): Promise<ValidationResult | null> => {
      if (!content) {
        setValidationState('fail');
        return null;
      }

      setIsValidating(true);
      setValidationState('validating');

      try {
        const result = await invoke<ValidationResult>('validate_qr', {
          imageData: imageDataUrl,
          expectedContent: content,
        });

        setResult(result);
        setValidationState(result.state as ValidationState);
        return result;
      } catch (error) {
        console.error('Validation error:', error);
        setValidationState('fail');
        setResult({
          state: 'fail',
          decodedContent: null,
          contentMatch: false,
          message: `Validation error: ${error}`,
          suggestions: ['Try generating the QR code again'],
        });
        return null;
      } finally {
        setIsValidating(false);
      }
    },
    [content, setValidationState]
  );

  const resetValidation = useCallback(() => {
    setResult(null);
    setValidationState('idle');
  }, [setValidationState]);

  return {
    validate,
    isValidating,
    result,
    resetValidation,
  };
}

interface ScanResult {
  success: boolean;
  content: string | null;
  qrType: string | null;
  error: string | null;
}

// Helper to decode QR using jsqr (JavaScript fallback)
async function decodeWithJsQr(imageData: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      // Create canvas and draw image
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve({
          success: false,
          content: null,
          qrType: null,
          error: 'Failed to create canvas context',
        });
        return;
      }

      // Draw with white background to handle transparency
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);

      // Get image data and decode
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imgData.data, imgData.width, imgData.height);

      if (code) {
        resolve({
          success: true,
          content: code.data,
          qrType: detectQrType(code.data),
          error: null,
        });
      } else {
        resolve({
          success: false,
          content: null,
          qrType: null,
          error: 'No QR code found in image',
        });
      }
    };
    img.onerror = () => {
      resolve({
        success: false,
        content: null,
        qrType: null,
        error: 'Failed to load image',
      });
    };
    img.src = imageData;
  });
}

// Helper to detect QR type from content
function detectQrType(content: string): string {
  const lower = content.toLowerCase();

  if (lower.startsWith('wifi:')) return 'wifi';
  if (lower.startsWith('begin:vcard')) return 'vcard';
  if (lower.startsWith('mailto:')) return 'email';
  if (lower.startsWith('sms:') || lower.startsWith('smsto:')) return 'sms';
  if (lower.startsWith('tel:')) return 'phone';
  if (lower.startsWith('geo:')) return 'geo';
  if (lower.startsWith('begin:vevent')) return 'calendar';
  if (lower.startsWith('http://') || lower.startsWith('https://')) return 'url';

  return 'text';
}

export function useScanQr() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);

  const scanFromFile = useCallback(async (filePath: string): Promise<ScanResult | null> => {
    setIsScanning(true);
    try {
      // Try Rust decoder first
      const result = await invoke<ScanResult>('scan_qr_from_file', { filePath });

      // If Rust decoder failed, try jsqr as fallback (better with styled QR codes)
      if (!result.success) {
        console.log('Rust decoder failed, trying jsqr fallback...');
        try {
          const imageData = await fileToDataUrl(filePath);
          const jsqrResult = await decodeWithJsQr(imageData);
          if (jsqrResult.success) {
            setScanResult(jsqrResult);
            return jsqrResult;
          }
        } catch (fallbackError) {
          console.error('jsqr fallback failed:', fallbackError);
        }
      }

      setScanResult(result);
      return result;
    } catch (error) {
      console.error('Scan error:', error);

      // Try jsqr fallback on error
      console.log('Rust decoder error, trying jsqr fallback...');
      try {
        const imageData = await fileToDataUrl(filePath);
        const jsqrResult = await decodeWithJsQr(imageData);
        if (jsqrResult.success) {
          setScanResult(jsqrResult);
          return jsqrResult;
        }
      } catch (fallbackError) {
        console.error('jsqr fallback failed:', fallbackError);
      }

      setScanResult({
        success: false,
        content: null,
        qrType: null,
        error: `Scan error: ${error}`,
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const scanFromData = useCallback(async (imageData: string): Promise<ScanResult | null> => {
    setIsScanning(true);
    try {
      // Try Rust decoder first
      const result = await invoke<ScanResult>('scan_qr_from_data', { imageData });

      // If Rust decoder failed, try jsqr as fallback (better with styled QR codes)
      if (!result.success) {
        console.log('Rust decoder failed, trying jsqr fallback...');
        const jsqrResult = await decodeWithJsQr(imageData);
        if (jsqrResult.success) {
          setScanResult(jsqrResult);
          return jsqrResult;
        }
      }

      setScanResult(result);
      return result;
    } catch (error) {
      console.error('Scan error:', error);

      // Try jsqr fallback on error
      console.log('Rust decoder error, trying jsqr fallback...');
      const jsqrResult = await decodeWithJsQr(imageData);
      if (jsqrResult.success) {
        setScanResult(jsqrResult);
        return jsqrResult;
      }

      setScanResult({
        success: false,
        content: null,
        qrType: null,
        error: `Scan error: ${error}`,
      });
      return null;
    } finally {
      setIsScanning(false);
    }
  }, []);

  const clearScan = useCallback(() => {
    setScanResult(null);
  }, []);

  return {
    scanFromFile,
    scanFromData,
    isScanning,
    scanResult,
    clearScan,
  };
}
