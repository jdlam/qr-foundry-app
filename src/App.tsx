import { useState } from 'react';
import { Toaster } from 'sonner';
import { GeneratorView } from './components/generator/GeneratorView';
import { ScannerView } from './components/scanner/ScannerView';
import { HistoryView } from './components/history/HistoryView';
import { TemplatesView } from './components/templates/TemplatesView';
import { BatchView } from './components/batch/BatchView';

type TabId = 'generator' | 'batch' | 'scanner' | 'history' | 'templates';

interface Tab {
  id: TabId;
  label: string;
  icon: string;
}

const TABS: Tab[] = [
  { id: 'generator', label: 'Generator', icon: '◧' },
  { id: 'batch', label: 'Batch', icon: '▤' },
  { id: 'scanner', label: 'Scanner', icon: '⊞' },
  { id: 'history', label: 'History', icon: '↻' },
  { id: 'templates', label: 'Templates', icon: '◫' },
];

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generator');

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
      default:
        return null;
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-bg text-text rounded-xl border border-border">
      {/* Title Bar */}
      <div
        className="h-11 bg-surface border-b border-border flex items-center px-4 shrink-0"
        data-tauri-drag-region
      >
        <div className="flex gap-1.5 mr-3">
          <div className="w-3 h-3 rounded-full bg-[#ff5f57]" />
          <div className="w-3 h-3 rounded-full bg-[#febc2e]" />
          <div className="w-3 h-3 rounded-full bg-[#28c840]" />
        </div>
        <div className="flex-1 text-center" data-tauri-drag-region>
          <span
            className="font-mono text-sm font-bold tracking-tight"
            style={{
              background: 'linear-gradient(135deg, var(--accent), #ef4444)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            ◧ QR Foundry
          </span>
        </div>
        <div className="w-16" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">{renderContent()}</div>

      {/* Bottom Tab Bar */}
      <div className="h-10 bg-surface border-t border-border flex items-center justify-center gap-0.5 shrink-0 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-[11px] font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-accent/15 border border-accent/30 text-accent font-semibold'
                : 'text-muted hover:text-text border border-transparent'
            }`}
          >
            <span className="text-sm">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            color: 'var(--text)',
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
