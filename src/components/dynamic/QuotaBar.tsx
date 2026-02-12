interface QuotaBarProps {
  used: number;
  limit: number;
}

export function QuotaBar({ used, limit }: QuotaBarProps) {
  const percent = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const color = percent >= 90 ? 'var(--danger)' : percent >= 70 ? 'var(--warning, #f59e0b)' : 'var(--success, #22c55e)';

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span
          className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em]"
          style={{ color: 'var(--text-muted)' }}
        >
          Quota
        </span>
        <span className="font-mono text-[11px]" style={{ color: 'var(--text-faint)' }}>
          {used} / {limit} used
        </span>
      </div>
      <div
        className="h-2 rounded-sm overflow-hidden"
        style={{ background: 'var(--input-bg)' }}
      >
        <div
          className="h-full rounded-sm transition-all"
          style={{ width: `${percent}%`, background: color }}
        />
      </div>
    </div>
  );
}
