import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Preview } from './Preview';
import { useQrStore } from '../../stores/qrStore';

// Mock all Tauri APIs
vi.mock('@tauri-apps/api/core', () => ({
  invoke: vi.fn(),
}));

vi.mock('@tauri-apps/plugin-dialog', () => ({
  save: vi.fn(),
}));

// Mock the hooks that use Tauri
vi.mock('../../hooks/useQrGenerator', () => ({
  useQrGenerator: () => ({
    getDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,test'),
    getValidationDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,test'),
    getBlob: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  }),
}));

vi.mock('../../hooks/useValidation', () => ({
  useValidation: () => ({
    validate: vi.fn(),
    isValidating: false,
    result: null,
  }),
}));

vi.mock('../../hooks/useExport', () => ({
  useExport: () => ({
    exportPng: vi.fn().mockResolvedValue({ success: true }),
    exportSvg: vi.fn().mockResolvedValue({ success: true }),
    copyToClipboard: vi.fn().mockResolvedValue(true),
    isExporting: false,
  }),
}));

describe('Preview', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
  });

  describe('transparent background', () => {
    it('shows checkerboard pattern when transparent background is enabled', () => {
      useQrStore.getState().setTransparentBg(true);
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      // Find the container div that holds the QR code
      const container = document.querySelector('.w-\\[300px\\].h-\\[300px\\]');
      expect(container).toBeDefined();

      // Check that the checkerboard style is applied
      const style = container?.getAttribute('style');
      expect(style).toContain('background-image');
      expect(style).toContain('linear-gradient');
    });

    it('does not show checkerboard pattern when transparent background is disabled', () => {
      useQrStore.getState().setTransparentBg(false);
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      // Find the container div that holds the QR code
      const container = document.querySelector('.w-\\[300px\\].h-\\[300px\\]');
      expect(container).toBeDefined();

      // Check that no inline style is applied (or style doesn't contain checkerboard)
      const style = container?.getAttribute('style');
      const hasCheckerboard = style ? style.includes('linear-gradient') : false;
      expect(hasCheckerboard).toBe(false);
    });
  });

  describe('export info', () => {
    it('displays export size', () => {
      useQrStore.getState().setExportSize(1024);
      render(<Preview />);

      expect(screen.getByText('Size: 1024×1024')).toBeInTheDocument();
    });

    it('displays error correction level', () => {
      useQrStore.getState().setErrorCorrection('H');
      render(<Preview />);

      expect(screen.getByText('EC: H (30%)')).toBeInTheDocument();
    });

    it('displays input type', () => {
      useQrStore.getState().setInputType('wifi');
      render(<Preview />);

      expect(screen.getByText('Type: WIFI')).toBeInTheDocument();
    });
  });

  describe('export buttons', () => {
    it('renders Copy, PNG, and SVG buttons', () => {
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('SVG')).toBeInTheDocument();
    });

    it('disables export buttons when no content', () => {
      useQrStore.getState().setContent('');
      render(<Preview />);

      const copyButton = screen.getByText('Copy').closest('button');
      const pngButton = screen.getByText('PNG').closest('button');
      const svgButton = screen.getByText('SVG').closest('button');

      expect(copyButton).toBeDisabled();
      expect(pngButton).toBeDisabled();
      expect(svgButton).toBeDisabled();
    });

    it('enables export buttons when content is present', () => {
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      const copyButton = screen.getByText('Copy').closest('button');
      const pngButton = screen.getByText('PNG').closest('button');
      const svgButton = screen.getByText('SVG').closest('button');

      expect(copyButton).not.toBeDisabled();
      expect(pngButton).not.toBeDisabled();
      expect(svgButton).not.toBeDisabled();
    });
  });

  describe('size selector', () => {
    it('renders size options', () => {
      render(<Preview />);

      expect(screen.getByText('512px')).toBeInTheDocument();
      expect(screen.getByText('1024px')).toBeInTheDocument();
      expect(screen.getByText('2048px')).toBeInTheDocument();
      expect(screen.getByText('4096px')).toBeInTheDocument();
    });
  });
});
