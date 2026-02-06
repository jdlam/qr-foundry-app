import { invoke } from '@tauri-apps/api/core';
import type { ExportAdapter, ExportResult } from '../types';

export const exportAdapter: ExportAdapter = {
  async exportPng(imageDataUrl: string, suggestedName = 'qr-code.png'): Promise<ExportResult> {
    return invoke<ExportResult>('export_png', {
      imageData: imageDataUrl,
      suggestedName,
    });
  },

  async exportSvg(svgData: string, suggestedName = 'qr-code.svg'): Promise<ExportResult> {
    return invoke<ExportResult>('export_svg', {
      svgData,
      suggestedName,
    });
  },
};
