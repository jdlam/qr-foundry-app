import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { useDynamicCodes } from '../../hooks/useDynamicCodes';
import { useFeatureAccess } from '../../hooks/useFeatureAccess';
import { useAuthModalStore } from '../../stores/authModalStore';
import { useAuth } from '../../hooks/useAuth';
import { CreateCodeForm } from './CreateCodeForm';
import { QuotaBar } from './QuotaBar';
import { AnalyticsView } from './AnalyticsView';
import { AnalyticsOverview } from './AnalyticsOverview';
import type { DynamicQRRecord, CodeStatus, UpdateCodeRequest } from '../../api/types';

type RightPanelView = 'empty' | 'detail' | 'create' | 'code-analytics' | 'overview';
type LeftPanelMode = 'codes' | 'analytics';

const STATUS_COLORS: Record<CodeStatus, string> = {
  active: 'var(--success, #22c55e)',
  paused: 'var(--warning, #f59e0b)',
  expired: 'var(--text-faint)',
};

function formatTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}

function truncateUrl(url: string, max = 30): string {
  const stripped = url.replace(/^https?:\/\//, '');
  return stripped.length > max ? stripped.slice(0, max) + '...' : stripped;
}

export function DynamicCodesView() {
  const { hasAccess, requireAccess } = useFeatureAccess('dynamic_codes');
  const { isLoggedIn } = useAuth();
  const openAuthModal = useAuthModalStore((s) => s.open);

  const {
    codes,
    selectedCode,
    usage,
    statusFilter,
    isLoadingCodes,
    isCreating,
    isUpdating,
    isDeleting,
    fetchCodes,
    fetchUsage,
    createCode,
    updateCode,
    deleteCode,
    selectCode,
    setStatusFilter,
  } = useDynamicCodes();

  const [rightPanel, setRightPanel] = useState<RightPanelView>('empty');
  const [leftMode, setLeftMode] = useState<LeftPanelMode>('codes');
  const [editingUrl, setEditingUrl] = useState('');
  const [editingLabel, setEditingLabel] = useState('');

  useEffect(() => {
    if (hasAccess) {
      fetchCodes(statusFilter ?? undefined);
      fetchUsage();
    }
  }, [hasAccess, fetchCodes, fetchUsage, statusFilter]);

  const handleSelectCode = useCallback((code: DynamicQRRecord) => {
    selectCode(code);
    setEditingUrl(code.destinationUrl);
    setEditingLabel(code.label || '');
    setLeftMode('codes');
    setRightPanel('detail');
  }, [selectCode]);

  const handleShowCreate = useCallback(() => {
    setRightPanel('create');
  }, []);

  const handleCancelCreate = useCallback(() => {
    setRightPanel(selectedCode ? 'detail' : 'empty');
  }, [selectedCode]);

  const handleCreate = useCallback(async (body: Parameters<typeof createCode>[0]) => {
    const code = await createCode(body);
    if (code) {
      setEditingUrl(code.destinationUrl);
      setEditingLabel(code.label || '');
      setRightPanel('detail');
    }
  }, [createCode]);

  const handleSaveChanges = useCallback(async () => {
    if (!selectedCode) return;
    const trimmedUrl = editingUrl.trim();
    if (!trimmedUrl) return;
    const trimmedLabel = editingLabel.trim();
    const changes: UpdateCodeRequest = {};
    if (trimmedUrl !== selectedCode.destinationUrl) changes.destinationUrl = trimmedUrl;
    if (trimmedLabel !== (selectedCode.label || '')) {
      changes.label = trimmedLabel || null;
    }
    if (Object.keys(changes).length === 0) return;
    await updateCode(selectedCode.shortCode, changes);
  }, [selectedCode, editingUrl, editingLabel, updateCode]);

  const handleTogglePause = useCallback(async () => {
    if (!selectedCode) return;
    const newStatus = selectedCode.status === 'active' ? 'paused' : 'active';
    await updateCode(selectedCode.shortCode, { status: newStatus });
  }, [selectedCode, updateCode]);

  const handleDelete = useCallback(async () => {
    if (!selectedCode) return;
    if (!window.confirm(`Delete qrfo.link/${selectedCode.shortCode}? This cannot be undone.`)) return;
    const success = await deleteCode(selectedCode.shortCode);
    if (success) {
      setRightPanel('empty');
    }
  }, [selectedCode, deleteCode]);

  const handleCopyUrl = useCallback(async () => {
    if (!selectedCode) return;
    try {
      await navigator.clipboard.writeText(`https://qrfo.link/${selectedCode.shortCode}`);
      toast.success('Short URL copied');
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  }, [selectedCode]);

  const handleViewCodeAnalytics = useCallback(() => {
    if (!selectedCode) return;
    setRightPanel('code-analytics');
  }, [selectedCode]);

  const handleBackFromAnalytics = useCallback(() => {
    setRightPanel(selectedCode ? 'detail' : 'empty');
  }, [selectedCode]);

  const handleSwitchToOverview = useCallback(() => {
    setLeftMode('analytics');
    setRightPanel('overview');
  }, []);

  const handleSwitchToCodes = useCallback(() => {
    setLeftMode('codes');
    setRightPanel(selectedCode ? 'detail' : 'empty');
  }, [selectedCode]);

  const handleFilterChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setStatusFilter(value === 'all' ? null : value as CodeStatus);
  }, [setStatusFilter]);

  // Feature gate: show upsell if no access
  if (!hasAccess) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-12">
        <div
          className="w-16 h-16 rounded-sm flex items-center justify-center"
          style={{
            background: 'var(--placeholder-bg)',
            border: '2px solid var(--placeholder-border)',
            color: 'var(--text-faint)',
          }}
        >
          <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
          </svg>
        </div>
        <div className="font-mono text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
          Dynamic Codes
        </div>
        <div className="text-sm text-center max-w-[360px] leading-relaxed" style={{ color: 'var(--text-muted)' }}>
          Create QR codes with changeable destinations. Track scans, manage redirects, and view analytics.
        </div>
        <button
          onClick={isLoggedIn ? requireAccess : openAuthModal}
          className="px-6 py-2.5 rounded-sm text-sm font-semibold transition-all"
          style={{
            background: 'var(--accent)',
            color: 'var(--btn-primary-text)',
          }}
          onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
          onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
        >
          {isLoggedIn ? 'Upgrade to Unlock' : 'Sign In to Get Started'}
        </button>
      </div>
    );
  }

  const hasChanges = selectedCode && (
    editingUrl.trim() !== selectedCode.destinationUrl ||
    editingLabel.trim() !== (selectedCode.label || '')
  );

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Left Panel */}
      <div
        className="w-72 flex flex-col overflow-hidden shrink-0"
        style={{ borderRight: '1px solid var(--border)' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid var(--border)' }}>
          {/* Codes / Analytics toggle */}
          <div className="flex gap-1 mb-3">
            {(['codes', 'analytics'] as const).map((mode) => (
              <button
                key={mode}
                onClick={mode === 'codes' ? handleSwitchToCodes : handleSwitchToOverview}
                className="flex-1 text-[11px] font-semibold py-1.5 rounded-sm transition-colors uppercase tracking-wide"
                style={{
                  background: leftMode === mode ? 'var(--active-bg)' : 'transparent',
                  color: leftMode === mode ? 'var(--accent)' : 'var(--text-muted)',
                  border: leftMode === mode ? '1px solid var(--accent)' : '1px solid var(--input-border)',
                }}
                onMouseEnter={(e) => {
                  if (leftMode !== mode) { e.currentTarget.style.background = 'var(--hover-bg)'; e.currentTarget.style.color = 'var(--text-secondary)'; }
                }}
                onMouseLeave={(e) => {
                  if (leftMode !== mode) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)'; }
                }}
              >
                {mode}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-between mb-2">
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em]"
              style={{ color: 'var(--text-muted)' }}
            >
              {leftMode === 'codes'
                ? `Dynamic Codes${usage ? ` (${usage.active}/${usage.limit})` : ''}`
                : 'Analytics Overview'}
            </div>
          </div>
          {leftMode === 'codes' && <div className="flex gap-2">
            <select
              value={statusFilter ?? 'all'}
              onChange={handleFilterChange}
              className="flex-1 text-xs rounded-sm px-2 py-1.5 outline-none border cursor-pointer appearance-none"
              style={{
                background: 'var(--input-bg)',
                borderColor: 'var(--input-border)',
                color: 'var(--text-secondary)',
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%239ca3af' stroke-width='1.5'/%3E%3C/svg%3E")`,
                backgroundRepeat: 'no-repeat',
                backgroundPosition: 'right 6px center',
              }}
            >
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
              <option value="expired">Expired</option>
            </select>
            <button
              onClick={handleShowCreate}
              className="px-3 py-1.5 rounded-sm text-xs font-semibold transition-all"
              style={{
                background: 'var(--accent)',
                color: 'var(--btn-primary-text)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9'; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = '1'; }}
            >
              + New
            </button>
          </div>}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {isLoadingCodes && codes.length === 0 ? (
            <div className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>Loading...</div>
          ) : codes.length === 0 ? (
            <div className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>
              No dynamic codes yet
            </div>
          ) : (
            codes.map((code) => (
              <button
                type="button"
                key={code.shortCode}
                onClick={() => handleSelectCode(code)}
                className="w-full text-left p-3 rounded-sm border cursor-pointer transition-all"
                style={{
                  background: selectedCode?.shortCode === code.shortCode ? 'var(--active-bg)' : 'var(--input-bg)',
                  borderColor: selectedCode?.shortCode === code.shortCode ? 'var(--accent)' : 'var(--border)',
                }}
                onMouseEnter={(e) => {
                  if (selectedCode?.shortCode !== code.shortCode) e.currentTarget.style.borderColor = 'var(--text-faint)';
                }}
                onMouseLeave={(e) => {
                  if (selectedCode?.shortCode !== code.shortCode) e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs font-medium" style={{ color: 'var(--text-primary)' }}>
                    {code.shortCode}
                  </span>
                  <span
                    className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm uppercase"
                    style={{
                      background: `color-mix(in srgb, ${STATUS_COLORS[code.status]} 15%, transparent)`,
                      color: STATUS_COLORS[code.status],
                    }}
                  >
                    {code.status}
                  </span>
                </div>
                <div className="text-[11px] mt-1 truncate" style={{ color: 'var(--text-muted)' }}>
                  {truncateUrl(code.destinationUrl)}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {code.label ? (
                    <span className="text-[10px] truncate" style={{ color: 'var(--text-faint)' }}>{code.label}</span>
                  ) : <span />}
                  <span className="text-[10px]" style={{ color: 'var(--text-faint)' }}>{formatTime(code.createdAt)}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
        {rightPanel === 'code-analytics' && selectedCode ? (
          <AnalyticsView shortCode={selectedCode.shortCode} onBack={handleBackFromAnalytics} />
        ) : rightPanel === 'overview' ? (
          <AnalyticsOverview onBack={handleSwitchToCodes} />
        ) : rightPanel === 'create' ? (
          <CreateCodeForm
            isCreating={isCreating}
            onSubmit={handleCreate}
            onCancel={handleCancelCreate}
          />
        ) : rightPanel === 'detail' && selectedCode ? (
          <div className="w-full max-w-md space-y-5">
            {/* Short URL */}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                  qrfo.link/{selectedCode.shortCode}
                </span>
                <button
                  onClick={handleCopyUrl}
                  className="p-1 rounded-sm transition-colors"
                  style={{ color: 'var(--text-faint)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
                  title="Copy short URL"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="1" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className="text-[9px] font-semibold px-1.5 py-0.5 rounded-sm uppercase"
                  style={{
                    background: `color-mix(in srgb, ${STATUS_COLORS[selectedCode.status]} 15%, transparent)`,
                    color: STATUS_COLORS[selectedCode.status],
                  }}
                >
                  {selectedCode.status}
                </span>
                <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
                  Created {formatTime(selectedCode.createdAt)}
                </span>
              </div>
            </div>

            {/* Editable Destination URL */}
            <div>
              <label
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Destination URL
              </label>
              <input
                type="url"
                value={editingUrl}
                onChange={(e) => setEditingUrl(e.target.value)}
                className="w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all border-2 focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              />
            </div>

            {/* Editable Label */}
            <div>
              <label
                className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-1.5 block"
                style={{ color: 'var(--text-muted)' }}
              >
                Label
              </label>
              <input
                type="text"
                value={editingLabel}
                onChange={(e) => setEditingLabel(e.target.value)}
                placeholder="Optional label"
                className="w-full text-sm rounded-sm px-3 py-2.5 outline-none transition-all border-2 focus:shadow-[0_0_0_3px_var(--accent-focus-ring)]"
                style={{
                  background: 'var(--input-bg)',
                  borderColor: 'var(--input-border)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; }}
              />
            </div>

            {/* Save Changes */}
            {hasChanges && (
              <button
                onClick={handleSaveChanges}
                disabled={isUpdating || !editingUrl.trim()}
                className="w-full py-2.5 rounded-sm text-sm font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--btn-primary-text)',
                }}
              >
                {isUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleTogglePause}
                disabled={isUpdating || selectedCode.status === 'expired'}
                className="flex-1 py-2 rounded-sm text-sm font-semibold border transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: 'var(--btn-secondary-bg)',
                  borderColor: 'var(--border)',
                  color: 'var(--text-secondary)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                {selectedCode.status === 'active' ? 'Pause' : 'Resume'}
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2 rounded-sm text-sm font-semibold border transition-all disabled:opacity-50"
                style={{
                  background: 'rgba(239, 68, 68, 0.05)',
                  borderColor: 'var(--danger)',
                  color: 'var(--danger)',
                }}
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>

            {/* View Analytics */}
            <button
              onClick={handleViewCodeAnalytics}
              className="w-full py-2 rounded-sm text-sm font-semibold border transition-all"
              style={{
                background: 'var(--btn-secondary-bg)',
                borderColor: 'var(--border)',
                color: 'var(--text-secondary)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
            >
              View Analytics
            </button>

            {/* Quota */}
            {usage && (
              <QuotaBar used={usage.active} limit={usage.limit} />
            )}
          </div>
        ) : (
          <div className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4" style={{ color: 'var(--text-faint)', opacity: 0.3 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>Select a code or create a new one</div>
            <div className="text-[11px] mt-1" style={{ color: 'var(--text-faint)' }}>
              Manage destinations, pause/resume, and track scans
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
