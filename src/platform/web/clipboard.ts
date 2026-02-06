import type { ClipboardAdapter } from '../types';

export const clipboardAdapter: ClipboardAdapter = {
  async copyImage(imageDataUrl: string): Promise<boolean> {
    const response = await fetch(imageDataUrl);
    const blob = await response.blob();
    // Ensure we use image/png for clipboard compatibility
    const pngBlob = blob.type === 'image/png' ? blob : new Blob([blob], { type: 'image/png' });
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
    return true;
  },
};
