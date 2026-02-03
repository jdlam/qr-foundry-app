import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useQrGenerator } from './useQrGenerator';
import { useQrStore } from '../stores/qrStore';
import type { Options } from 'qr-code-styling';

// Mock QRCodeStyling
const mockQRCodeStyling = vi.fn().mockImplementation((options: Options) => ({
  append: vi.fn(),
  update: vi.fn(),
  getRawData: vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' })),
  download: vi.fn().mockResolvedValue(undefined),
  _options: options, // Store options for testing
}));

vi.mock('qr-code-styling', () => ({
  default: class MockQRCodeStyling {
    _options: Options;
    constructor(options: Options) {
      this._options = options;
      mockQRCodeStyling(options);
    }
    append = vi.fn();
    update = vi.fn();
    getRawData = vi.fn().mockResolvedValue(new Blob(['test'], { type: 'image/png' }));
    download = vi.fn().mockResolvedValue(undefined);
  },
}));

describe('useQrGenerator', () => {
  beforeEach(() => {
    useQrStore.getState().reset();
    mockQRCodeStyling.mockClear();
  });

  describe('transparent background', () => {
    it('sets backgroundOptions.color to "transparent" when transparentBg is true', () => {
      useQrStore.getState().setTransparentBg(true);
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      // Get the options passed to QRCodeStyling
      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.backgroundOptions).toBeDefined();
      expect(options.backgroundOptions?.color).toBe('transparent');
    });

    it('sets backgroundOptions.color to background color when transparentBg is false', () => {
      useQrStore.getState().setTransparentBg(false);
      useQrStore.getState().setBackground('#ff0000');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      // Get the options passed to QRCodeStyling
      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.backgroundOptions).toBeDefined();
      expect(options.backgroundOptions?.color).toBe('#ff0000');
    });

    it('uses default background color when transparentBg is false and no custom color set', () => {
      useQrStore.getState().setTransparentBg(false);
      // Don't set a custom background, use default (#ffffff)
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.backgroundOptions).toBeDefined();
      expect(options.backgroundOptions?.color).toBe('#ffffff');
    });
  });

  describe('QR code options', () => {
    it('applies dot style from store', () => {
      useQrStore.getState().setDotStyle('dots');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.dotsOptions?.type).toBe('dots');
    });

    it('applies foreground color from store', () => {
      useQrStore.getState().setForeground('#123456');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.dotsOptions?.color).toBe('#123456');
    });

    it('applies error correction level from store', () => {
      useQrStore.getState().setErrorCorrection('H');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.qrOptions?.errorCorrectionLevel).toBe('H');
    });

    it('applies gradient when useGradient is true', () => {
      useQrStore.getState().setUseGradient(true);
      useQrStore.getState().setGradient({
        type: 'linear',
        rotation: 45,
        colorStops: [
          { offset: 0, color: '#ff0000' },
          { offset: 1, color: '#0000ff' },
        ],
      });
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.dotsOptions?.gradient).toBeDefined();
      expect(options.dotsOptions?.gradient?.type).toBe('linear');
      expect(options.dotsOptions?.gradient?.rotation).toBe(45);
    });

    it('does not apply gradient when useGradient is false', () => {
      useQrStore.getState().setUseGradient(false);
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.dotsOptions?.gradient).toBeUndefined();
    });

    it('applies logo when logo is set', () => {
      useQrStore.getState().setLogo({
        src: 'data:image/png;base64,test',
        size: 30,
        margin: 5,
        shape: 'square',
      });
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.image).toBe('data:image/png;base64,test');
      expect(options.imageOptions?.imageSize).toBe(0.3); // 30 / 100
      expect(options.imageOptions?.margin).toBe(5);
    });
  });

  describe('corner styles', () => {
    it('applies corner square style from store', () => {
      useQrStore.getState().setCornerSquareStyle('dot');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.cornersSquareOptions?.type).toBe('dot');
    });

    it('applies corner dot style from store', () => {
      useQrStore.getState().setCornerDotStyle('square');
      useQrStore.getState().setContent('https://example.com');

      const containerRef = { current: document.createElement('div') };
      renderHook(() => useQrGenerator(containerRef));

      const lastCall = mockQRCodeStyling.mock.calls[mockQRCodeStyling.mock.calls.length - 1];
      const options = lastCall[0] as Options;

      expect(options.cornersDotOptions?.type).toBe('square');
    });
  });
});
