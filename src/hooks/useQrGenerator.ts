import { useEffect, useRef, useCallback } from 'react';
import QRCodeStyling, {
  type Options,
  type DotType,
  type CornerSquareType,
  type CornerDotType,
} from 'qr-code-styling';
import { useQrStore } from '../stores/qrStore';
import type { DotStyle, CornerSquareStyle, CornerDotStyle, ErrorCorrection } from '../types/qr';

// Map our dot styles to qr-code-styling types
const dotStyleMap: Record<DotStyle, DotType> = {
  square: 'square',
  rounded: 'rounded',
  dots: 'dots',
  classy: 'classy',
  'classy-rounded': 'classy-rounded',
  'extra-rounded': 'extra-rounded',
};

const cornerSquareStyleMap: Record<CornerSquareStyle, CornerSquareType> = {
  square: 'square',
  dot: 'dot',
  'extra-rounded': 'extra-rounded',
};

const cornerDotStyleMap: Record<CornerDotStyle, CornerDotType> = {
  square: 'square',
  dot: 'dot',
};

const errorCorrectionMap: Record<ErrorCorrection, 'L' | 'M' | 'Q' | 'H'> = {
  L: 'L',
  M: 'M',
  Q: 'Q',
  H: 'H',
};

export function useQrGenerator(containerRef: React.RefObject<HTMLDivElement | null>) {
  const qrCodeRef = useRef<QRCodeStyling | null>(null);
  const isInitializedRef = useRef(false);

  const {
    content,
    dotStyle,
    cornerSquareStyle,
    cornerDotStyle,
    foreground,
    background,
    transparentBg,
    useGradient,
    gradient,
    logo,
    errorCorrection,
    exportSize,
  } = useQrStore();

  // Build QR options
  const getOptions = useCallback(
    (size: number = 300): Options => {
      const options: Options = {
        width: size,
        height: size,
        type: 'svg',
        data: content || 'https://example.com',
        margin: 10,
        qrOptions: {
          typeNumber: 0,
          mode: 'Byte',
          errorCorrectionLevel: errorCorrectionMap[errorCorrection],
        },
        dotsOptions: {
          type: dotStyleMap[dotStyle],
          color: foreground,
          gradient: undefined,
        },
        cornersSquareOptions: {
          type: cornerSquareStyleMap[cornerSquareStyle],
          color: foreground,
          gradient: undefined,
        },
        cornersDotOptions: {
          type: cornerDotStyleMap[cornerDotStyle],
          color: foreground,
          gradient: undefined,
        },
        backgroundOptions: transparentBg
          ? undefined
          : {
              color: background,
            },
        image: '',
        imageOptions: {
          hideBackgroundDots: true,
          imageSize: 0.4,
          margin: 0,
        },
      };

      // Add gradient if enabled
      if (useGradient && gradient) {
        const gradientConfig = {
          type: gradient.type as 'linear' | 'radial',
          rotation: gradient.rotation || 0,
          colorStops: gradient.colorStops,
        };

        options.dotsOptions = {
          ...options.dotsOptions,
          gradient: gradientConfig,
        };

        options.cornersSquareOptions = {
          ...options.cornersSquareOptions,
          gradient: gradientConfig,
        };

        options.cornersDotOptions = {
          ...options.cornersDotOptions,
          gradient: gradientConfig,
        };
      }

      // Add logo if present
      if (logo?.src) {
        options.image = logo.src;
        options.imageOptions = {
          hideBackgroundDots: true,
          imageSize: logo.size / 100,
          margin: logo.margin,
          crossOrigin: 'anonymous',
        };
      }

      return options;
    },
    [
      content,
      dotStyle,
      cornerSquareStyle,
      cornerDotStyle,
      foreground,
      background,
      transparentBg,
      useGradient,
      gradient,
      logo,
      errorCorrection,
    ]
  );

  // Initialize QR code
  useEffect(() => {
    if (!containerRef.current) return;

    const options = getOptions(300);

    if (!qrCodeRef.current) {
      qrCodeRef.current = new QRCodeStyling(options);
      qrCodeRef.current.append(containerRef.current);
      isInitializedRef.current = true;
    } else {
      qrCodeRef.current.update(options);
    }
  }, [containerRef, getOptions]);

  // Download as PNG
  const downloadPng = useCallback(async () => {
    if (!qrCodeRef.current) return;

    // Create a new instance with export size
    const exportQr = new QRCodeStyling(getOptions(exportSize));
    await exportQr.download({
      name: 'qr-code',
      extension: 'png',
    });
  }, [getOptions, exportSize]);

  // Download as SVG
  const downloadSvg = useCallback(async () => {
    if (!qrCodeRef.current) return;

    const exportQr = new QRCodeStyling(getOptions(exportSize));
    await exportQr.download({
      name: 'qr-code',
      extension: 'svg',
    });
  }, [getOptions, exportSize]);

  // Get as data URL (for clipboard/export)
  const getDataUrl = useCallback(async (): Promise<string | null> => {
    const exportQr = new QRCodeStyling(getOptions(exportSize));

    return new Promise((resolve) => {
      exportQr.getRawData('png').then((data) => {
        if (!data) {
          resolve(null);
          return;
        }

        // Handle both Blob and Buffer (Node.js)
        const blob = data instanceof Blob ? data : new Blob([data]);

        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
    });
  }, [getOptions, exportSize]);

  // Get a clean QR code image for validation (no styling, high contrast)
  const getValidationDataUrl = useCallback(async (): Promise<string | null> => {
    // Generate a clean, simple QR code that's easier to decode
    const validationQr = new QRCodeStyling({
      width: 512,
      height: 512,
      type: 'canvas',
      data: content || 'https://example.com',
      margin: 20,
      qrOptions: {
        typeNumber: 0,
        mode: 'Byte',
        errorCorrectionLevel: errorCorrectionMap[errorCorrection],
      },
      dotsOptions: {
        type: 'square',
        color: '#000000',
      },
      cornersSquareOptions: {
        type: 'square',
        color: '#000000',
      },
      cornersDotOptions: {
        type: 'square',
        color: '#000000',
      },
      backgroundOptions: {
        color: '#ffffff',
      },
    });

    return new Promise((resolve) => {
      validationQr.getRawData('png').then((data) => {
        if (!data) {
          resolve(null);
          return;
        }

        const blob = data instanceof Blob ? data : new Blob([data]);

        const reader = new FileReader();
        reader.onloadend = () => {
          resolve(reader.result as string);
        };
        reader.readAsDataURL(blob);
      });
    });
  }, [content, errorCorrection]);

  // Copy to clipboard
  const copyToClipboard = useCallback(async (): Promise<boolean> => {
    try {
      const exportQr = new QRCodeStyling(getOptions(exportSize));
      const data = await exportQr.getRawData('png');

      if (!data) return false;

      // Handle both Blob and Buffer (Node.js)
      const blob = data instanceof Blob ? data : new Blob([data], { type: 'image/png' });

      await navigator.clipboard.write([
        new ClipboardItem({
          'image/png': blob,
        }),
      ]);

      return true;
    } catch (error) {
      console.error('Failed to copy to clipboard:', error);
      return false;
    }
  }, [getOptions, exportSize]);

  // Get blob for Tauri file save
  const getBlob = useCallback(
    async (format: 'png' | 'svg' = 'png'): Promise<Blob | null> => {
      const exportQr = new QRCodeStyling(getOptions(exportSize));
      const data = await exportQr.getRawData(format === 'svg' ? 'svg' : 'png');
      if (!data) return null;
      // Handle both Blob and Buffer (Node.js)
      return data instanceof Blob ? data : new Blob([data]);
    },
    [getOptions, exportSize]
  );

  return {
    qrCode: qrCodeRef.current,
    downloadPng,
    downloadSvg,
    getDataUrl,
    getValidationDataUrl,
    copyToClipboard,
    getBlob,
  };
}
