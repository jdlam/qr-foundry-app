import { invoke } from '@tauri-apps/api/core';
import type { ClipboardAdapter } from '../types';

export const clipboardAdapter: ClipboardAdapter = {
  async copyImage(imageDataUrl: string): Promise<boolean> {
    return invoke<boolean>('copy_image_to_clipboard', {
      imageData: imageDataUrl,
    });
  },
};
