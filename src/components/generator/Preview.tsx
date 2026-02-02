import { useRef, useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useQrGenerator } from '../../hooks/useQrGenerator';
import { useValidation } from '../../hooks/useValidation';
import { useExport } from '../../hooks/useExport';
import { useQrStore } from '../../stores/qrStore';
import { ValidationBadge } from './ValidationBadge';

// Checkerboard pattern for showing transparency
const checkerboardStyle = {
  backgroundImage: `
    linear-gradient(45deg, #808080 25%, transparent 25%),
    linear-gradient(-45deg, #808080 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #808080 75%),
    linear-gradient(-45deg, transparent 75%, #808080 75%)
  `,
  backgroundSize: '16px 16px',
  backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
  backgroundColor: '#a0a0a0',
};

export function Preview() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { getDataUrl, getValidationDataUrl, getBlob } = useQrGenerator(containerRef);
  const { validate, isValidating, result } = useValidation();
  const { exportPng, exportSvg, copyToClipboard, isExporting } = useExport();
  const store = useQrStore();
  const { exportSize, inputType, errorCorrection, content, validationState, transparentBg } = store;

  const [copySuccess, setCopySuccess] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  // Save to history
  const saveToHistory = useCallback(
    async (thumbnail?: string) => {
      if (!content) return;

      const styleJson = JSON.stringify({
        dotStyle: store.dotStyle,
        cornerSquareStyle: store.cornerSquareStyle,
        cornerDotStyle: store.cornerDotStyle,
        foreground: store.foreground,
        background: store.background,
        transparentBg: store.transparentBg,
        useGradient: store.useGradient,
        gradient: store.gradient,
        logo: store.logo,
        errorCorrection: store.errorCorrection,
      });

      try {
        await invoke('history_save', {
          item: {
            content,
            qrType: inputType,
            label: null,
            styleJson,
            thumbnail: thumbnail || null,
          },
        });
      } catch (error) {
        console.error('Failed to save to history:', error);
      }
    },
    [content, inputType, store]
  );

  const handleValidate = useCallback(async () => {
    // Use a clean, simple QR image for validation (more reliable decoding)
    const dataUrl = await getValidationDataUrl();
    if (dataUrl) {
      await validate(dataUrl);
    }
  }, [getValidationDataUrl, validate]);

  const handleCopy = useCallback(async () => {
    const dataUrl = await getDataUrl();
    if (dataUrl) {
      // Try Tauri clipboard first, fall back to browser API
      try {
        const success = await copyToClipboard(dataUrl);
        if (success) {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          // Save to history
          saveToHistory(dataUrl);
          return;
        }
      } catch {
        // Fall back to browser clipboard
      }

      // Browser fallback
      const blob = await getBlob('png');
      if (blob) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          saveToHistory(dataUrl);
        } catch (error) {
          console.error('Clipboard fallback failed:', error);
        }
      }
    }
  }, [getDataUrl, getBlob, copyToClipboard, saveToHistory]);

  const handleExportPng = useCallback(async () => {
    const dataUrl = await getDataUrl();
    if (dataUrl) {
      try {
        const result = await exportPng(dataUrl, 'qr-code.png');
        if (result.success) {
          setExportSuccess('PNG saved!');
          setTimeout(() => setExportSuccess(null), 2000);
          saveToHistory(dataUrl);
        }
      } catch {
        // Fall back to browser download
        const blob = await getBlob('png');
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'qr-code.png';
          a.click();
          URL.revokeObjectURL(url);
          setExportSuccess('PNG downloaded!');
          setTimeout(() => setExportSuccess(null), 2000);
          saveToHistory(dataUrl);
        }
      }
    }
  }, [getDataUrl, getBlob, exportPng, saveToHistory]);

  const handleExportSvg = useCallback(async () => {
    const dataUrl = await getDataUrl();
    const blob = await getBlob('svg');
    if (blob) {
      const svgText = await blob.text();
      try {
        const result = await exportSvg(svgText, 'qr-code.svg');
        if (result.success) {
          setExportSuccess('SVG saved!');
          setTimeout(() => setExportSuccess(null), 2000);
          saveToHistory(dataUrl || undefined);
        }
      } catch {
        // Fall back to browser download
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'qr-code.svg';
        a.click();
        URL.revokeObjectURL(url);
        setExportSuccess('SVG downloaded!');
        setTimeout(() => setExportSuccess(null), 2000);
        saveToHistory(dataUrl || undefined);
      }
    }
  }, [getBlob, getDataUrl, exportSvg, saveToHistory]);

  const ecPercent = {
    L: '7%',
    M: '15%',
    Q: '25%',
    H: '30%',
  }[errorCorrection];

  return (
    <div className="flex flex-col items-center gap-4">
      {/* QR Preview Container */}
      <div className="bg-surface rounded-2xl p-6 border border-border shadow-lg">
        <div
          ref={containerRef}
          className="w-[300px] h-[300px] flex items-center justify-center rounded-lg"
          style={transparentBg ? checkerboardStyle : undefined}
        />
      </div>

      {/* Info Bar */}
      <div className="flex gap-4 text-xs text-muted font-mono">
        <span>
          Size: {exportSize}×{exportSize}
        </span>
        <span>
          EC: {errorCorrection} ({ecPercent})
        </span>
        <span>Type: {inputType.toUpperCase()}</span>
      </div>

      {/* Validation Badge */}
      <ValidationBadge
        state={validationState}
        message={result?.message}
        suggestions={result?.suggestions}
        onValidate={handleValidate}
        isValidating={isValidating}
      />

      {/* Size Selector */}
      <div className="flex gap-1">
        {[512, 1024, 2048, 4096].map((size) => (
          <button
            key={size}
            onClick={() => useQrStore.getState().setExportSize(size)}
            className={`px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
              exportSize === size
                ? 'bg-accent/20 border border-accent/60 text-accent'
                : 'bg-surface-hover border border-border text-muted hover:text-text'
            }`}
          >
            {size}px
          </button>
        ))}
      </div>

      {/* Export Buttons */}
      <div className="flex gap-2 flex-wrap justify-center">
        <button
          onClick={handleCopy}
          disabled={!content || isExporting}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
            copySuccess
              ? 'bg-success/20 border border-success/50 text-success'
              : 'bg-surface-hover border border-border hover:bg-border/50'
          }`}
        >
          <span>{copySuccess ? '✓' : '📋'}</span>
          {copySuccess ? 'Copied!' : 'Copy'}
        </button>
        <button
          onClick={handleExportPng}
          disabled={!content || isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>🖼</span> PNG
        </button>
        <button
          onClick={handleExportSvg}
          disabled={!content || isExporting}
          className="flex items-center gap-2 px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>◇</span> SVG
        </button>
      </div>

      {/* Export Success Message */}
      {exportSuccess && (
        <div className="text-xs text-success font-medium animate-pulse">{exportSuccess}</div>
      )}
    </div>
  );
}
