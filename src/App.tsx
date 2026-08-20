import { useState } from 'react';
import { Loader2, ShieldAlert } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { AuthPage } from '@/pages/AuthPage';
import { Sidebar, type PageId } from '@/components/layout/Sidebar';
import { Topbar } from '@/components/layout/Topbar';
import { OverviewPage } from '@/pages/OverviewPage';
import { PeoplePage } from '@/pages/PeoplePage';
import { ConnectionsPage } from '@/pages/ConnectionsPage';
import { EventsPage } from '@/pages/EventsPage';
import { SupportPage } from '@/pages/SupportPage';
import { ActivityPage } from '@/pages/ActivityPage';
import { AccountPage } from '@/pages/AccountPage';

/**
 * Shown to someone who signs in successfully but isn't a UPlay admin. Without
 * this they'd reach the dashboard and see every page empty, because RLS filters
 * the rows out silently rather than erroring.
 */
function NotAuthorised({ onSignOut }: { onSignOut: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-950">
      <div className="card p-8 max-w-md text-center animate-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-error-500/10 flex items-center justify-center mx-auto mb-5">
          <ShieldAlert size={28} className="text-error-400" />
        </div>
        <h1 className="font-display font-bold text-dark-100 text-xl">Not authorised</h1>
        <p className="text-sm text-dark-400 mt-2">
          This console is limited to UPlay administrators. Your account is signed in but doesn&apos;t
          have admin access.
        </p>
        <button onClick={onSignOut} className="btn-secondary mt-6">
          Sign out
        </button>
      </div>
    </div>
  );
}

function App() {
  const { session, isAdmin, loading, signOut } = useAuth();
  const [activePage, setActivePage] = useState<PageId>('overview');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <Loader2 size={32} className="animate-spin text-primary-500" />
      </div>
    );
  }

  if (!session) return <AuthPage />;
  if (!isAdmin) return <NotAuthorised onSignOut={signOut} />;

  const renderPage = () => {
    switch (activePage) {
      case 'overview':
        return <OverviewPage onNavigate={setActivePage} />;
      case 'people':
        return <PeoplePage />;
      case 'connections':
        return <ConnectionsPage />;
      case 'events':
        return <EventsPage />;
      case 'support':
        return <SupportPage />;
      case 'activity':
        return <ActivityPage />;
      case 'account':
        return <AccountPage />;
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
