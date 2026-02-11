import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Preview } from './Preview';
import { useQrStore } from '../../stores/qrStore';

// Mock the hooks that use platform adapters
const mockSvgBlob = {
  text: vi.fn().mockResolvedValue('<svg></svg>'),
  type: 'image/svg+xml',
};
const mockGetBlob = vi.fn().mockResolvedValue(mockSvgBlob);

vi.mock('../../hooks/useQrGenerator', () => ({
  useQrGenerator: () => ({
    getDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,test'),
    getValidationDataUrl: vi.fn().mockResolvedValue('data:image/png;base64,test'),
    getBlob: mockGetBlob,
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

// Mock sonner toast
const mockToast = vi.fn();
vi.mock('sonner', () => ({
  toast: Object.assign((...args: unknown[]) => mockToast(...args), {
    success: vi.fn(),
    error: vi.fn(),
  }),
}));

describe('Preview', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
    mockToast.mockReset();
  });

  describe('transparent background', () => {
    it('shows checkerboard pattern when transparent background is enabled', () => {
      useQrStore.getState().setTransparentBg(true);
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      // Find the container div that holds the QR code (now 280px)
      const container = document.querySelector('.w-\\[280px\\].h-\\[280px\\]');
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

      // Find the container div that holds the QR code (now 280px)
      const container = document.querySelector('.w-\\[280px\\].h-\\[280px\\]');
      expect(container).toBeDefined();

      // Check that no inline style contains checkerboard
      const style = container?.getAttribute('style');
      const hasCheckerboard = style ? style.includes('linear-gradient') : false;
      expect(hasCheckerboard).toBe(false);
    });
  });

  describe('export info', () => {
    it('displays export size in dropdown', () => {
      useQrStore.getState().setExportSize(1024);
      render(<Preview />);

      // Size is now a select dropdown
      expect(screen.getByText('Size')).toBeInTheDocument();
      const select = screen.getByDisplayValue('1024px');
      expect(select).toBeInTheDocument();
    });

    it('displays error correction level', () => {
      useQrStore.getState().setErrorCorrection('H');
      render(<Preview />);

      expect(screen.getByText(/H \(30%\)/)).toBeInTheDocument();
    });

    it('displays input type', () => {
      useQrStore.getState().setInputType('wifi');
      render(<Preview />);

      expect(screen.getByText('WIFI')).toBeInTheDocument();
    });
  });

  describe('export buttons', () => {
    it('renders Copy, PNG, and SVG buttons without PRO badges', () => {
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.getByText('PNG')).toBeInTheDocument();
      expect(screen.getByText('SVG')).toBeInTheDocument();
      expect(screen.queryByText('PRO')).not.toBeInTheDocument();
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

    it('SVG export works without gating', () => {
      useQrStore.getState().setContent('https://example.com');
      render(<Preview />);

      fireEvent.click(screen.getByText('SVG').closest('button')!);

      // Should not show any toast or auth modal — SVG is free
      expect(mockToast).not.toHaveBeenCalled();
    });
  });

  describe('size selector', () => {
    it('renders size options in dropdown', () => {
      render(<Preview />);

      // Size is now a select with option elements
      const select = document.querySelector('select');
      expect(select).toBeDefined();
      const options = select?.querySelectorAll('option');
      const values = Array.from(options || []).map((o) => o.textContent);
      expect(values).toContain('512px');
      expect(values).toContain('1024px');
      expect(values).toContain('2048px');
      expect(values).toContain('4096px');
    });
  });
});
