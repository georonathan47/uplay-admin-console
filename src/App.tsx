import { useState } from 'react';
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
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
