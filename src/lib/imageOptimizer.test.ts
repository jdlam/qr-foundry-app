import { describe, it, expect } from 'vitest';
import { optimizeImage, blobToDataUrl } from './imageOptimizer';

describe('optimizeImage', () => {
  it('returns SVG images unchanged', async () => {
    const svgDataUrl = 'data:image/svg+xml;base64,PHN2Zz4=';
    const result = await optimizeImage(svgDataUrl, 'image/svg+xml');

    expect(result.dataUrl).toBe(svgDataUrl);
    expect(result.wasResized).toBe(false);
    expect(result.wasTrimmed).toBe(false);
    expect(result.originalWidth).toBe(0);
    expect(result.originalHeight).toBe(0);
  });

  it('returns SVG with svg+xml mime type unchanged', async () => {
    const svgDataUrl = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjwvc3ZnPg==';
    const result = await optimizeImage(svgDataUrl, 'image/svg+xml');

    expect(result.dataUrl).toBe(svgDataUrl);
    expect(result.wasResized).toBe(false);
    expect(result.wasTrimmed).toBe(false);
  });
});

describe('blobToDataUrl', () => {
  it('converts blob to data URL', async () => {
    const blob = new Blob(['test content'], { type: 'text/plain' });
    const result = await blobToDataUrl(blob);

    expect(result).toMatch(/^data:text\/plain;base64,/);
  });

  it('handles image/png blobs', async () => {
    // Create a simple 1x1 PNG (smallest valid PNG)
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
      0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
      0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
      0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
      0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
      0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59,
      0xe7, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, // IEND chunk
      0x44, 0xae, 0x42, 0x60, 0x82,
    ]);
    const blob = new Blob([pngBytes], { type: 'image/png' });
    const result = await blobToDataUrl(blob);

    expect(result).toMatch(/^data:image\/png;base64,/);
  });

  it('handles image/jpeg blobs', async () => {
    const blob = new Blob([new Uint8Array([0xff, 0xd8, 0xff])], { type: 'image/jpeg' });
    const result = await blobToDataUrl(blob);

    expect(result).toMatch(/^data:image\/jpeg;base64,/);
  });

  it('preserves blob content in base64', async () => {
    const originalContent = 'Hello, World!';
    const blob = new Blob([originalContent], { type: 'text/plain' });
    const result = await blobToDataUrl(blob);

    // Decode the base64 part and verify
    const base64Part = result.split(',')[1];
    const decoded = atob(base64Part);
    expect(decoded).toBe(originalContent);
  });
});
