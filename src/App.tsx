import { useState, useEffect } from 'react';
import { toast, Toaster } from 'sonner';
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
import { useUpdateCheck } from './hooks/useUpdateCheck';

// Dev-only: expose auth helpers in browser console (calls real impersonation API)
if (import.meta.env.DEV) {
  const dev = {
    simulateFreeTier: () => useAuthStore.getState().impersonate('free'),
    simulateSubscription: (addonCount = 0) => useAuthStore.getState().impersonate('subscription', addonCount),
    simulateLoggedOut: () => useAuthStore.getState().logout(),
  };
  (window as unknown as Record<string, unknown>).__dev = dev;
  console.log('[dev] Auth helpers available: __dev.simulateFreeTier(), __dev.simulateSubscription(addonCount?), __dev.simulateLoggedOut()');
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('generator');
  const authModalOpen = useAuthModalStore((s) => s.isOpen);
  const { updateAvailable, installing, install, dismiss } = useUpdateCheck();

  useEffect(() => {
    useAuthStore.getState().initialize();
  }, []);

  useEffect(() => {
    if (!updateAvailable) return;
    toast('A new version is available', {
      id: 'app-update',
      duration: Infinity,
      action: {
        label: installing ? 'Installing...' : 'Install & restart',
        onClick: install,
      },
      cancel: {
        label: 'Later',
        onClick: dismiss,
      },
    });
  }, [updateAvailable, installing, install, dismiss]);

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
