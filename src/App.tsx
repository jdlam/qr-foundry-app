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
import { AuthModal } from './components/auth/AuthModal';
import { DynamicCodesView } from './components/dynamic/DynamicCodesView';

// Ensure theme is initialized
import './stores/themeStore';
import { useAuthStore } from './stores/authStore';
import { useAuthModalStore } from './stores/authModalStore';

// Dev-only: expose auth simulation helpers in browser console
if (import.meta.env.DEV) {
  const dev = {
    simulateFreeTier: () => useAuthStore.setState({
      user: { id: 'dev-1', email: 'dev@test.com', createdAt: '2025-01-01' },
      plan: {
        tier: 'free',
        features: ['basic_qr_types', 'advanced_qr_types', 'advanced_customization', 'svg_export', 'pdf_export', 'eps_export', 'batch_generation', 'templates', 'unlimited_history', 'web_asset_pack'],
        maxCodes: 0,
      },
      token: 'dev-token',
    }),
    simulateSubscription: () => useAuthStore.setState({
      user: { id: 'dev-1', email: 'dev@test.com', createdAt: '2025-01-01' },
      plan: {
        tier: 'subscription',
        features: ['basic_qr_types', 'advanced_qr_types', 'advanced_customization', 'svg_export', 'pdf_export', 'eps_export', 'batch_generation', 'templates', 'unlimited_history', 'web_asset_pack', 'dynamic_codes', 'analytics'],
        maxCodes: 25,
      },
      token: 'dev-token',
    }),
    simulateLoggedOut: () => useAuthStore.setState({ user: null, plan: null, token: null }),
  };
  (window as unknown as Record<string, unknown>).__dev = dev;
  console.log('[dev] Auth helpers available: __dev.simulateFreeTier(), __dev.simulateSubscription(), __dev.simulateLoggedOut()');
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generator');
  const authModalOpen = useAuthModalStore((s) => s.isOpen);

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
        return <DynamicCodesView />;
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

      <AuthModal
        open={authModalOpen}
        onOpenChange={(open) => {
          if (open) useAuthModalStore.getState().open();
          else useAuthModalStore.getState().close();
        }}
      />
    </div>
  );
}

export default App;
