import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTemplates, type Template } from '../../hooks/useTemplates';
import { useQrStore } from '../../stores/qrStore';
import { analyticsAdapter } from '@platform';

export function TemplatesView() {
  const { templates, isLoading, fetchTemplates, saveTemplate, deleteTemplate, setDefaultTemplate } =
    useTemplates();
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');

  const store = useQrStore();

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const handleSelectTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    setIsCreating(false);
  }, []);

  const handleApplyTemplate = useCallback(
    (template: Template) => {
      try {
        const style = JSON.parse(template.styleJson);
        if (style.dotStyle) store.setDotStyle(style.dotStyle);
        if (style.cornerSquareStyle) store.setCornerSquareStyle(style.cornerSquareStyle);
        if (style.cornerDotStyle) store.setCornerDotStyle(style.cornerDotStyle);
        if (style.foreground) store.setForeground(style.foreground);
        if (style.background) store.setBackground(style.background);
        if (style.transparentBg !== undefined) store.setTransparentBg(style.transparentBg);
        if (style.useGradient !== undefined) store.setUseGradient(style.useGradient);
        if (style.gradient) store.setGradient(style.gradient);
        if (style.logo) store.setLogo(style.logo);
        if (style.errorCorrection) store.setErrorCorrection(style.errorCorrection);
        toast.success(`Applied "${template.name}" template`);
        analyticsAdapter.track('template_loaded');
      } catch {
        toast.error('Failed to apply template');
      }
    },
    [store]
  );

  const handleSaveCurrentAsTemplate = useCallback(async () => {
    if (!newTemplateName.trim()) return;

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

    const id = await saveTemplate({
      name: newTemplateName.trim(),
      styleJson,
    });

    if (id) {
      toast.success(`Saved "${newTemplateName.trim()}" template`);
      setNewTemplateName('');
      setIsCreating(false);
    } else {
      toast.error('Failed to save template');
    }
  }, [newTemplateName, store, saveTemplate]);

  const handleDelete = useCallback(
    async (id: number) => {
      if (window.confirm('Are you sure you want to delete this template?')) {
        const success = await deleteTemplate(id);
        if (success) {
          toast.success('Template deleted');
          if (selectedTemplate?.id === id) {
            setSelectedTemplate(null);
          }
        } else {
          toast.error('Failed to delete template');
        }
      }
    },
    [deleteTemplate, selectedTemplate]
  );

  const handleSetDefault = useCallback(
    async (id: number) => {
      const success = await setDefaultTemplate(id);
      if (success) {
        toast.success('Set as default template');
      } else {
        toast.error('Failed to set default template');
      }
    },
    [setDefaultTemplate]
  );

  const getStylePreview = (styleJson: string) => {
    try {
      const style = JSON.parse(styleJson);
      return {
        fg: style.foreground || '#1a1a2e',
        bg: style.background || '#ffffff',
        dotStyle: style.dotStyle || 'rounded',
      };
    } catch {
      return { fg: '#1a1a2e', bg: '#ffffff', dotStyle: 'rounded' };
    }
  };

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div
        className="w-72 flex flex-col overflow-hidden shrink-0"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          <div className="flex items-center justify-between mb-3">
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--text-muted)' }}
            >
              Templates ({templates.length})
            </div>
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedTemplate(null);
              }}
              className="text-[10px] font-semibold px-2 py-1 rounded-sm border transition-colors"
              style={{
                background: 'var(--accent-bg-tint)',
                borderColor: 'var(--accent)',
                color: 'var(--accent)',
              }}
            >
              + Save Current
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>
              No templates yet. Save your current style as a template!
            </div>
          ) : (
            templates.map((template) => {
              const preview = getStylePreview(template.styleJson);
              return (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="p-3 rounded-sm border cursor-pointer transition-all flex items-center gap-3"
                  style={{
                    background: selectedTemplate?.id === template.id ? 'var(--active-bg)' : 'var(--input-bg)',
                    borderColor: selectedTemplate?.id === template.id ? 'var(--accent)' : 'var(--border)',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedTemplate?.id !== template.id) e.currentTarget.style.borderColor = 'var(--text-faint)';
                  }}
                  onMouseLeave={(e) => {
                    if (selectedTemplate?.id !== template.id) e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  {/* Style Preview */}
                  <div
                    className="w-10 h-10 rounded-sm border-2 flex items-center justify-center shrink-0"
                    style={{ background: preview.bg, borderColor: 'var(--border)' }}
                  >
                    <div
                      className="w-4 h-4"
                      style={{
                        background: preview.fg,
                        borderRadius:
                          preview.dotStyle === 'dots'
                            ? '50%'
                            : preview.dotStyle === 'rounded'
                            ? '3px'
                            : '0',
                      }}
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                      {template.name}
                      {template.isDefault && (
                        <span
                          className="text-[9px] px-1.5 rounded-sm"
                          style={{ background: 'var(--accent-bg-tint)', color: 'var(--accent)' }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
                      {preview.dotStyle} dots
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {isCreating ? (
          <div className="text-center max-w-md w-full">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-faint)', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>Save as Template</div>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-full rounded-sm px-4 py-3 text-sm outline-none border-2 mb-4 transition-colors"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              autoFocus
            />
            <div className="text-xs mb-4" style={{ color: 'var(--text-faint)' }}>
              This will save your current style settings (colors, dots, logo, etc.)
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSaveCurrentAsTemplate}
                disabled={!newTemplateName.trim()}
                className="px-6 py-2 rounded-sm text-sm font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent-bg-tint)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                Save Template
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTemplateName('');
                }}
                className="px-4 py-2 rounded-sm text-sm font-semibold border transition-all"
                style={{
                  background: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : selectedTemplate ? (
          <div className="text-center max-w-md">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-faint)', opacity: 0.5 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>{selectedTemplate.name}</div>
            {selectedTemplate.isDefault && (
              <div className="text-xs mb-4" style={{ color: 'var(--accent)' }}>Default Template</div>
            )}
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              <button
                onClick={() => handleApplyTemplate(selectedTemplate)}
                className="px-4 py-2 rounded-sm text-sm font-semibold border transition-all"
                style={{
                  background: 'var(--accent-bg-tint)',
                  borderColor: 'var(--accent)',
                  color: 'var(--accent)',
                }}
              >
                Apply Style
              </button>
              {!selectedTemplate.isDefault && (
                <button
                  onClick={() => handleSetDefault(selectedTemplate.id)}
                  className="px-4 py-2 rounded-sm text-sm font-semibold border transition-all"
                  style={{
                    background: 'var(--btn-secondary-bg)',
                    borderColor: 'var(--border)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Set as Default
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedTemplate.id)}
                className="px-4 py-2 rounded-sm text-sm font-semibold border transition-all"
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-faint)', opacity: 0.3 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="1" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a template to preview</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>Or save your current style as a new template</div>
          </div>
        )}
      </div>
    </div>
  );
}
