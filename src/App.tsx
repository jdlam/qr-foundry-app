import { useState, useEffect } from 'react';
import { Toaster } from 'sonner';
import { TitleBar } from './components/layout/TitleBar';
import { Sidebar, type TabId } from './components/layout/Sidebar';
import { StatusBar } from './components/layout/StatusBar';
import { GeneratorView } from './components/generator/GeneratorView';
import { ScannerView } from './components/scanner/ScannerView';
import { HistoryView } from './components/history/HistoryView';
import { TemplatesView } from './components/templates/TemplatesView';
import { BatchView } from './components/batch/BatchView';

// Ensure theme is initialized
import './stores/themeStore';
import { useAuthStore } from './stores/authStore';

function DynamicCodesPlaceholder() {
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
        Create QR codes that can be updated after printing. Track scans, manage redirects, and view analytics.
      </div>
      <span
        className="font-mono text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-sm mt-1"
        style={{
          background: 'var(--badge-soon-bg)',
          color: 'var(--badge-soon-text)',
        }}
      >
        Coming Soon
      </span>
    </div>
  );
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generator');

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'generator':
        return <GeneratorView />;
      case 'scanner':
        return <ScannerView />;
      case 'batch':
        return <BatchView />;
      case 'history':
        return <HistoryView />;
      case 'templates':
        return <TemplatesView />;
      case 'dynamic':
        return <DynamicCodesPlaceholder />;
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'var(--app-bg)' }}>
      <TitleBar />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <main
          className="flex-1 overflow-hidden flex flex-col transition-colors"
          style={{ background: 'var(--main-bg)' }}
        >
          {renderContent()}
        </main>
      </div>
      <StatusBar />

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--panel-bg)',
            border: '1px solid var(--border)',
            color: 'var(--text-primary)',
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
