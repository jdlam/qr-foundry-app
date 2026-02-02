import { useState, useCallback, useRef, useEffect } from 'react';
import QRCodeStyling from 'qr-code-styling';
import { useBatch, type BatchItem, type BatchGenerateItem } from '../../hooks/useBatch';
import { useQrStore } from '../../stores/qrStore';
import { useTauriDragDrop } from '../../hooks/useTauriDragDrop';

type ItemStatus = 'pending' | 'generating' | 'done' | 'error';

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
    validationResults,
    parseCsvContent,
    pickCsvFile,
    parseCsvFile,
    generateZip,
    clearBatch,
  } = useBatch();

  const [itemsWithStatus, setItemsWithStatus] = useState<BatchItemWithStatus[]>([]);
  const [isHtmlDragging, setIsHtmlDragging] = useState(false);
  const [generateProgress, setGenerateProgress] = useState(0);
  const [validateOnGenerate, setValidateOnGenerate] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  }, [items]);

  const handleFileDrop = useCallback(
    async (file: File) => {
      const text = await file.text();
      await parseCsvContent(text);
    },
    [parseCsvContent]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsHtmlDragging(false);

      const file = e.dataTransfer.files[0];
      if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
        handleFileDrop(file);
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
    async (item: BatchItemWithStatus): Promise<string | null> => {
      return new Promise((resolve) => {
        const qr = new QRCodeStyling({
          width: store.exportSize,
          height: store.exportSize,
          type: 'canvas',
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
            ? undefined
            : { color: store.background },
          image: store.logo?.src,
          imageOptions: store.logo
            ? {
                hideBackgroundDots: true,
                imageSize: store.logo.size / 100,
                margin: store.logo.margin,
              }
            : undefined,
        });

        qr.getRawData('png').then((blob) => {
          if (!blob) {
            resolve(null);
            return;
          }

          // Convert to base64
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

  const handleGenerate = useCallback(async () => {
    if (itemsWithStatus.length === 0) return;

    setGenerateProgress(0);
    const generatedItems: BatchGenerateItem[] = [];
    const updatedItems = [...itemsWithStatus];

    // Generate QR codes for each item
    for (let i = 0; i < updatedItems.length; i++) {
      const item = updatedItems[i];
      updatedItems[i] = { ...item, status: 'generating' };
      setItemsWithStatus([...updatedItems]);

      const imageData = await generateQrForItem(item);

      if (imageData) {
        updatedItems[i] = { ...item, status: 'done', imageData };
        generatedItems.push({
          row: item.row,
          content: item.content,
          label: item.label,
          imageData,
        });
      } else {
        updatedItems[i] = { ...item, status: 'error', error: 'Failed to generate' };
      }

      setItemsWithStatus([...updatedItems]);
      setGenerateProgress(((i + 1) / updatedItems.length) * 100);
    }

    // Generate ZIP with optional validation
    if (generatedItems.length > 0) {
      const result = await generateZip(generatedItems, validateOnGenerate);
      if (result?.success) {
        // Update status with validation results
        if (result.validationResults.length > 0) {
          const finalItems = updatedItems.map((item) => {
            const validation = result.validationResults.find((v) => v.row === item.row);
            if (validation && !validation.success) {
              return { ...item, status: 'error' as ItemStatus, error: validation.error || 'Validation failed' };
            }
            return item;
          });
          setItemsWithStatus(finalItems);
        }
      }
    }
  }, [itemsWithStatus, generateQrForItem, generateZip, validateOnGenerate]);

  const getStatusIcon = (status: ItemStatus, row: number) => {
    const validation = validationResults.get(row);

    if (validation) {
      if (validation.success) return <span className="text-success">✓</span>;
      return <span className="text-danger">✕</span>;
    }

    switch (status) {
      case 'pending':
        return <span className="text-dim">○</span>;
      case 'generating':
        return (
          <span className="w-3 h-3 border-2 border-accent border-t-transparent rounded-full animate-spin inline-block" />
        );
      case 'done':
        return <span className="text-success">✓</span>;
      case 'error':
        return <span className="text-danger">✕</span>;
    }
  };

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
                  <th className="p-2 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody>
                {itemsWithStatus.map((item) => (
                  <tr
                    key={item.row}
                    className="border-t border-border hover:bg-surface-hover"
                  >
                    <td className="p-2 text-dim">{item.row}</td>
                    <td className="p-2 font-mono truncate max-w-[120px]" title={item.content}>
                      {item.content}
                    </td>
                    <td className="p-2">
                      <span className="text-[9px] font-semibold bg-accent/15 text-accent px-1.5 py-0.5 rounded uppercase">
                        {item.qrType}
                      </span>
                    </td>
                    <td className="p-2 text-center">{getStatusIcon(item.status, item.row)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        {itemsWithStatus.length > 0 && (
          <div className="p-4 border-t border-border space-y-3">
            <label className="flex items-center gap-2 text-xs text-muted cursor-pointer">
              <input
                type="checkbox"
                checked={validateOnGenerate}
                onChange={(e) => setValidateOnGenerate(e.target.checked)}
                className="accent-accent"
              />
              Validate QR codes
            </label>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-2.5 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating
                ? `Generating... ${Math.round(generateProgress)}%`
                : `Generate ${itemsWithStatus.length} QR Codes`}
            </button>

            <button
              onClick={clearBatch}
              className="w-full py-2 text-xs text-muted hover:text-text border border-border rounded-lg hover:bg-surface-hover transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Right Panel */}
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--surface-hover) 0%, var(--bg) 70%)',
        }}
      >
        {itemsWithStatus.length > 0 ? (
          <div className="text-center max-w-lg">
            <div className="text-5xl mb-4">▤</div>
            <div className="text-lg text-text font-semibold mb-2">
              {itemsWithStatus.length} items loaded
            </div>
            <div className="text-sm text-muted mb-4">
              {itemsWithStatus.filter((i) => i.status === 'done').length} generated
              {validateOnGenerate && (
                <>
                  {' • '}
                  {
                    [...validationResults.values()].filter((v) => v.success).length
                  }{' '}
                  validated
                </>
              )}
            </div>

            {isGenerating && (
              <div className="w-full max-w-xs mx-auto">
                <div className="h-2 bg-surface rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-300"
                    style={{ width: `${generateProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted mt-2">
                  Generating QR codes and saving ZIP...
                </div>
              </div>
            )}

            {/* Preview of first few items */}
            <div className="grid grid-cols-4 gap-2 mt-6">
              {itemsWithStatus.slice(0, 8).map((item) => (
                <div
                  key={item.row}
                  className="aspect-square bg-surface rounded-lg border border-border flex items-center justify-center text-[10px] text-dim overflow-hidden"
                >
                  {item.imageData ? (
                    <img
                      src={item.imageData}
                      alt={`QR ${item.row}`}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    `#${item.row}`
                  )}
                </div>
              ))}
            </div>
            {itemsWithStatus.length > 8 && (
              <div className="text-xs text-dim mt-2">
                +{itemsWithStatus.length - 8} more
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-dim">
            <span className="text-5xl block mb-3 opacity-30">▤</span>
            <div className="text-sm text-muted">Import a CSV to batch generate QR codes</div>
            <div className="text-[11px] mt-1">Each row becomes a styled QR code, exported as ZIP</div>

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
