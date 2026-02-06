import jsQR from 'jsqr';
import type { ScanResult } from '../platform/types';

// Decode a QR code from a data URL using jsQR (JavaScript-only, no native dependencies)
export function decodeWithJsQr(imageData: string): Promise<ScanResult> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
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

// Detect QR type from decoded content
export function detectQrType(content: string): string {
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

// Convert file data to a data URL
export function fileDataToDataUrl(data: Uint8Array, filePath: string): Promise<string> {
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
