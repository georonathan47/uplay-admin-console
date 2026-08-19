import { Menu, Search, Bell } from 'lucide-react';
import { type PageId, navItems } from './Sidebar';

interface TopbarProps {
  active: PageId;
  onMenuClick: () => void;
}

export function Topbar({ active, onMenuClick }: TopbarProps) {
  const currentItem = navItems.find((item) => item.id === active);

  return (
    <header className="sticky top-0 z-20 glass border-b border-dark-800">
      <div className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="lg:hidden text-dark-300 hover:text-white p-2 rounded-lg hover:bg-dark-800 transition-colors"
          >
            <Menu size={22} />
          </button>
          <div>
            <p className="text-xs text-dark-400 font-medium uppercase tracking-wider">
              {currentItem?.description}
            </p>
            <h2 className="text-lg font-display font-bold text-white">{currentItem?.label}</h2>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 bg-dark-800 border border-dark-700 rounded-xl px-3 py-2 w-64">
            <Search size={16} className="text-dark-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent text-sm text-dark-100 placeholder-dark-400 focus:outline-none flex-1"
            />
            <kbd className="text-xs text-dark-500 bg-dark-700 px-1.5 py-0.5 rounded">⌘K</kbd>
          </div>
          <button className="relative p-2.5 rounded-xl bg-dark-800 border border-dark-700 hover:bg-dark-700 transition-colors">
            <Bell size={18} className="text-dark-300" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-primary-500" />
          </button>
        </div>
      </div>
    </header>
  );
}
