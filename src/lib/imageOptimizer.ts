/**
 * Image optimization utilities for logo processing.
 * - Auto-trims whitespace/transparent borders
 * - Resizes to fit within max dimensions
 * - Compresses to fit within size limits
 */

const MAX_LOGO_DIMENSION = 512; // Max width/height in pixels
const MAX_LOGO_SIZE_BYTES = 500 * 1024; // 500KB
const LOGO_CONTENT_FILL = 0.9; // After trimming, logo content should fill 90% of output

// Threshold for considering a pixel as "empty" (whitespace or transparent)
const ALPHA_THRESHOLD = 10; // Pixels with alpha < 10 are considered transparent
const WHITE_THRESHOLD = 240; // RGB values > 240 are considered white (lowered to catch off-white/JPEG artifacts)

interface BoundingBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
}

interface OptimizeResult {
  dataUrl: string;
  originalWidth: number;
  originalHeight: number;
  finalWidth: number;
  finalHeight: number;
  wasResized: boolean;
  wasTrimmed: boolean;
}

/**
 * Load an image from a data URL or blob URL
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
}

/**
 * Check if a pixel is considered "empty" (transparent or white)
 */
function isEmptyPixel(r: number, g: number, b: number, a: number): boolean {
  // Transparent pixel
  if (a < ALPHA_THRESHOLD) {
    return true;
  }
  // White or near-white pixel (only if mostly opaque)
  if (a > 200 && r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
    return true;
  }
  return false;
}

/**
 * Find the bounding box of non-empty content in an image.
 * This trims whitespace and transparent borders.
 */
function findContentBounds(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): BoundingBox {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let left = width;
  let top = height;
  let right = 0;
  let bottom = 0;

  // Scan all pixels to find content bounds
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const a = data[idx + 3];

      if (!isEmptyPixel(r, g, b, a)) {
        if (x < left) left = x;
        if (x > right) right = x;
        if (y < top) top = y;
        if (y > bottom) bottom = y;
      }
    }
  }

  // Handle case where image is entirely empty
  if (left > right || top > bottom) {
    return { left: 0, top: 0, right: width - 1, bottom: height - 1, width, height };
  }

  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

/**
 * Calculate output dimensions to fit within max size while maintaining aspect ratio
 */
function calculateOutputDimensions(
  width: number,
  height: number,
  maxDim: number
): { width: number; height: number } {
  if (width <= maxDim && height <= maxDim) {
    return { width, height };
  }

  const aspectRatio = width / height;

  if (aspectRatio >= 1) {
    // Wider than tall
    return {
      width: maxDim,
      height: Math.round(maxDim / aspectRatio),
    };
  } else {
    // Taller than wide
    return {
      width: Math.round(maxDim * aspectRatio),
      height: maxDim,
    };
  }
}

/**
 * Resize and compress an image to fit within size limits.
 * Auto-trims whitespace/transparent borders, scales content to fill 90% of original dimensions,
 * then resizes to fit within max dimensions.
 * Returns optimized data URL.
 */
export async function optimizeImage(
  dataUrl: string,
  mimeType: string
): Promise<OptimizeResult> {
  // SVGs don't need resizing - they're vector
  if (mimeType === 'image/svg+xml') {
    return {
      dataUrl,
      originalWidth: 0,
      originalHeight: 0,
      finalWidth: 0,
      finalHeight: 0,
      wasResized: false,
      wasTrimmed: false,
    };
  }

  const img = await loadImage(dataUrl);
  const originalWidth = img.width;
  const originalHeight = img.height;

  // Step 1: Draw image to temp canvas to analyze content bounds
  const tempCanvas = document.createElement('canvas');
  tempCanvas.width = originalWidth;
  tempCanvas.height = originalHeight;
  const tempCtx = tempCanvas.getContext('2d');
  if (!tempCtx) {
    throw new Error('Failed to get canvas context');
  }
  tempCtx.drawImage(img, 0, 0);

  // Step 2: Find content bounds (trim whitespace/transparency)
  const bounds = findContentBounds(tempCtx, originalWidth, originalHeight);
  const wasTrimmed =
    bounds.left > 0 ||
    bounds.top > 0 ||
    bounds.right < originalWidth - 1 ||
    bounds.bottom < originalHeight - 1;

  // Step 3: Calculate content size to fill 90% of original image dimensions
  // The content should be scaled to fill 90% of the smaller dimension
  const targetContentWidth = Math.round(originalWidth * LOGO_CONTENT_FILL);
  const targetContentHeight = Math.round(originalHeight * LOGO_CONTENT_FILL);

  // Maintain aspect ratio of the trimmed content
  const contentAspect = bounds.width / bounds.height;
  let scaledContentWidth: number;
  let scaledContentHeight: number;

  // Scale to fit within the 90% target area while maintaining aspect ratio
  if (contentAspect >= targetContentWidth / targetContentHeight) {
    // Content is wider relative to target - fit to width
    scaledContentWidth = targetContentWidth;
    scaledContentHeight = Math.round(targetContentWidth / contentAspect);
  } else {
    // Content is taller relative to target - fit to height
    scaledContentHeight = targetContentHeight;
    scaledContentWidth = Math.round(targetContentHeight * contentAspect);
  }

  // Step 4: Calculate final output dimensions (fit within max)
  const finalDims = calculateOutputDimensions(
    originalWidth,
    originalHeight,
    MAX_LOGO_DIMENSION
  );

  // Scale the content dimensions proportionally if we're resizing the output
  const scale = finalDims.width / originalWidth;
  const finalContentWidth = Math.round(scaledContentWidth * scale);
  const finalContentHeight = Math.round(scaledContentHeight * scale);

  // Calculate padding to center the content
  const padX = Math.round((finalDims.width - finalContentWidth) / 2);
  const padY = Math.round((finalDims.height - finalContentHeight) / 2);

  const needsResize =
    finalDims.width !== originalWidth || finalDims.height !== originalHeight;

  // Step 5: Create output canvas
  const outputCanvas = document.createElement('canvas');
  outputCanvas.width = finalDims.width;
  outputCanvas.height = finalDims.height;

  const ctx = outputCanvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  // Use high-quality image smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Fill with transparent background (or white for JPEG)
  const willBeJpeg = mimeType !== 'image/png' && mimeType !== 'image/gif';
  if (willBeJpeg) {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, finalDims.width, finalDims.height);
  }

  // Draw the trimmed content scaled to fill 90% and centered
  ctx.drawImage(
    img,
    bounds.left,
    bounds.top,
    bounds.width,
    bounds.height,
    padX,
    padY,
    finalContentWidth,
    finalContentHeight
  );

  // Step 6: Determine output format and compress
  let quality = 0.92;
  let outputDataUrl: string;
  let outputMimeType = mimeType;

  // For PNGs with transparency, keep as PNG; otherwise convert to JPEG for better compression
  const hasTransparency =
    mimeType === 'image/png' &&
    checkTransparency(ctx, finalDims.width, finalDims.height);

  if (!hasTransparency && mimeType !== 'image/gif') {
    outputMimeType = 'image/jpeg';
  }

  // Iteratively reduce quality until file size is acceptable
  do {
    outputDataUrl = outputCanvas.toDataURL(outputMimeType, quality);
    const sizeInBytes = Math.round((outputDataUrl.length - 22) * 0.75);

    if (sizeInBytes <= MAX_LOGO_SIZE_BYTES) {
      break;
    }

    quality -= 0.1;
  } while (quality > 0.1);

  return {
    dataUrl: outputDataUrl,
    originalWidth,
    originalHeight,
    finalWidth: finalDims.width,
    finalHeight: finalDims.height,
    wasResized: needsResize || wasTrimmed,
    wasTrimmed,
  };
}

/**
 * Check if an image has any transparent pixels
 */
function checkTransparency(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): boolean {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Check every 10th pixel for performance
  for (let i = 3; i < data.length; i += 40) {
    if (data[i] < 255) {
      return true;
    }
  }

  return false;
}

/**
 * Convert a Blob to a data URL
 */
export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
