import { useState, useCallback, useEffect } from 'react';
import { useScanQr } from '../../hooks/useValidation';
import { useExport } from '../../hooks/useExport';
import { useQrStore } from '../../stores/qrStore';
import { useTauriDragDrop } from '../../hooks/useTauriDragDrop';

export function ScannerView() {
  const { scanFromFile, scanFromData, isScanning, scanResult, clearScan } = useScanQr();
  const { pickImageFile } = useExport();
  const [isHtmlDragging, setIsHtmlDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle Tauri native drag-drop (for files dragged from OS file manager)
  const handleTauriFileDrop = useCallback(
    async (paths: string[]) => {
      const filePath = paths[0];
      if (filePath) {
        // Check if it's an image file
        const ext = filePath.toLowerCase().split('.').pop();
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp'].includes(ext || '')) {
          setError(null);
          await scanFromFile(filePath);
        } else {
          setError('Please drop an image file');
        }
      }
    },
    [scanFromFile]
  );

  const { isDragging: isTauriDragging } = useTauriDragDrop(handleTauriFileDrop);

  // Combine both drag states for visual feedback
  const isDragging = isHtmlDragging || isTauriDragging;

  // Clear error when scan result changes
  useEffect(() => {
    if (scanResult) {
      setError(scanResult.error);
    }
  }, [scanResult]);

  const handleFileDrop = useCallback(
    async (file: File) => {
      setError(null);

      // Read file as data URL
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        await scanFromData(dataUrl);
      };
      reader.onerror = () => {
        setError('Failed to read file');
      };
      reader.readAsDataURL(file);
    },
    [scanFromData]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsHtmlDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('image/')) {
        handleFileDrop(file);
      } else {
        setError('Please drop an image file');
      }
    },
    [handleFileDrop]
  );

  const handlePaste = useCallback(
    async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            handleFileDrop(file);
          }
          break;
        }
      }
    },
    [handleFileDrop]
  );

  const handlePickFile = useCallback(async () => {
    const filePath = await pickImageFile();
    if (filePath) {
      await scanFromFile(filePath);
    }
  }, [pickImageFile, scanFromFile]);

  // Listen for paste events
  useEffect(() => {
    document.addEventListener('paste', handlePaste);
    return () => document.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  const handleCopyContent = useCallback(() => {
    if (scanResult?.content) {
      navigator.clipboard.writeText(scanResult.content);
    }
  }, [scanResult]);

  const handleRegenerate = useCallback(() => {
    if (scanResult?.content) {
      // Load the scanned content into the generator
      const store = useQrStore.getState();
      store.setContent(scanResult.content);
      // Could also set the input type based on qrType
    }
  }, [scanResult]);

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0">
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-2">
            Scan QR Code
          </div>

          {/* Drop Zone */}
          <div
            onClick={handlePickFile}
            onDragOver={(e) => {
              e.preventDefault();
              setIsHtmlDragging(true);
            }}
            onDragLeave={() => setIsHtmlDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-accent bg-accent/5'
                : 'border-border-light hover:border-accent/50'
            }`}
          >
            {isScanning ? (
              <>
                <span className="w-6 h-6 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block mb-2" />
                <div className="text-xs text-accent">Scanning...</div>
              </>
            ) : (
              <>
                <span className="text-3xl opacity-40">⊞</span>
                <div className="text-xs text-muted mt-2">Drop QR image here</div>
                <div className="text-[10px] text-dim mt-1">
                  or click to browse / paste (⌘V)
                </div>
              </>
            )}
          </div>

          {/* Result */}
          {(scanResult || error) && (
            <div className="mt-5 p-3 bg-surface-hover rounded-lg border border-border">
              <div className="text-[10px] text-dim uppercase tracking-wider mb-1.5">
                {error || !scanResult?.success ? 'Error' : 'Decoded Content'}
              </div>
              {error || !scanResult?.success ? (
                <div className="text-xs text-danger">
                  {error || scanResult?.error || 'Unknown error'}
                </div>
              ) : (
                <>
                  <div className="font-mono text-xs text-text break-all max-h-32 overflow-y-auto">
                    {scanResult?.content}
                  </div>
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-[9px] font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded uppercase">
                      {scanResult?.qrType}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={handleCopyContent}
                        className="text-[10px] text-muted hover:text-accent transition-colors"
                      >
                        Copy
                      </button>
                      <button
                        onClick={handleRegenerate}
                        className="text-[10px] text-muted hover:text-accent transition-colors"
                      >
                        Re-generate
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Clear button */}
          {scanResult && (
            <button
              onClick={clearScan}
              className="w-full mt-3 py-2 text-xs text-muted hover:text-text border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--surface-hover) 0%, var(--bg) 70%)',
        }}
      >
        {scanResult?.success ? (
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">✓</div>
            <div className="text-lg text-text font-semibold mb-2">QR Code Decoded</div>
            <div className="font-mono text-sm text-muted bg-surface p-4 rounded-lg border border-border break-all max-h-48 overflow-y-auto">
              {scanResult.content}
            </div>
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              <button
                onClick={handleCopyContent}
                className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all"
              >
                📋 Copy Content
              </button>
              {scanResult.qrType === 'url' && (
                <button
                  onClick={() => window.open(scanResult.content!, '_blank')}
                  className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all"
                >
                  🔗 Open URL
                </button>
              )}
              <button
                onClick={handleRegenerate}
                className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all"
              >
                ◧ Re-generate
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-dim">
            <span className="text-5xl block mb-3 opacity-30">⊞</span>
            <div className="text-sm text-muted">Drop a QR code image to scan</div>
            <div className="text-[11px] mt-1">Supports PNG, JPG, WebP, and clipboard</div>
          </div>
        )}
      </div>
    </div>
  );
}
