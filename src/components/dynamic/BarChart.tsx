interface BarChartItem {
  label: string;
  value: number;
  subLabel?: string;
}

interface BarChartProps {
  items: BarChartItem[];
  maxItems?: number;
}

export function BarChart({ items, maxItems = 10 }: BarChartProps) {
  const displayed = items.slice(0, maxItems);
  const maxValue = Math.max(...displayed.map((i) => i.value), 1);

  if (displayed.length === 0) {
    return (
      <div className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>
        No data
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {displayed.map((item, index) => (
        <div key={`${item.label}-${index}`} className="flex items-center gap-2">
          <div className="w-24 shrink-0 text-right">
            <div className="text-[11px] truncate" style={{ color: 'var(--text-secondary)' }}>{item.label}</div>
            {item.subLabel && (
              <div className="text-[9px] truncate" style={{ color: 'var(--text-faint)' }}>{item.subLabel}</div>
            )}
          </div>
          <div className="flex-1 h-5 rounded-sm overflow-hidden" style={{ background: 'var(--input-bg)' }}>
            <div
              className="h-full rounded-sm transition-all"
              style={{
                width: `${(item.value / maxValue) * 100}%`,
                background: 'var(--accent)',
                minWidth: item.value > 0 ? '2px' : '0',
              }}
            />
          </div>
          <span className="font-mono text-[11px] w-10 text-right shrink-0" style={{ color: 'var(--text-muted)' }}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
}
