import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthPage } from '@/pages/AuthPage';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OverviewPage } from '@/pages/OverviewPage';
import { AthletesPage } from '@/pages/AthletesPage';
import { ConnectionsPage } from '@/pages/ConnectionsPage';
import { EventsPage } from '@/pages/EventsPage';
import { TicketsPage } from '@/pages/TicketsPage';
import { NotificationsPage } from '@/pages/NotificationsPage';
import { SettingsPage } from '@/pages/SettingsPage';

function App() {
  const { session, loading } = useAuth();
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) {
    return <AuthPage />;
  }

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage onNavigate={setActivePage} />;
      case 'athletes':
        return <AthletesPage />;
      case 'connections':
        return <ConnectionsPage />;
      case 'events':
        return <EventsPage />;
      case 'tickets':
        return <TicketsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <OverviewPage onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-dark-950">
      <Sidebar
        active={activePage}
        onNavigate={setActivePage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar active={activePage} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div key={activePage} className="animate-fade-in">
            {renderPage()}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
