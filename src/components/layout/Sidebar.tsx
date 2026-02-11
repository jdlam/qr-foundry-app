import { useState } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useAuthModalStore } from '../../stores/authModalStore';

type TabId = 'generator' | 'batch' | 'scanner' | 'history' | 'templates' | 'dynamic';

interface SidebarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  badge?: 'soon';
}

function formatTierLabel(tier: string): string {
  switch (tier) {
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

function NavButton({
  item,
  isActive,
  collapsed,
  onTabChange,
}: {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onTabChange: (tab: TabId) => void;
}) {
  return (
    <button
      onClick={() => onTabChange(item.id)}
      title={collapsed ? item.label : undefined}
      className="flex items-center gap-2.5 w-full text-left text-sm font-medium transition-colors rounded-sm"
      style={{
        padding: collapsed
          ? '8px'
          : isActive ? '8px 12px 8px 9px' : '8px 12px',
        justifyContent: collapsed ? 'center' : undefined,
        background: isActive ? 'var(--active-bg)' : 'transparent',
        color: isActive ? 'var(--accent)' : 'var(--text-muted)',
        borderLeft: collapsed
          ? undefined
          : isActive ? '3px solid var(--accent)' : '3px solid transparent',
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
      {!collapsed && (
        <>
          <span className="flex-1">{item.label}</span>
          {item.badge && (
            <span
              className="font-mono text-[9px] font-bold uppercase tracking-wide px-[5px] py-px rounded-sm leading-snug"
              style={{
                background: 'var(--badge-soon-bg)',
                color: 'var(--badge-soon-text)',
              }}
            >
              SOON
            </span>
          )}
        </>
      )}
    </button>
  );
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user, plan, isLoggedIn, logout } = useAuth();
  const openAuthModal = useAuthModalStore((s) => s.open);

  return (
    <div
      className="flex flex-col shrink-0 transition-all duration-200"
      style={{
        width: collapsed ? 54 : 220,
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--border)',
      }}
    >
      {/* Navigation */}
      <nav className="flex-1 py-3 px-2 flex flex-col gap-0.5">
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            collapsed={collapsed}
            onTabChange={onTabChange}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div
        className="p-3 transition-colors"
        style={{ borderTop: '1px solid var(--border)' }}
      >
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            {isLoggedIn ? (
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-text, #fff)',
                }}
                title={user?.email ?? 'Account'}
              >
                <span className="text-xs font-bold uppercase">
                  {user?.email?.charAt(0) ?? '?'}
                </span>
              </div>
            ) : (
              <div
                className="w-8 h-8 rounded-sm flex items-center justify-center cursor-pointer transition-colors"
                style={{
                  background: 'var(--panel-bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--text-faint)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--hover-bg)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'var(--panel-bg)'; }}
                onClick={openAuthModal}
                title="Sign In"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
            )}
            <button
              onClick={() => setCollapsed(false)}
              className="w-6 h-6 flex items-center justify-center rounded-sm transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              title="Expand sidebar"
            >
              <svg className="w-3.5 h-3.5" style={{ transform: 'rotate(180deg)' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          </div>
        ) : isLoggedIn ? (
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
                  {plan ? formatTierLabel(plan.tier) : 'Free tier'}
                </div>
              </div>
              <button
                onClick={() => setCollapsed(true)}
                className="w-6 h-6 flex items-center justify-center rounded-sm shrink-0 transition-colors"
                style={{ color: 'var(--text-faint)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = 'var(--hover-bg)';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--text-faint)';
                }}
                title="Collapse sidebar"
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="11 17 6 12 11 7" />
                  <polyline points="18 17 13 12 18 7" />
                </svg>
              </button>
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
          <div className="flex items-center gap-2.5 p-2 rounded-sm">
            <div
              className="flex items-center gap-2.5 flex-1 cursor-pointer rounded-sm transition-colors p-0"
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = ''; }}
              onClick={openAuthModal}
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
            <button
              onClick={() => setCollapsed(true)}
              className="w-6 h-6 flex items-center justify-center rounded-sm shrink-0 transition-colors"
              style={{ color: 'var(--text-faint)' }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--hover-bg)';
                e.currentTarget.style.color = 'var(--text-secondary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'var(--text-faint)';
              }}
              title="Collapse sidebar"
            >
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="11 17 6 12 11 7" />
                <polyline points="18 17 13 12 18 7" />
              </svg>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}

export type { TabId };
