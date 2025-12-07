import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { AuthService } from '../services/authService';
import { User } from '../types';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const unsubscribe = AuthService.subscribeToAuth((currentUser) => {
      setUser(currentUser);
      if (!currentUser && location.pathname !== '/login') {
        navigate('/login');
      }
    });

    return () => unsubscribe();
  }, [navigate, location.pathname]);

  const navItems = [
    { path: '/', label: 'Dashboard', icon: 'ri-dashboard-line' },
    { path: '/budget', label: 'Budget', icon: 'ri-wallet-3-line' },
    { path: '/balance', label: 'Balance Sheet', icon: 'ri-scales-3-line' },
    { path: '/forecasting', label: 'Forecasting', icon: 'ri-line-chart-line' },
    { path: '/emis', label: 'Bills & EMI', icon: 'ri-calendar-check-line' },
    { path: '/reports', label: 'Reports', icon: 'ri-file-list-3-line' },
  ];

  const handleNav = (path: string) => {
    navigate(path);
    setIsMobileMenuOpen(false);
  };

  const handleLogout = async () => {
    await AuthService.logout();
    navigate('/login');
  };

  if (location.pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="flex h-screen overflow-hidden text-gray-100">

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 glass-panel border-r border-white/10 z-20">
        <div className="p-6 flex items-center gap-3">
          
          {/* ✅ NEW LOGO HERE */}
          <img 
            src="/logo/finamate-logo.png"
            alt="FinMate Logo"
            className="w-10 h-10 rounded-xl object-cover shadow-lg"
          />

          <h1 className="text-xl font-bold tracking-tight">FinMate</h1>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                location.pathname === item.path
                  ? 'bg-primary/20 text-indigo-300 border border-primary/20 shadow-inner'
                  : 'hover:bg-white/5 text-gray-400 hover:text-white'
              }`}
            >
              <i className={`${item.icon} text-xl ${location.pathname === item.path ? 'text-indigo-400' : 'text-gray-500 group-hover:text-white'}`}></i>
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5 mb-2">
            <img src={user?.photoURL || "https://picsum.photos/40/40"} alt="User" className="w-10 h-10 rounded-full border border-white/10" />
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-semibold truncate">{user?.displayName || 'User'}</p>
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                Cloud Connected
              </div>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition">
            <i className="ri-logout-box-line"></i> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full z-30 glass-panel border-b border-white/10 px-4 py-3 flex justify-between items-center">

        {/* ✅ MOBILE LOGO HERE */}
        <div className="flex items-center gap-2">
          <img 
            src="/logo/finamate-logo.png"
            className="w-8 h-8 rounded-lg object-cover"
            alt="FinMate Logo"
          />
          <span className="font-bold text-lg">FinMate</span>
        </div>

        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-300">
          <i className={isMobileMenuOpen ? "ri-close-line text-2xl" : "ri-menu-line text-2xl"}></i>
        </button>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-20 bg-slate-900/95 backdrop-blur-xl pt-20 px-6 md:hidden flex flex-col">
          <nav className="space-y-4 flex-1">
            {navItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleNav(item.path)}
                className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-lg ${
                  location.pathname === item.path
                    ? 'bg-indigo-600/20 text-indigo-300'
                    : 'text-gray-400'
                }`}
              >
                <i className={`${item.icon} text-2xl`}></i>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="py-8 border-t border-white/10">
            <div className="flex items-center gap-3 mb-4">
              <img src={user?.photoURL || ''} className="w-10 h-10 rounded-full" alt="User" />
              <div>
                <p className="font-medium text-white">{user?.displayName}</p>
                <p className="text-sm text-gray-400">{user?.email}</p>
              </div>
            </div>
            <button onClick={handleLogout} className="w-full py-3 bg-red-500/10 text-red-400 rounded-xl font-medium">Logout</button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pt-16 md:pt-0 relative">
        <div className="max-w-7xl mx-auto p-4 md:p-8 pb-24">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
