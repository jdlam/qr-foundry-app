import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { AuthModal } from '../auth/AuthModal';

type TabId = 'generator' | 'batch' | 'scanner' | 'history' | 'templates' | 'dynamic';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: 'pro' | 'soon';
}

function formatTierLabel(tier: string, trialDaysRemaining?: number): string {
  switch (tier) {
    case 'pro_trial':
      return `Pro Trial (${trialDaysRemaining ?? 0}d left)`;
    case 'pro':
      return 'Pro';
    case 'subscription':
      return 'Subscription';
    default:
      return 'Free tier';
  }
}

const NAV_ITEMS: NavItem[] = [
  {
    id: 'generator',
    label: 'Generator',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
        <rect x="17" y="17" width="4" height="4" />
        <line x1="14" y1="17" x2="14" y2="21" />
        <line x1="17" y1="14" x2="21" y2="14" />
      </svg>
    ),
  },
  {
    id: 'batch',
    label: 'Batch',
    badge: 'pro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="3" y1="15" x2="21" y2="15" />
        <line x1="9" y1="3" x2="9" y2="21" />
      </svg>
    ),
  },
  {
    id: 'scanner',
    label: 'Scanner',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 7V5a2 2 0 0 1 2-2h2" />
        <path d="M17 3h2a2 2 0 0 1 2 2v2" />
        <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
        <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
        <line x1="3" y1="12" x2="21" y2="12" />
      </svg>
    ),
  },
  {
    id: 'history',
    label: 'History',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: 'templates',
    label: 'Templates',
    badge: 'pro',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="1" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    id: 'dynamic',
    label: 'Dynamic Codes',
    badge: 'soon',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
        <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      </svg>
    ),
  },
];

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { user, plan, isLoggedIn, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  return (
    <div
      className="w-[220px] flex flex-col shrink-0 transition-colors"
      style={{
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className="flex items-center gap-2.5 w-full text-left text-sm font-medium transition-colors rounded-sm"
              style={{
                padding: isActive ? '8px 12px 8px 9px' : '8px 12px',
                background: isActive ? 'var(--active-bg)' : 'transparent',
                color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }
              }}
            >
              <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
                {item.icon}
              </span>
              <span className="flex-1">{item.label}</span>
              {item.badge && (
                <span
                  className="font-mono text-[9px] font-bold uppercase tracking-wide px-[5px] py-px rounded-sm leading-snug"
                  style={{
                    background: item.badge === 'pro' ? 'var(--badge-pro-bg)' : 'var(--badge-soon-bg)',
                    color: item.badge === 'pro' ? 'var(--badge-pro-text)' : 'var(--badge-soon-text)',
                  }}
                >
                  {item.badge === 'pro' ? 'PRO' : 'SOON'}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* User section */}
      <div
        className="p-3 transition-colors"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {isLoggedIn ? (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2.5 p-2">
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-text, #fff)',
                }}
              >
                <span className="text-xs font-bold uppercase">
                  {user?.email?.charAt(0) ?? '?'}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className="text-[13px] font-medium truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {user?.email}
                </div>
                <div
                  className="text-[11px] font-mono"
                  style={{ color: 'var(--text-faint)' }}
                >
                  {plan ? formatTierLabel(plan.tier, plan.trialDaysRemaining) : 'Free tier'}
                </div>
              </div>
            </div>
            <button
              onClick={logout}
              className="text-[11px] font-medium px-2 py-1 rounded-sm text-left transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-secondary)';
                e.currentTarget.style.background = 'var(--hover-bg)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-faint)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              Sign Out
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-2.5 p-2 rounded-sm cursor-pointer transition-colors"
            style={{ background: 'transparent' }}
            onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            onClick={() => setAuthModalOpen(true)}
          >
            <div
              className="w-8 h-8 rounded-sm flex items-center justify-center shrink-0"
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--border)',
                color: 'var(--text-faint)',
              }}
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="flex-1">
              <div className="text-[13px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                Sign In
              </div>
              <div className="text-[11px] font-mono" style={{ color: 'var(--text-faint)' }}>
                Free tier
              </div>
            </div>
          </div>
        )}
      </div>

      <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
    </div>
  );
}

export type { TabId };
