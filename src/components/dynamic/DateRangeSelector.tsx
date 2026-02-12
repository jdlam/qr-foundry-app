import type { CSSProperties } from 'react';
import type { Granularity } from '../../api/types';

interface DateRangeSelectorProps {
  dateRange: { start: string; end: string };
  granularity: Granularity;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onGranularityChange: (granularity: Granularity) => void;
}

function formatLocalDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function daysAgo(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: formatLocalDate(start),
    end: formatLocalDate(end),
  };
}

const PRESETS = [
  { label: '7d', days: 7 },
  { label: '30d', days: 30 },
  { label: '90d', days: 90 },
];

export function DateRangeSelector({ dateRange, granularity, onDateRangeChange, onGranularityChange }: DateRangeSelectorProps) {
  const inputClassName = 'text-xs rounded-sm px-2 py-1 outline-none border';
  const inputStyle: CSSProperties = {
    background: 'var(--input-bg)',
    borderColor: 'var(--input-border)',
    color: 'var(--text-secondary)',
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Quick Presets */}
      <div className="flex gap-1">
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => onDateRangeChange(daysAgo(preset.days))}
            className="text-[11px] font-semibold px-2 py-1 rounded-sm border transition-colors"
            style={{
              background: 'var(--input-bg)',
              borderColor: 'var(--input-border)',
              color: 'var(--text-muted)',
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.color = 'var(--accent)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--input-border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Date Inputs */}
      <input
        type="date"
        value={dateRange.start}
        onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
        className={inputClassName}
        style={inputStyle}
        aria-label="Start date"
      />
      <span className="text-[11px]" style={{ color: 'var(--text-faint)' }}>to</span>
      <input
        type="date"
        value={dateRange.end}
        onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
        className={inputClassName}
        style={inputStyle}
        aria-label="End date"
      />

      {/* Granularity */}
      <select
        value={granularity}
        onChange={(e) => onGranularityChange(e.target.value as Granularity)}
        aria-label="Granularity"
        className={`${inputClassName} cursor-pointer appearance-none`}
        style={{
          ...inputStyle,
          paddingRight: '20px',
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' fill='none' stroke='%239ca3af' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 4px center',
        }}
      >
        <option value="hour">Hour</option>
        <option value="day">Day</option>
        <option value="week">Week</option>
      </select>
    </div>
  );
}
