import { useState } from 'react';
import type { CreateCodeRequest } from '../../api/types';

interface CreateCodeFormProps {
  isCreating: boolean;
  onSubmit: (body: CreateCodeRequest) => void;
  onCancel: () => void;
}

export function CreateCodeForm({ isCreating, onSubmit, onCancel }: CreateCodeFormProps) {
  const [destinationUrl, setDestinationUrl] = useState('');
  const [label, setLabel] = useState('');
  const [customCode, setCustomCode] = useState('');
  const [expiresAt, setExpiresAt] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!destinationUrl.trim()) return;

    onSubmit({
      destinationUrl: destinationUrl.trim(),
      label: label.trim() || undefined,
      customCode: customCode.trim() || undefined,
      expiresAt: expiresAt || undefined,
    });
  };

  const inputClassName =
    'w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all border-2 focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]';

  const inputStyle: React.CSSProperties = {
    background: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-primary)',
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--accent)';
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.currentTarget.style.borderColor = 'var(--input-border)';
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
      <div
        className="font-mono text-base font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        New Dynamic Code
      </div>

      <div>
        <label
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Destination URL *
        </label>
        <input
          type="url"
          value={destinationUrl}
          onChange={(e) => setDestinationUrl(e.target.value)}
          placeholder="https://example.com"
          required
          className={inputClassName}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div>
        <label
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Label
        </label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="My Link (optional)"
          className={inputClassName}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div>
        <label
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Custom Short Code
        </label>
        <input
          type="text"
          value={customCode}
          onChange={(e) => setCustomCode(e.target.value)}
          placeholder="my-link (optional)"
          className={inputClassName}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div>
        <label
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
          style={{ color: 'var(--text-muted)' }}
        >
          Expires At
        </label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          className={inputClassName}
          style={inputStyle}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={!destinationUrl.trim() || isCreating}
          className="flex-1 py-2.5 rounded-sm text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'var(--accent)',
            color: 'var(--btn-primary-text)',
          }}
        >
          {isCreating ? 'Creating...' : 'Create Code'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 rounded-sm text-sm font-semibold border transition-all"
          style={{
            background: 'var(--btn-secondary-bg)',
            borderColor: 'var(--border)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
