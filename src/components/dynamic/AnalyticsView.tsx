import { useEffect } from 'react';
import { useAnalytics } from '../../hooks/useAnalytics';
import { BarChart } from './BarChart';
import { DateRangeSelector } from './DateRangeSelector';

interface AnalyticsViewProps {
  shortCode: string;
  onBack: () => void;
}

export function AnalyticsView({ shortCode, onBack }: AnalyticsViewProps) {
  const {
    codeAnalytics,
    isLoading,
    dateRange,
    granularity,
    fetchCodeAnalytics,
    setDateRange,
    setGranularity,
  } = useAnalytics();

  useEffect(() => {
    fetchCodeAnalytics(shortCode);
  }, [fetchCodeAnalytics, shortCode]);

  return (
    <div className="w-full max-w-lg space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          aria-label="Back to code detail"
          className="p-1 rounded-sm transition-colors"
          style={{ color: 'var(--text-faint)' }}
          onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-faint)'; }}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <div>
          <div className="font-mono text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Analytics: {shortCode}
          </div>
          <div className="text-[11px]" style={{ color: 'var(--text-faint)' }}>
            qrfo.link/{shortCode}
          </div>
        </div>
      </div>

      {/* Date Range */}
      <DateRangeSelector
        dateRange={dateRange}
        granularity={granularity}
        onDateRangeChange={(range) => {
          setDateRange(range);
        }}
        onGranularityChange={(g) => {
          setGranularity(g);
        }}
      />

      {/* Refetch button */}
      <button
        onClick={() => fetchCodeAnalytics(shortCode)}
        disabled={isLoading}
        className="text-xs font-semibold px-3 py-1.5 rounded-sm border transition-all disabled:opacity-50"
        style={{
          background: 'var(--btn-secondary-bg)',
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
        }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--text-faint)'; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
      >
        {isLoading ? 'Loading...' : 'Refresh'}
      </button>

      {isLoading && !codeAnalytics ? (
        <div className="text-center text-xs py-8" style={{ color: 'var(--text-faint)' }}>Loading analytics...</div>
      ) : codeAnalytics ? (
        <>
          {/* Total Scans */}
          <div
            className="p-4 rounded-sm border text-center"
            style={{ background: 'var(--input-bg)', borderColor: 'var(--border)' }}
          >
            <div className="font-mono text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {codeAnalytics.totalScans.toLocaleString()}
            </div>
            <div className="font-mono text-[11px] uppercase tracking-wide mt-1" style={{ color: 'var(--text-muted)' }}>
              Total Scans
            </div>
          </div>

          {/* Scans Over Time */}
          <div>
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Scans Over Time
            </div>
            <BarChart
              items={codeAnalytics.scansOverTime.map((p) => ({ label: p.date, value: p.count }))}
            />
          </div>

          {/* Top Countries */}
          <div>
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Top Countries
            </div>
            <BarChart items={codeAnalytics.topCountries.map((c) => ({ label: c.name, value: c.count }))} />
          </div>

          {/* Top Cities */}
          <div>
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Top Cities
            </div>
            <BarChart items={codeAnalytics.topCities.map((c) => ({ label: c.name, value: c.count }))} />
          </div>

          {/* Top Referrers */}
          <div>
            <div
              className="font-mono text-[11px] font-semibold uppercase tracking-[0.06em] mb-2"
              style={{ color: 'var(--text-muted)' }}
            >
              Top Referrers
            </div>
            <BarChart items={codeAnalytics.topReferers.map((r) => ({ label: r.name, value: r.count }))} />
          </div>
        </>
      ) : null}
    </div>
  );
}
