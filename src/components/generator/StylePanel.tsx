import { useCallback, useRef, useEffect, useState } from 'react';
import { HexColorPicker } from 'react-colorful';
import { filesystemAdapter } from '@platform';
import { toast } from 'sonner';
import { useQrStore } from '../../stores/qrStore';
import { useTauriDragDrop } from '../../hooks/useTauriDragDrop';
import { optimizeImage, blobToDataUrl } from '../../lib/imageOptimizer';
import type { DotStyle, CornerSquareStyle, ErrorCorrection } from '../../types/qr';

const DOT_STYLES: { id: DotStyle; label: string; name: string; svg: React.ReactNode }[] = [
  {
    id: 'square',
    label: '■',
    name: 'Square',
    svg: <svg viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" fill="currentColor"/></svg>,
  },
  {
    id: 'rounded',
    label: '●',
    name: 'Rounded',
    svg: <svg viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="3" fill="currentColor"/></svg>,
  },
  {
    id: 'dots',
    label: '◉',
    name: 'Dots',
    svg: <svg viewBox="0 0 18 18"><circle cx="9" cy="9" r="6" fill="currentColor"/></svg>,
  },
  {
    id: 'classy',
    label: '◆',
    name: 'Classy',
    svg: <svg viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" fill="currentColor" transform="rotate(45 9 9)"/></svg>,
  },
  {
    id: 'classy-rounded',
    label: '◈',
    name: 'Classy Rounded',
    svg: <svg viewBox="0 0 18 18"><rect x="3" y="3" width="12" height="12" rx="2" fill="currentColor" transform="rotate(45 9 9)"/></svg>,
  },
  {
    id: 'extra-rounded',
    label: '⬮',
    name: 'Extra Rounded',
    svg: <svg viewBox="0 0 18 18"><rect x="2" y="2" width="14" height="14" rx="7" fill="currentColor"/></svg>,
  },
];

const CORNER_STYLES: { id: CornerSquareStyle; label: string; name: string; svg: React.ReactNode }[] = [
  {
    id: 'square',
    label: '▣',
    name: 'Square',
    svg: (
      <svg viewBox="0 0 18 18">
        <rect x="2" y="2" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="6" y="6" width="6" height="6" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'extra-rounded',
    label: '◎',
    name: 'Rounded',
    svg: (
      <svg viewBox="0 0 18 18">
        <rect x="2" y="2" width="14" height="14" rx="3" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="6" y="6" width="6" height="6" rx="1.5" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'dot',
    label: '◍',
    name: 'Circle',
    svg: (
      <svg viewBox="0 0 18 18">
        <circle cx="9" cy="9" r="7" fill="none" stroke="currentColor" strokeWidth="2"/>
        <circle cx="9" cy="9" r="3" fill="currentColor"/>
      </svg>
    ),
  },
  {
    id: 'classy-rounded',
    label: '🍃',
    name: 'Leaf',
    svg: (
      <svg viewBox="0 0 18 18">
        <rect x="2" y="2" width="14" height="14" rx="1" ry="7" fill="none" stroke="currentColor" strokeWidth="2"/>
        <rect x="6" y="6" width="6" height="6" rx="0.5" ry="3" fill="currentColor"/>
      </svg>
    ),
  },
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
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative flex-1">
      <div
        ref={triggerRef}
        className="flex items-center gap-2 px-2.5 py-1.5 cursor-pointer rounded-sm border-2 transition-colors"
        style={{
          background: 'var(--input-bg)',
          borderColor: open ? 'var(--accent)' : 'var(--input-border)',
        }}
        onClick={() => setOpen(!open)}
        onMouseEnter={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
        onMouseLeave={(e) => { if (!open) e.currentTarget.style.borderColor = 'var(--input-border)'; }}
      >
        <div
          className="w-5 h-5 rounded-sm shrink-0 border-2"
          style={{ background: value, borderColor: 'var(--swatch-border)' }}
        />
        <span className="font-mono text-[12px] font-medium" style={{ color: 'var(--text-secondary)' }}>
          {value}
        </span>
      </div>
      {open && (
        <div
          ref={popoverRef}
          className="absolute right-0 top-full mt-1 z-50 rounded-sm shadow-lg p-3"
          style={{
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
          }}
        >
          <HexColorPicker color={value} onChange={onChange} />
          <input
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (/^#[0-9a-fA-F]{0,6}$/.test(v)) onChange(v);
            }}
            className="w-full mt-2 text-xs font-mono px-2 py-1.5 rounded-sm border-2 outline-none"
            style={{
              background: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
          />
        </div>
      )}
    </div>
  );
}

function ModeToggle({
  options,
  value,
  onChange,
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <div
      className="flex rounded-sm p-0.5 mb-2"
      style={{ background: 'var(--input-bg)', border: '1px solid var(--input-border)' }}
    >
      {options.map((opt) => (
        <button
          key={opt.id}
          className="flex-1 text-[11px] font-medium py-1 rounded-sm transition-colors"
          style={{
            background: value === opt.id ? 'var(--active-bg)' : 'transparent',
            color: value === opt.id ? 'var(--accent)' : 'var(--text-faint)',
          }}
          onClick={() => onChange(opt.id)}
          onMouseEnter={(e) => {
            if (value !== opt.id) e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            if (value !== opt.id) e.currentTarget.style.color = 'var(--text-faint)';
          }}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function StyleButton({
  active,
  onClick,
  title,
  children,
  wide,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="flex items-center justify-center rounded-sm border-2 transition-colors"
      style={{
        width: wide ? undefined : '40px',
        height: '40px',
        flex: wide ? 1 : undefined,
        background: active ? 'var(--accent-bg-tint)' : 'var(--input-bg)',
        borderColor: active ? 'var(--accent)' : 'var(--input-border)',
        color: active ? 'var(--accent)' : 'var(--text-secondary)',
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.borderColor = 'var(--text-faint)';
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.borderColor = 'var(--input-border)';
      }}
    >
      {children}
    </button>
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
      const ext = filePath.toLowerCase().split('.').pop();
      if (!['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(ext || '')) {
        setLogoError('Invalid file type. Use PNG, JPG, or SVG.');
        return;
      }

      try {
        const data = await filesystemAdapter.readFile(filePath);
        const mimeType = ext === 'svg' ? 'image/svg+xml' : `image/${ext === 'jpg' ? 'jpeg' : ext}`;

        const blob = new Blob([data], { type: mimeType });
        const rawDataUrl = await blobToDataUrl(blob);
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
        toast.error('Failed to load logo');
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
        toast.error('Failed to load logo');
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
        toast.error('Failed to load logo');
      }
    },
    [setLogo]
  );

  const sectionLabelStyle: React.CSSProperties = {
    color: 'var(--text-muted)',
  };

  return (
    <div className="space-y-6">
      <div className="h-px" style={{ background: 'var(--divider)' }} />

      <div
        className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em]"
        style={sectionLabelStyle}
      >
        Style
      </div>

      {/* Dot Style */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Dot Style
        </div>
        <div className="flex gap-1.5">
          {DOT_STYLES.map((s) => (
              <StyleButton
                key={s.id}
                active={dotStyle === s.id}
                onClick={() => setDotStyle(s.id)}
                title={s.name}
              >
                <span className="w-[18px] h-[18px]">{s.svg}</span>
              </StyleButton>
            ))}
        </div>
      </div>

      {/* Corner Style */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Eye Style
        </div>
        <div className="flex gap-1.5">
          {CORNER_STYLES.map((s) => (
              <StyleButton
                key={s.id}
                active={cornerSquareStyle === s.id}
                onClick={() => setCornerSquareStyle(s.id)}
                title={s.name}
              >
                <span className="w-[18px] h-[18px]">{s.svg}</span>
              </StyleButton>
            ))}
        </div>
      </div>

      {/* Foreground */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Foreground
        </div>
        <ModeToggle
          options={[{ id: 'solid', label: 'Solid' }, { id: 'gradient', label: 'Gradient' }]}
          value={useGradient ? 'gradient' : 'solid'}
          onChange={(id) => setUseGradient(id === 'gradient')}
        />
        {useGradient ? (
          <div className="flex gap-2">
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
        ) : (
          <ColorSwatch value={foreground} onChange={setForeground} />
        )}
      </div>

      {/* Background */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Background
        </div>
        <ModeToggle
          options={[{ id: 'solid', label: 'Solid' }, { id: 'transparent', label: 'Transparent' }]}
          value={transparentBg ? 'transparent' : 'solid'}
          onChange={(id) => setTransparentBg(id === 'transparent')}
        />
        {!transparentBg && (
          <ColorSwatch value={background} onChange={setBackground} />
        )}
      </div>

      {/* Logo */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Logo / Image
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleLogoUpload}
          className="hidden"
        />

        {logo ? (
          <div className="space-y-2">
            <div
              className="flex items-center gap-2 p-2 rounded-sm border"
              style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
            >
              <img
                src={logo.src}
                alt="Logo"
                className="w-10 h-10 object-contain rounded-sm"
              />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>Logo added</div>
                <div className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Size: {logo.size}%</div>
              </div>
              <button
                onClick={() => setLogo(null)}
                className="text-xs hover:underline"
                style={{ color: 'var(--danger)' }}
              >
                Remove
              </button>
            </div>

            {/* Logo Size Slider */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Size</span>
                <span className="text-[10px] font-mono" style={{ color: 'var(--text-faint)' }}>{logo.size}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="40"
                value={logo.size}
                onChange={(e) => setLogo({ ...logo, size: Number(e.target.value) })}
                className="w-full accent-accent h-1"
              />
              <div className="flex justify-between text-[9px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                <span>Small</span>
                <span>Large</span>
              </div>
              {logo.size > 30 && (
                <div
                  className="text-[9px] mt-1 p-1.5 rounded-sm border"
                  style={{
                    color: 'var(--accent)',
                    background: 'var(--accent-bg-tint)',
                    borderColor: 'var(--accent)',
                    borderWidth: '1px',
                  }}
                >
                  Large logos may reduce scanability — use EC level Q or H
                </div>
              )}
            </div>

            {/* Logo Shape */}
            <div className="flex gap-1.5">
              <StyleButton
                active={logo.shape === 'square'}
                onClick={() => setLogo({ ...logo, shape: 'square' })}
                title="Square"
                wide
              >
                <span className="text-[11px] font-semibold">Square</span>
              </StyleButton>
              <StyleButton
                active={logo.shape === 'circle'}
                onClick={() => setLogo({ ...logo, shape: 'circle' })}
                title="Circle"
                wide
              >
                <span className="text-[11px] font-semibold">Circle</span>
              </StyleButton>
            </div>
          </div>
        ) : (
          <>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleLogoDrop}
              className="h-20 flex flex-col items-center justify-center gap-1 cursor-pointer rounded-sm border-2 border-dashed transition-colors"
              style={{
                background: isTauriDragging ? 'var(--accent-bg-tint)' : logoError ? 'rgba(239, 68, 68, 0.05)' : 'var(--dropzone-bg)',
                borderColor: isTauriDragging ? 'var(--accent)' : logoError ? 'var(--danger)' : 'var(--dropzone-border)',
              }}
              onMouseEnter={(e) => {
                if (!isTauriDragging && !logoError) {
                  e.currentTarget.style.borderColor = 'var(--accent)';
                  e.currentTarget.style.background = 'var(--accent-bg-tint)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isTauriDragging && !logoError) {
                  e.currentTarget.style.borderColor = 'var(--dropzone-border)';
                  e.currentTarget.style.background = 'var(--dropzone-bg)';
                }
              }}
            >
              <svg className="w-5 h-5" style={{ color: 'var(--text-faint)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <div className="text-xs" style={{ color: 'var(--text-faint)' }}>
                {isTauriDragging ? 'Drop to add logo' : 'Drop logo or click to upload'}
              </div>
            </div>
            {logoError && (
              <div
                className="text-[9px] mt-1.5 p-1.5 rounded-sm border"
                style={{
                  color: 'var(--danger)',
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'var(--danger)',
                }}
              >
                {logoError}
              </div>
            )}
          </>
        )}
      </div>

      {/* Error Correction */}
      <div>
        <div className="text-xs font-medium mb-1.5" style={{ color: 'var(--text-muted)' }}>
          Error Correction
        </div>
        <div className="flex gap-1.5">
          {EC_LEVELS.map((ec) => (
            <button
              key={ec.id}
              onClick={() => setErrorCorrection(ec.id)}
              className="w-10 h-9 font-mono text-xs font-semibold rounded-sm border-2 transition-colors"
              style={{
                background: errorCorrection === ec.id ? 'var(--accent)' : 'var(--input-bg)',
                borderColor: errorCorrection === ec.id ? 'var(--accent)' : 'var(--input-border)',
                color: errorCorrection === ec.id ? 'var(--btn-primary-text)' : 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => {
                if (errorCorrection !== ec.id) e.currentTarget.style.borderColor = 'var(--text-faint)';
              }}
              onMouseLeave={(e) => {
                if (errorCorrection !== ec.id) e.currentTarget.style.borderColor = 'var(--input-border)';
              }}
            >
              {ec.id}
            </button>
          ))}
        </div>
        <div className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>
          {EC_LEVELS.find((ec) => ec.id === errorCorrection)?.percent} recovery —{' '}
          {EC_LEVELS.find((ec) => ec.id === errorCorrection)?.desc}
        </div>
        {logo && (errorCorrection === 'L' || errorCorrection === 'M') && (
          <div
            className="text-[10px] mt-1 p-1.5 rounded-sm border"
            style={{
              color: 'var(--accent)',
              background: 'var(--accent-bg-tint)',
              borderColor: 'var(--accent)',
            }}
          >
            Tip: Use Q or H when embedding a logo for best results
          </div>
        )}
      </div>
    </div>
  );
}
