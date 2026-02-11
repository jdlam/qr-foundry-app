import { useRef, useState, useCallback } from 'react';
import { historyAdapter } from '@platform';
import { toast } from 'sonner';
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
        await historyAdapter.save({
          content,
          qrType: inputType,
          label: undefined,
          styleJson,
          thumbnail: thumbnail || undefined,
        });
      } catch (error) {
        console.error('Failed to save to history:', error);
      }
    },
    [content, inputType, store]
  );

  const handleValidate = useCallback(async () => {
    const dataUrl = await getValidationDataUrl();
    if (dataUrl) {
      await validate(dataUrl);
    }
  }, [getValidationDataUrl, validate]);

  const handleCopy = useCallback(async () => {
    const dataUrl = await getDataUrl();
    if (dataUrl) {
      try {
        const success = await copyToClipboard(dataUrl);
        if (success) {
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          saveToHistory(dataUrl);
          return;
        }
      } catch {
        // Fall back to browser clipboard
      }

      const blob = await getBlob('png');
      if (blob) {
        try {
          await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
          setCopySuccess(true);
          setTimeout(() => setCopySuccess(false), 2000);
          saveToHistory(dataUrl);
        } catch (error) {
          console.error('Clipboard fallback failed:', error);
          toast.error('Failed to copy to clipboard');
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
        } else if (result.error) {
          toast.error('Failed to export PNG');
        }
      } catch {
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
        } else if (result.error) {
          toast.error('Failed to export SVG');
        }
      } catch {
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
    <div className="flex flex-col items-center gap-6">
      {/* QR Preview Container */}
      <div
        ref={containerRef}
        className="w-[280px] h-[280px] flex items-center justify-center rounded-sm"
        style={{
          border: '1px solid var(--border)',
          background: transparentBg ? undefined : 'var(--qr-bg)',
          ...(transparentBg ? checkerboardStyle : {}),
        }}
      />

      {/* Meta Info Row */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-faint)' }}
          >
            Size
          </span>
          <select
            value={exportSize}
            onChange={(e) => useQrStore.getState().setExportSize(Number(e.target.value))}
            className="font-mono text-xs font-medium rounded-sm border outline-none cursor-pointer appearance-none"
            style={{
              padding: '4px 24px 4px 8px',
              background: 'var(--input-bg)',
              borderColor: 'var(--border)',
              color: 'var(--text-secondary)',
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%239ca3af' stroke-width='1.5'/%3E%3C/svg%3E")`,
              backgroundRepeat: 'no-repeat',
              backgroundPosition: 'right 6px center',
            }}
          >
            {[512, 1024, 2048, 4096].map((size) => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="font-mono text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-faint)' }}
          >
            EC
          </span>
          <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            {errorCorrection} ({ecPercent})
          </span>
        </div>
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {inputType.toUpperCase()}
        </span>
      </div>

      {/* Validation Badge */}
      <ValidationBadge
        state={validationState}
        message={result?.message}
        suggestions={result?.suggestions}
        onValidate={handleValidate}
        isValidating={isValidating}
      />

      {/* Export Bar */}
      <div className="flex gap-2 w-full max-w-[400px]">
        {/* PNG - Primary */}
        <button
          onClick={handleExportPng}
          disabled={!content || isExporting}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-sm border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: exportSuccess === 'PNG saved!' ? 'var(--success-bg)' : 'var(--accent)',
            borderColor: exportSuccess === 'PNG saved!' ? 'var(--success)' : 'var(--accent)',
            color: exportSuccess === 'PNG saved!' ? 'var(--success)' : 'var(--btn-primary-text)',
          }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="1" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          <span className="text-xs font-semibold">{exportSuccess === 'PNG saved!' ? 'Saved!' : 'PNG'}</span>
        </button>

        {/* SVG */}
        <button
          onClick={handleExportSvg}
          disabled={!content || isExporting}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-sm border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: exportSuccess === 'SVG saved!' ? 'var(--success-bg)' : 'var(--input-bg)',
            borderColor: exportSuccess === 'SVG saved!' ? 'var(--success)' : 'var(--border)',
            color: exportSuccess === 'SVG saved!' ? 'var(--success)' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!exportSuccess) e.currentTarget.style.borderColor = 'var(--text-faint)';
          }}
          onMouseLeave={(e) => {
            if (!exportSuccess) e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          <span className="text-xs font-semibold">{exportSuccess === 'SVG saved!' ? 'Saved!' : 'SVG'}</span>
        </button>

        {/* PDF placeholder */}
        <button
          disabled
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-sm border-2 opacity-50 cursor-not-allowed"
          style={{
            background: 'var(--input-bg)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span className="text-xs font-semibold">PDF</span>
        </button>

        {/* Copy */}
        <button
          onClick={handleCopy}
          disabled={!content || isExporting}
          className="flex-1 flex flex-col items-center justify-center gap-1 py-2.5 px-2 rounded-sm border-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: copySuccess ? 'var(--success-bg)' : 'var(--input-bg)',
            borderColor: copySuccess ? 'var(--success)' : 'var(--border)',
            color: copySuccess ? 'var(--success)' : 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => {
            if (!copySuccess) e.currentTarget.style.borderColor = 'var(--text-faint)';
          }}
          onMouseLeave={(e) => {
            if (!copySuccess) e.currentTarget.style.borderColor = 'var(--border)';
          }}
        >
          <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {copySuccess ? (
              <polyline points="20 6 9 17 4 12" />
            ) : (
              <>
                <rect x="9" y="9" width="13" height="13" rx="1" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </>
            )}
          </svg>
          <span className="text-xs font-semibold">{copySuccess ? 'Copied!' : 'Copy'}</span>
        </button>
      </div>

      {/* Export Success Message */}
      {exportSuccess && (
        <div className="text-xs font-medium animate-pulse" style={{ color: 'var(--success)' }}>
          {exportSuccess}
        </div>
      )}
    </div>
  );
}
