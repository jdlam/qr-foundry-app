import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useTemplates, type Template } from '../../hooks/useTemplates';
import { useQrStore } from '../../stores/qrStore';

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
  }, [
    newTemplateName,
    store,
    saveTemplate,
  ]);

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
      <div className="w-72 border-r border-border flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <div className="text-[10px] font-bold text-muted uppercase tracking-wider">
              Templates ({templates.length})
            </div>
            <button
              onClick={() => {
                setIsCreating(true);
                setSelectedTemplate(null);
              }}
              className="text-[10px] font-semibold bg-accent/20 border border-accent/40 text-accent px-2 py-1 rounded hover:bg-accent/30 transition-colors"
            >
              + Save Current
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoading ? (
            <div className="text-center text-dim text-xs py-8">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="text-center text-dim text-xs py-8">
              No templates yet. Save your current style as a template!
            </div>
          ) : (
            templates.map((template) => {
              const preview = getStylePreview(template.styleJson);
              return (
                <div
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all flex items-center gap-3 ${
                    selectedTemplate?.id === template.id
                      ? 'bg-accent/10 border-accent/30'
                      : 'bg-surface-hover border-border hover:border-accent/20'
                  }`}
                >
                  {/* Style Preview */}
                  <div
                    className="w-10 h-10 rounded-md border-2 border-border flex items-center justify-center shrink-0"
                    style={{ background: preview.bg }}
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
                    <div className="text-xs font-semibold text-text flex items-center gap-1.5">
                      {template.name}
                      {template.isDefault && (
                        <span className="text-[9px] bg-accent/20 text-accent px-1.5 rounded">
                          Default
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-dim mt-0.5">
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
      <div
        className="flex-1 flex flex-col items-center justify-center p-6"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--surface-hover) 0%, var(--bg) 70%)',
        }}
      >
        {isCreating ? (
          <div className="text-center max-w-md w-full">
            <div className="text-5xl mb-4">◫</div>
            <div className="text-lg text-text font-semibold mb-4">Save as Template</div>
            <input
              type="text"
              value={newTemplateName}
              onChange={(e) => setNewTemplateName(e.target.value)}
              placeholder="Template name..."
              className="w-full bg-surface border border-border rounded-lg px-4 py-3 text-sm text-text outline-none focus:border-accent/50 mb-4"
              autoFocus
            />
            <div className="text-xs text-dim mb-4">
              This will save your current style settings (colors, dots, logo, etc.)
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleSaveCurrentAsTemplate}
                disabled={!newTemplateName.trim()}
                className="px-6 py-2 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Save Template
              </button>
              <button
                onClick={() => {
                  setIsCreating(false);
                  setNewTemplateName('');
                }}
                className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : selectedTemplate ? (
          <div className="text-center max-w-md">
            <div className="text-5xl mb-4">◫</div>
            <div className="text-lg text-text font-semibold mb-2">{selectedTemplate.name}</div>
            {selectedTemplate.isDefault && (
              <div className="text-xs text-accent mb-4">★ Default Template</div>
            )}
            <div className="flex gap-2 mt-4 justify-center flex-wrap">
              <button
                onClick={() => handleApplyTemplate(selectedTemplate)}
                className="px-4 py-2 bg-accent/20 border border-accent/50 text-accent rounded-lg text-sm font-semibold hover:bg-accent/30 transition-all"
              >
                Apply Style
              </button>
              {!selectedTemplate.isDefault && (
                <button
                  onClick={() => handleSetDefault(selectedTemplate.id)}
                  className="px-4 py-2 bg-surface-hover border border-border rounded-lg text-sm font-semibold hover:bg-border/50 transition-all"
                >
                  ★ Set as Default
                </button>
              )}
              <button
                onClick={() => handleDelete(selectedTemplate.id)}
                className="px-4 py-2 bg-danger/10 border border-danger/30 text-danger rounded-lg text-sm font-semibold hover:bg-danger/20 transition-all"
              >
                🗑 Delete
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center text-dim">
            <span className="text-5xl block mb-3 opacity-30">◫</span>
            <div className="text-sm text-muted">Select a template to preview</div>
            <div className="text-[11px] mt-1">Or save your current style as a new template</div>
          </div>
        )}
      </div>
    </div>
  );
}
