// src/components/SharedLayout.tsx
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Home, FileText, Users, Settings, LogOut } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { useSession } from '@/context/SessionContext';
import { apiClient } from '@/lib/apiClient';
import toast from 'react-hot-toast';

export default function SharedLayout() {
  const { user } = useSession();

  const handleLogout = async () => {
    try {
      await apiClient.auth.signOut();
      toast.success('Logged out.');
    } catch (error: any) {
      console.error('Logout error:', error);
      toast.error('Error during logout');
    }
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/automations', label: 'Automations', icon: FileText },
    { to: '/spaces', label: 'Spaces', icon: Users },
    { to: '/settings/team', label: 'Settings', icon: Settings },
  ];

  return (
    // CHANGE #1: Use h-screen instead of min-h-screen to lock the height
    <div className="grid h-screen w-full md:grid-cols-[220px_1fr] lg:grid-cols-[280px_1fr]">
      <div className="hidden border-r bg-muted/40 md:block">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link to="/" className="flex items-center gap-2 font-semibold">
              <span className="">StencilFlow</span>
            </Link>
          </div>
          <div className="flex-1">
            <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary ${
                      isActive ? 'bg-muted text-primary' : 'text-muted-foreground'
                    }`
                  }
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="mt-auto p-4">
            <div className="text-xs text-muted-foreground truncate mb-2">{user?.email}</div>
            <Button size="sm" className="w-full" variant="secondary" onClick={handleLogout}>
              <LogOut className="mr-2 h-4 w-4" /> Logout
            </Button>
          </div>
        </div>
      </div>
      {/* CHANGE #2: Add overflow-y-auto to make this column scrollable */}
      <div className="flex flex-col overflow-y-auto">
        <main className="flex flex-1 flex-col gap-4 p-4 lg:gap-6 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}