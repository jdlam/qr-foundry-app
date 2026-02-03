import { useState, useCallback, useRef, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useBatch, type BatchItem, type BatchGenerateItem } from '../../hooks/useBatch';
import { useQrStore } from '../../stores/qrStore';
import { useTauriDragDrop } from '../../hooks/useTauriDragDrop';

type ItemStatus = 'pending' | 'generating' | 'done' | 'error';
type ExportFormat = 'png' | 'svg';

interface BatchItemWithStatus extends BatchItem {
  status: ItemStatus;
  imageData?: string;
  error?: string;
}

export function BatchView() {
  const {
    items,
    isParsing,
    isGenerating,
    parseError,
    parseCsvContent,
    pickCsvFile,
    parseCsvFile,
    generateZip,
    validateBatch,
    clearBatch,
  } = useBatch();

  const [itemsWithStatus, setItemsWithStatus] = useState<BatchItemWithStatus[]>([]);
  const [isHtmlDragging, setIsHtmlDragging] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [exportFormat, setExportFormat] = useState<ExportFormat>('png');
  const [generatedItems, setGeneratedItems] = useState<BatchGenerateItem[]>([]);
  const [isLocalGenerating, setIsLocalGenerating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const generatingRef = useRef<Set<number>>(new Set());

  const store = useQrStore();

  // Handle Tauri native drag-drop (for files dragged from OS file manager)
  const handleTauriFileDrop = useCallback(
    async (paths: string[]) => {
      const filePath = paths[0];
      if (filePath && (filePath.endsWith('.csv') || filePath.endsWith('.txt'))) {
        await parseCsvFile(filePath);
      }
    },
    [parseCsvFile]
  );

  const { isDragging: isTauriDragging } = useTauriDragDrop(handleTauriFileDrop);

  // Combine both drag states for visual feedback
  const isDragging = isHtmlDragging || isTauriDragging;

  // Sync items with status
  useEffect(() => {
    setItemsWithStatus(
      items.map((item) => ({
        ...item,
        status: 'pending' as ItemStatus,
      }))
    );
    setPreviewIndex(0);
    setGeneratedItems([]);
    generatingRef.current.clear();
  }, [items]);

  // Preview navigation
  const currentPreviewItem = itemsWithStatus[previewIndex] || null;
  const canGoPrev = previewIndex > 0;
  const canGoNext = previewIndex < itemsWithStatus.length - 1;

  const goToPrevItem = useCallback(() => {
    if (canGoPrev) setPreviewIndex((i) => i - 1);
  }, [canGoPrev]);

  const goToNextItem = useCallback(() => {
    if (canGoNext) setPreviewIndex((i) => i + 1);
  }, [canGoNext]);

  const selectPreviewItem = useCallback((index: number) => {
    setPreviewIndex(index);
  }, []);

  // Keyboard navigation for preview
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (itemsWithStatus.length === 0) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (canGoPrev) setPreviewIndex((i) => i - 1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (canGoNext) setPreviewIndex((i) => i + 1);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [itemsWithStatus.length, canGoPrev, canGoNext]);

  const handleFileDrop = useCallback(
    async (file: File) => {
      console.log('[BatchView] handleFileDrop called with file:', file.name, 'type:', file.type);
      const text = await file.text();
      console.log('[BatchView] File content length:', text.length, 'preview:', text.substring(0, 100));
      await parseCsvContent(text);
    },
    [parseCsvContent]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsHtmlDragging(false);

      const file = e.dataTransfer.files[0];
      console.log('[BatchView] Dropped file:', file?.name, 'files count:', e.dataTransfer.files.length);
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
        console.log('[BatchView] Valid CSV file from HTML drop');
        handleFileDrop(file);
      } else {
        console.log('[BatchView] Invalid file from HTML drop');
      }
    },
    [handleFileDrop]
  );

  const handlePickFile = useCallback(async () => {
    const filePath = await pickCsvFile();
    if (filePath) {
      await parseCsvFile(filePath);
    }
  }, [pickCsvFile, parseCsvFile]);

  // Use handlePickFile for Tauri file picker
  void handlePickFile;

  const handleFileInput = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        await handleFileDrop(file);
      }
    },
    [handleFileDrop]
  );

  const generateQrForItem = useCallback(
    async (item: BatchItemWithStatus, format: ExportFormat): Promise<string | null> => {
      return new Promise((resolve) => {
        const qr = new QRCodeStyling({
          width: store.exportSize,
          height: store.exportSize,
          type: format === 'svg' ? 'svg' : 'canvas',
          data: item.content,
          margin: 10,
          qrOptions: {
            errorCorrectionLevel: store.errorCorrection,
          },
          dotsOptions: {
            type: store.dotStyle,
            color: store.foreground,
          },
          cornersSquareOptions: {
            type: store.cornerSquareStyle,
            color: store.foreground,
          },
          cornersDotOptions: {
            type: store.cornerDotStyle,
            color: store.foreground,
          },
          backgroundOptions: store.transparentBg
            ? { color: 'transparent' }
            : { color: store.background },
          // Only include image options when there's a logo to avoid library errors
          ...(store.logo?.src
            ? {
                image: store.logo.src,
                imageOptions: {
                  hideBackgroundDots: true,
                  imageSize: store.logo.size / 100,
                  margin: store.logo.margin,
                },
              }
            : {}),
        });

        qr.getRawData(format).then((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          // Convert to base64/data URL
          const actualBlob = blob instanceof Blob ? blob : new Blob([blob]);
          const reader = new FileReader();
          reader.onloadend = () => {
            resolve(reader.result as string);
          };
          reader.readAsDataURL(actualBlob);
        });
      });
    },
    [store]
  );

  // Auto-generate QR code for current preview item
  useEffect(() => {
    const item = itemsWithStatus[previewIndex];
    if (!item) return;
    if (item.imageData) return;
    if (item.status === 'generating') return;
    if (generatingRef.current.has(previewIndex)) return;

    generatingRef.current.add(previewIndex);

    // Mark as generating
    setItemsWithStatus((current) =>
      current.map((it, idx) =>
        idx === previewIndex ? { ...it, status: 'generating' as ItemStatus } : it
      )
    );

    // Generate the QR code for preview (always use PNG for preview)
    generateQrForItem(item, 'png')
      .then((imageData) => {
        setItemsWithStatus((prev) =>
          prev.map((it, idx) =>
            idx === previewIndex
              ? {
                  ...it,
                  status: imageData ? ('done' as ItemStatus) : ('error' as ItemStatus),
                  imageData: imageData || undefined,
                  error: imageData ? undefined : 'Failed to generate',
                }
              : it
          )
        );
      })
      .catch((error) => {
        console.error('Failed to generate preview QR:', error);
        setItemsWithStatus((prev) =>
          prev.map((it, idx) =>
            idx === previewIndex
              ? { ...it, status: 'error' as ItemStatus, error: 'Failed to generate' }
              : it
          )
        );
      })
      .finally(() => {
        generatingRef.current.delete(previewIndex);
      });
  }, [previewIndex, itemsWithStatus, generateQrForItem]);

  // Generate all QR codes with validation
  const handleGenerateAll = useCallback(async () => {
    if (itemsWithStatus.length === 0) return;

    setIsLocalGenerating(true);
    setGenerateProgress(0);
    const generated: BatchGenerateItem[] = [];
    const updatedItems = [...itemsWithStatus];

    try {
      // Step 1: Generate all QR codes
      for (let i = 0; i < updatedItems.length; i++) {
        const item = updatedItems[i];
        updatedItems[i] = { ...item, status: 'generating' };
        setItemsWithStatus([...updatedItems]);

        try {
          const imageData = await generateQrForItem(item, exportFormat);

          if (imageData) {
            updatedItems[i] = { ...item, status: 'done', imageData };
            generated.push({
              row: item.row,
              content: item.content,
              label: item.label,
              imageData,
            });
          } else {
            updatedItems[i] = { ...item, status: 'error', error: 'Failed to generate' };
          }
        } catch (error) {
          console.error(`Failed to generate QR for row ${item.row}:`, error);
          updatedItems[i] = { ...item, status: 'error', error: 'Failed to generate' };
        }

        setItemsWithStatus([...updatedItems]);
        setGenerateProgress(((i + 1) / updatedItems.length) * 100);
      }

      // Step 2: Validate all generated QR codes
      if (generated.length > 0) {
        try {
          const validationResults = await validateBatch(generated);

          // Update items with validation results
          setItemsWithStatus((current) =>
            current.map((item) => {
              const validation = validationResults.find((v) => v.row === item.row);
              if (validation) {
                if (!validation.success) {
                  return {
                    ...item,
                    status: 'error' as ItemStatus,
                    error: validation.error || 'Validation failed',
                  };
                } else if (!validation.contentMatch) {
                  return {
                    ...item,
                    status: 'error' as ItemStatus,
                    error: 'Content mismatch',
                  };
                }
              }
              return item;
            })
          );
        } catch (error) {
          console.error('Failed to validate batch:', error);
        }
      }

      setGeneratedItems(generated);
    } finally {
      setIsLocalGenerating(false);
    }
  }, [itemsWithStatus, generateQrForItem, exportFormat, validateBatch]);

  // Export as ZIP (uses already generated items)
  const handleExportZip = useCallback(async () => {
    if (generatedItems.length === 0) return;

    const result = await generateZip(generatedItems, false);
    if (result?.success) {
      console.log('ZIP exported successfully');
    }
  }, [generatedItems, generateZip]);

  // Download individual QR code
  const handleDownloadCurrent = useCallback(async () => {
    if (!currentPreviewItem?.imageData) return;

    // Create download link
    const link = document.createElement('a');
    link.href = currentPreviewItem.imageData;
    const filename = currentPreviewItem.label
      ? `${currentPreviewItem.label}.${exportFormat}`
      : `qr-code-${currentPreviewItem.row}.${exportFormat}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [currentPreviewItem, exportFormat]);

  const handleClear = useCallback(() => {
    clearBatch();
    setGeneratedItems([]);
    setGenerateProgress(0);
  }, [clearBatch]);

  const allGenerated = generatedItems.length > 0 && generatedItems.length === itemsWithStatus.length;
  const isProcessing = isLocalGenerating || isGenerating;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div className="w-80 border-r border-border flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-border">
          <div className="text-[10px] font-bold text-muted uppercase tracking-wider mb-3">
            Batch Generation
          </div>

          {/* File Drop Zone */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            onChange={handleFileInput}
            className="hidden"
          />
          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setIsHtmlDragging(true);
            }}
            onDragLeave={() => setIsHtmlDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-accent bg-accent/5'
                : 'border-border-light hover:border-accent/50'
            }`}
          >
            {isParsing ? (
              <>
                <span className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block mb-2" />
                <div className="text-xs text-accent">Parsing...</div>
              </>
            ) : (
              <>
                <span className="text-2xl opacity-40">▤</span>
                <div className="text-xs text-muted mt-2">Drop CSV file here</div>
                <div className="text-[10px] text-dim mt-1">or click to browse</div>
              </>
            )}
          </div>

          {parseError && (
            <div className="mt-3 p-2 bg-danger/10 border border-danger/30 rounded-lg text-xs text-danger">
              {parseError}
            </div>
          )}

          {/* CSV Format Help */}
          <div className="mt-3 p-2 bg-surface-hover rounded-lg border border-border">
            <div className="text-[10px] text-dim mb-1">Expected columns:</div>
            <div className="font-mono text-[10px] text-muted">content, type, label</div>
          </div>
        </div>

        {/* Items Table */}
        {itemsWithStatus.length > 0 && (
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-surface sticky top-0">
                <tr className="text-left text-dim">
                  <th className="p-2 font-medium">#</th>
                  <th className="p-2 font-medium">Content</th>
                  <th className="p-2 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithStatus.map((item, index) => (
                  <tr
                    key={item.row}
                    onClick={() => selectPreviewItem(index)}
                    className={`border-t border-border cursor-pointer transition-colors ${
                      index === previewIndex
                        ? 'bg-accent/10 hover:bg-accent/15'
                        : 'hover:bg-surface-hover'
                    }`}
                  >
                    <td className="p-2 text-dim">{item.row}</td>
                    <td className="p-2 font-mono truncate max-w-[140px]" title={item.content}>
                      {item.content}
                    </td>
                    <td className="p-2">
                      <span className="text-[9px] font-semibold bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                        {item.qrType}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        {itemsWithStatus.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            {/* Format Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted">Format:</span>
              <div className="flex gap-1 flex-1">
                <button
                  onClick={() => setExportFormat('png')}
                  disabled={isProcessing}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'png'
                      ? 'bg-accent/20 text-accent border border-accent/50'
                      : 'bg-surface-hover border border-border text-muted hover:text-text'
                  } disabled:opacity-50`}
                >
                  PNG
                </button>
                <button
                  onClick={() => setExportFormat('svg')}
                  disabled={isProcessing}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    exportFormat === 'svg'
                      ? 'bg-accent/20 text-accent border border-accent/50'
                      : 'bg-surface-hover border border-border text-muted hover:text-text'
                  } disabled:opacity-50`}
                >
                  SVG
                </button>
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerateAll}
              disabled={isProcessing}
              className="w-full py-2.5 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLocalGenerating ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                  Generating...
                </span>
              ) : (
                'Generate All'
              )}
            </button>

            {/* Export ZIP Button */}
            <button
              onClick={handleExportZip}
              disabled={!allGenerated || isProcessing}
              className="w-full py-2.5 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Export as ZIP
            </button>

            <button
              onClick={handleClear}
              disabled={isProcessing}
              className="w-full py-2 text-xs text-muted hover:text-text border border-border rounded-lg hover:bg-surface-hover transition-colors disabled:opacity-50"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Right Panel - Preview */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--surface-hover) 0%, var(--bg) 70%)',
        }}
      >
        {itemsWithStatus.length > 0 ? (
          <div className="flex flex-col items-center max-w-lg w-full">
            {/* Progress bar when generating */}
            {isLocalGenerating && (
              <div className="w-full max-w-xs mb-6">
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${generateProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Gallery Navigation */}
            <div className="flex items-center gap-4 w-full justify-center">
              {/* Previous Button */}
              <button
                onClick={goToPrevItem}
                disabled={!canGoPrev}
                className="p-3 rounded-full bg-surface border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Previous (←)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>

              {/* QR Preview */}
              <div className="flex flex-col items-center">
                <div className="bg-surface rounded-2xl p-4 border border-border shadow-lg">
                  <div className="w-[250px] h-[250px] flex items-center justify-center bg-white rounded-lg">
                    {currentPreviewItem?.imageData ? (
                      <img
                        src={currentPreviewItem.imageData}
                        alt={`QR ${currentPreviewItem.row}`}
                        className="w-full h-full object-contain"
                      />
                    ) : currentPreviewItem?.status === 'generating' ? (
                      <span className="w-8 h-8 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <div className="text-dim text-sm text-center px-4">
                        Click "Generate All" to create QR codes
                      </div>
                    )}
                  </div>
                </div>

                {/* Item Info */}
                {currentPreviewItem && (
                  <div className="mt-4 text-center">
                    <div className="text-xs text-muted mb-1">
                      Item {previewIndex + 1} of {itemsWithStatus.length}
                    </div>
                    <div className="font-mono text-sm text-text max-w-[250px] truncate" title={currentPreviewItem.content}>
                      {currentPreviewItem.content}
                    </div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className="text-[9px] font-semibold bg-accent/15 text-accent px-2 py-0.5 rounded uppercase">
                        {currentPreviewItem.qrType}
                      </span>
                      {currentPreviewItem.label && (
                        <span className="text-[10px] text-muted">
                          {currentPreviewItem.label}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Download Current Button */}
                {currentPreviewItem?.imageData && (
                  <button
                    onClick={handleDownloadCurrent}
                    className="mt-4 px-4 py-2 bg-surface border border-border rounded-lg text-xs font-semibold hover:bg-surface-hover transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download {exportFormat.toUpperCase()}
                  </button>
                )}
              </div>

              {/* Next Button */}
              <button
                onClick={goToNextItem}
                disabled={!canGoNext}
                className="p-3 rounded-full bg-surface border border-border hover:bg-surface-hover disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                title="Next (→)"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-dim">
            <span className="text-5xl block mb-3 opacity-30">▤</span>
            <div className="text-sm text-muted">Import a CSV to batch generate QR codes</div>
            <div className="text-[11px] mt-1">Each row becomes a styled QR code</div>

            {/* Example CSV */}
            <div className="mt-6 p-4 bg-surface rounded-lg border border-border text-left max-w-xs mx-auto">
              <div className="text-[10px] text-dim mb-2">Example CSV:</div>
              <pre className="font-mono text-[10px] text-muted">
                {`content,type,label
https://example.com,url,Homepage
+1-555-0123,phone,Support
Hello World,text,Greeting`}
              </pre>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
