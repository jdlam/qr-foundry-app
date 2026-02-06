import type { ExportAdapter, ExportResult } from '../types';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exportAdapter: ExportAdapter = {
  async exportPng(imageDataUrl: string, suggestedName = 'qr-code.png'): Promise<ExportResult> {
    try {
      const response = await fetch(imageDataUrl);
      const blob = await response.blob();
      downloadBlob(blob, suggestedName);
      return { success: true, path: suggestedName, error: null };
    } catch (error) {
      return { success: false, path: null, error: `Export failed: ${error}` };
    }
  },

  async exportSvg(svgData: string, suggestedName = 'qr-code.svg'): Promise<ExportResult> {
    try {
      const blob = new Blob([svgData], { type: 'image/svg+xml' });
      downloadBlob(blob, suggestedName);
      return { success: true, path: suggestedName, error: null };
    } catch (error) {
      return { success: false, path: null, error: `Export failed: ${error}` };
    }
  },
};
