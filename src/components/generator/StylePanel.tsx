import { useCallback, useRef, useEffect, useState } from 'react';
import { readFile } from '@tauri-apps/plugin-fs';
import { useQrStore } from '../../stores/qrStore';
import { useTauriDragDrop } from '../../hooks/useTauriDragDrop';
import { optimizeImage, blobToDataUrl } from '../../lib/imageOptimizer';
import type { DotStyle, CornerSquareStyle, ErrorCorrection } from '../../types/qr';

const DOT_STYLES: { id: DotStyle; label: string; name: string }[] = [
  { id: 'square', label: '■', name: 'Square' },
  { id: 'rounded', label: '●', name: 'Rounded' },
  { id: 'dots', label: '◉', name: 'Dots' },
  { id: 'classy', label: '◆', name: 'Classy' },
  { id: 'classy-rounded', label: '◇', name: 'Classy Round' },
  { id: 'extra-rounded', label: '○', name: 'Extra Round' },
];

const CORNER_STYLES: { id: CornerSquareStyle; label: string; name: string }[] = [
  { id: 'square', label: '▣', name: 'Square' },
  { id: 'dot', label: '◍', name: 'Dot' },
  { id: 'extra-rounded', label: '◎', name: 'Rounded' },
];

const EC_LEVELS: { id: ErrorCorrection; percent: string; desc: string }[] = [
  { id: 'L', percent: '7%', desc: 'Smallest code' },
  { id: 'M', percent: '15%', desc: 'Recommended' },
  { id: 'Q', percent: '25%', desc: 'Good with logo' },
  { id: 'H', percent: '30%', desc: 'Best with logo' },
];

// Default logo size that fills ~80% of the logo area (32 out of 40 max)
const DEFAULT_LOGO_SIZE = 32;

function ColorSwatch({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="w-8 h-8 rounded-md border-2 border-border-light overflow-hidden relative">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="absolute -inset-1.5 w-[150%] h-[150%] cursor-pointer border-none"
        />
      </div>
      {label && <span className="text-[9px] text-dim">{label}</span>}
    </div>
  );
}

export function StylePanel() {
  const {
    dotStyle,
    cornerSquareStyle,
    foreground,
    background,
    transparentBg,
    useGradient,
    gradient,
    logo,
    errorCorrection,
    setDotStyle,
    setCornerSquareStyle,
    setForeground,
    setBackground,
    setTransparentBg,
    setUseGradient,
    setGradient,
    setLogo,
    setErrorCorrection,
  } = useQrStore();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [logoError, setLogoError] = useState<string | null>(null);

  // Clear error after 3 seconds
  useEffect(() => {
    if (logoError) {
      const timer = setTimeout(() => setLogoError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [logoError]);

  // Load logo from file path (used by Tauri drag-drop)
  const loadLogoFromPath = useCallback(
    async (filePath: string) => {
      // Check if it's an image file
      const ext = filePath.toLowerCase().split('.').pop();
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
        setLogoError('Invalid file type. Use PNG, JPG, or SVG.');
        return;
      }

      try {
        const data = await readFile(filePath);
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        // Convert Uint8Array to data URL
        const blob = new Blob([data], { type: mimeType });
        const rawDataUrl = await blobToDataUrl(blob);

        // Optimize image (resize and compress)
        const optimized = await optimizeImage(rawDataUrl, mimeType);

        setLogoError(null);
        setLogo({
          src: optimized.dataUrl,
          size: DEFAULT_LOGO_SIZE,
          margin: 5,
          shape: 'square',
        });
      } catch (err) {
        console.error('Failed to load logo:', err);
        setLogoError('Failed to load file.');
      }
    },
    [setLogo]
  );

  // Handle Tauri native drag-drop
  const { isDragging: isTauriDragging, droppedFiles, clearDroppedFiles } = useTauriDragDrop();

  useEffect(() => {
    if (droppedFiles.length > 0) {
      loadLogoFromPath(droppedFiles[0]);
      clearDroppedFiles();
    }
  }, [droppedFiles, loadLogoFromPath, clearDroppedFiles]);

  const handleLogoUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const rawDataUrl = await blobToDataUrl(file);
        const optimized = await optimizeImage(rawDataUrl, file.type);

        setLogoError(null);
        setLogo({
          src: optimized.dataUrl,
          size: DEFAULT_LOGO_SIZE,
          margin: 5,
          shape: 'square',
        });
      } catch (err) {
        console.error('Failed to load logo:', err);
        setLogoError('Failed to load file.');
      }
    },
    [setLogo]
  );

  const handleLogoDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (!file || !file.type.startsWith('image/')) {
        setLogoError('Invalid file type. Use PNG, JPG, or SVG.');
        return;
      }

      try {
        const rawDataUrl = await blobToDataUrl(file);
        const optimized = await optimizeImage(rawDataUrl, file.type);

        setLogoError(null);
        setLogo({
          src: optimized.dataUrl,
          size: DEFAULT_LOGO_SIZE,
          margin: 5,
          shape: 'square',
        });
      } catch (err) {
        console.error('Failed to load logo:', err);
        setLogoError('Failed to load file.');
      }
    },
    [setLogo]
  );

  return (
    <div className="space-y-4">
      <div className="h-px bg-border" />

      <div className="text-[10px] font-bold text-muted uppercase tracking-wider">Style</div>

      {/* Dot Style */}
      <div>
        <div className="text-[11px] text-muted mb-1.5">Dot Style</div>
        <div className="flex gap-1 flex-wrap">
          {DOT_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setDotStyle(s.id)}
              title={s.name}
              className={`w-9 h-9 flex items-center justify-center rounded-md text-base transition-all ${
                dotStyle === s.id
                  ? 'bg-accent/20 border border-accent/60 text-accent'
                  : 'bg-surface-hover border border-border text-muted hover:text-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Corner Style */}
      <div>
        <div className="text-[11px] text-muted mb-1.5">Corner Style</div>
        <div className="flex gap-1">
          {CORNER_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setCornerSquareStyle(s.id)}
              title={s.name}
              className={`w-9 h-9 flex items-center justify-center rounded-md text-base transition-all ${
                cornerSquareStyle === s.id
                  ? 'bg-accent/20 border border-accent/60 text-accent'
                  : 'bg-surface-hover border border-border text-muted hover:text-text'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      {/* Colors */}
      <div>
        <div className="text-[11px] text-muted mb-1.5">Colors</div>
        <div className="flex gap-3 items-center">
          <ColorSwatch label="FG" value={foreground} onChange={setForeground} />
          <ColorSwatch label="BG" value={background} onChange={setBackground} />
          <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer ml-2">
            <input
              type="checkbox"
              checked={transparentBg}
              onChange={(e) => setTransparentBg(e.target.checked)}
              className="accent-accent"
            />
            Transparent
          </label>
        </div>
      </div>

      {/* Gradient */}
      <div>
        <label className="flex items-center gap-1.5 text-[11px] text-muted cursor-pointer">
          <input
            type="checkbox"
            checked={useGradient}
            onChange={(e) => setUseGradient(e.target.checked)}
            className="accent-accent"
          />
          Gradient Fill
        </label>
        {useGradient && (
          <div className="flex gap-2 mt-2 items-center">
            <ColorSwatch
              value={gradient.colorStops[0]?.color || '#1a1a2e'}
              onChange={(color) =>
                setGradient({
                  colorStops: [
                    { offset: 0, color },
                    gradient.colorStops[1] || { offset: 1, color: '#e94560' },
                  ],
                })
              }
            />
            <span className="text-[11px] text-dim">→</span>
            <ColorSwatch
              value={gradient.colorStops[1]?.color || '#e94560'}
              onChange={(color) =>
                setGradient({
                  colorStops: [
                    gradient.colorStops[0] || { offset: 0, color: '#1a1a2e' },
                    { offset: 1, color },
                  ],
                })
              }
            />
          </div>
        )}
      </div>

      {/* Logo */}
      <div>
        <div className="text-[11px] text-muted mb-1.5">Logo / Image</div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {logo ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2 p-2 bg-surface-hover rounded-lg border border-border">
              <img
                src={logo.src}
                alt="Logo"
                className="w-10 h-10 object-contain rounded"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text truncate">Logo added</div>
                <div className="text-[10px] text-dim">Size: {logo.size}%</div>
              </div>
              <button
                onClick={() => setLogo(null)}
                className="text-danger text-xs hover:underline"
              >
                Remove
              </button>
            </div>

            {/* Logo Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px] text-muted">Size</span>
                <span className="text-[10px] text-dim font-mono">{logo.size}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={logo.size}
                onChange={(e) => setLogo({ ...logo, size: Number(e.target.value) })}
                className="w-full accent-accent h-1"
              />
              <div className="flex justify-between text-[9px] text-dim mt-0.5">
                <span>Small</span>
                <span>Large</span>
              </div>
              {logo.size > 30 && (
                <div className="text-[9px] text-accent mt-1 p-1.5 bg-accent/10 rounded border border-accent/20">
                  ⚠ Large logos may reduce scanability — use EC level Q or H
                </div>
              )}
            </div>

            {/* Logo Shape */}
            <div className="flex gap-2">
              <button
                onClick={() => setLogo({ ...logo, shape: 'square' })}
                className={`flex-1 py-1.5 text-[11px] rounded-md font-semibold transition-all ${
                  logo.shape === 'square'
                    ? 'bg-accent/20 border border-accent/60 text-accent'
                    : 'bg-surface-hover border border-border text-muted'
                }`}
              >
                □ Square
              </button>
              <button
                onClick={() => setLogo({ ...logo, shape: 'circle' })}
                className={`flex-1 py-1.5 text-[11px] rounded-md font-semibold transition-all ${
                  logo.shape === 'circle'
                    ? 'bg-accent/20 border border-accent/60 text-accent'
                    : 'bg-surface-hover border border-border text-muted'
                }`}
              >
                ○ Circle
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleLogoDrop}
              className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${
                isTauriDragging
                  ? 'border-accent bg-accent/5'
                  : logoError
                    ? 'border-danger/50 bg-danger/5'
                    : 'border-border-light hover:border-accent/50'
              }`}
            >
              <span className="text-2xl opacity-40">+</span>
              <div className="text-[10px] text-dim mt-1">
                {isTauriDragging ? 'Drop to add logo' : 'Drop logo or click to upload'}
              </div>
              <div className="text-[9px] text-dim">PNG, JPG, SVG (auto-resized)</div>
            </div>
            {logoError && (
              <div className="text-[9px] text-danger mt-1.5 p-1.5 bg-danger/10 rounded border border-danger/20">
                {logoError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Correction */}
      <div>
        <div className="text-[11px] text-muted mb-1.5">Error Correction</div>
        <div className="flex gap-1">
          {EC_LEVELS.map((ec) => (
            <button
              key={ec.id}
              onClick={() => setErrorCorrection(ec.id)}
              className={`w-9 font-mono text-xs font-bold py-1.5 rounded-md transition-all ${
                errorCorrection === ec.id
                  ? 'bg-accent/20 border border-accent/60 text-accent'
                  : 'bg-surface-hover border border-border text-muted hover:text-text'
              }`}
            >
              {ec.id}
            </button>
          ))}
        </div>
        <div className="text-[9px] text-dim mt-1">
          {EC_LEVELS.find((ec) => ec.id === errorCorrection)?.percent} recovery —{' '}
          {EC_LEVELS.find((ec) => ec.id === errorCorrection)?.desc}
        </div>
        {logo && (errorCorrection === 'L' || errorCorrection === 'M') && (
          <div className="text-[9px] text-accent mt-1 p-1.5 bg-accent/10 rounded border border-accent/20">
            💡 Tip: Use Q or H when embedding a logo for best results
          </div>
        )}
      </div>
    </div>
  );
}
