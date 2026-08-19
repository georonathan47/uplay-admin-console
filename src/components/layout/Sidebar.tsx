import {
  LayoutDashboard,
  Users,
  Network,
  CalendarDays,
  Ticket,
  Bell,
  Settings,
  Activity,
  X,
  LogOut,
} from 'lucide-react';
import { useAuth } from '@/lib/auth';

export type PageId =
  | 'overview'
  | 'athletes'
  | 'connections'
  | 'events'
  | 'tickets'
  | 'notifications'
  | 'settings';

interface NavItem {
  id: PageId;
  label: string;
  icon: typeof LayoutDashboard;
  description: string;
}

export const navItems: NavItem[] = [
  { id: 'overview', label: 'Overview', icon: LayoutDashboard, description: 'Dashboard summary' },
  { id: 'athletes', label: 'Athletes', icon: Users, description: 'Manage athletes' },
  { id: 'connections', label: 'Connections', icon: Network, description: 'Network overview' },
  { id: 'events', label: 'Events', icon: CalendarDays, description: 'Sporting events' },
  { id: 'tickets', label: 'Tickets', icon: Ticket, description: 'Support tickets' },
  { id: 'notifications', label: 'Notifications', icon: Bell, description: 'Send & manage' },
  { id: 'settings', label: 'Settings', icon: Settings, description: 'System config' },
];

interface SidebarProps {
  active: PageId;
  onNavigate: (page: PageId) => void;
  open: boolean;
  onClose: () => void;
}

export function Sidebar({ active, onNavigate, open, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();
  const initials = (user?.email ?? 'A').charAt(0).toUpperCase();

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={onClose}
        />
      )}
      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-dark-950 border-r border-dark-800 z-40 flex flex-col transition-transform duration-300 ${
          open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between p-6 border-b border-dark-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center shadow-glow">
              <Activity size={22} className="text-white" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-lg leading-none">Youplay</p>
              <p className="text-xs text-dark-400 mt-0.5">Management</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-dark-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  onClose();
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-500/10 text-primary-300 border border-primary-500/20'
                    : 'text-dark-300 hover:bg-dark-800 hover:text-dark-100 border border-transparent'
                }`}
              >
                <Icon
                  size={20}
                  className={isActive ? 'text-primary-400' : 'text-dark-400 group-hover:text-dark-200'}
                />
                <div className="text-left flex-1">
                  <p className="text-sm font-medium">{item.label}</p>
                </div>
                {isActive && (
                  <div className="w-1.5 h-1.5 rounded-full bg-primary-400 animate-pulse-soft" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-dark-800">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-900">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-secondary-400 to-secondary-600 flex items-center justify-center text-white font-semibold text-sm">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-dark-100 truncate">
                {user?.email ?? 'Admin'}
              </p>
              <p className="text-xs text-dark-400 truncate">Signed in</p>
            </div>
            <button
              onClick={() => signOut()}
              title="Sign out"
              className="p-2 rounded-lg text-dark-400 hover:text-error-300 hover:bg-error-500/10 transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
