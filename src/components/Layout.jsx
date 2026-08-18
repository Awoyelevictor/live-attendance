import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, Users, Clock, MapPin, BarChart3, 
  History, User as UserIcon, LogOut, Menu, X, ChevronRight, MessageSquare, Download
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import WorkerAlertManager from './WorkerAlertManager';
import LiveClock from './LiveClock';
import NotificationPermissionModal from './NotificationPermissionModal';

const cn = (...inputs) => twMerge(clsx(inputs));

const SidebarLink = ({ to, icon: Icon, label, collapsed, onClick }) => {
  const location = useLocation();
  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`);

  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        "relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group overflow-hidden",
        isActive 
          ? "text-white font-semibold" 
          : "text-slate-400 hover:text-indigo-400 hover:bg-slate-800/30"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="active-sidebar-capsule"
          className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-indigo-700 rounded-xl shadow-lg shadow-indigo-500/25"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}
      <Icon size={20} className={cn("relative z-10 shrink-0", isActive ? "text-white" : "group-hover:scale-110 transition-transform")} />
      {!collapsed && <span className="relative z-10 font-medium">{label}</span>}
    </Link>
  );
};

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  if (!user) return <>{children}</>;

  const adminLinks = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: 'Analytics' },
    { to: '/admin/users', icon: Users, label: 'Employees' },
    { to: '/admin/attendance', icon: Clock, label: 'Attendance Logs' },
    { to: '/admin/locations', icon: MapPin, label: 'Locations' },
    { to: '/admin/reports', icon: BarChart3, label: 'Reports' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
  ];

  const supervisorLinks = [
    { to: '/worker/dashboard', icon: Clock, label: 'Clock In / Out' },
    { to: '/worker/history', icon: History, label: 'My History' },
    { to: '/admin/users', icon: Users, label: 'Team Directory' },
    { to: '/admin/attendance', icon: LayoutDashboard, label: "Users' Logs" },
    { to: '/admin/reports', icon: BarChart3, label: 'Team Reports' },
    { to: '/messages', icon: MessageSquare, label: 'Team Chat' },
    { to: '/worker/profile', icon: UserIcon, label: 'My Profile' },
  ];

  const workerLinks = [
    { to: '/worker/dashboard', icon: LayoutDashboard, label: 'Clock In / Out' },
    { to: '/worker/history', icon: History, label: 'History' },
    { to: '/messages', icon: MessageSquare, label: 'Messages' },
    { to: '/worker/profile', icon: UserIcon, label: 'Profile' },
  ];

  const links = user.role === 'admin' 
    ? adminLinks 
    : user.role === 'supervisor' 
      ? supervisorLinks 
      : workerLinks;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 80 : 280 }}
        className={cn(
          "hidden md:flex flex-col bg-slate-900/50 backdrop-blur-xl border-r border-slate-800/50 sticky top-0 h-screen transition-all",
          collapsed ? "px-2" : "px-4"
        )}
      >
        <div className="py-8 flex items-center justify-between px-4">
          {!collapsed && (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Clock className="text-white" size={18} />
              </div>
              <span className="font-bold text-xl tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                Attendly
              </span>
            </motion.div>
          )}
          <button 
            onClick={() => setCollapsed(!collapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg text-slate-400"
          >
            {collapsed ? <ChevronRight size={20} /> : <X size={20} />}
          </button>
        </div>

        <nav className="flex-1 space-y-2 mt-4">
          {links.map((link) => (
            <SidebarLink key={link.to} {...link} collapsed={collapsed} />
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800/50">
          <button
            onClick={logout}
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group",
              collapsed && "justify-center"
            )}
          >
            <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
            {!collapsed && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </motion.aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              className="fixed inset-y-0 left-0 w-72 bg-slate-900 z-50 p-4 md:hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <Clock className="text-white" size={18} />
                  </div>
                  <span className="font-bold text-xl tracking-tight">Attendly</span>
                </div>
                <button onClick={() => setMobileOpen(false)} className="text-slate-400 hover:text-white">
                  <X size={24} />
                </button>
              </div>
              <div className="flex flex-col h-[calc(100vh-100px)]">
                <nav className="space-y-2 flex-1 overflow-y-auto">
                  {links.map((link) => (
                    <SidebarLink key={link.to} {...link} onClick={() => setMobileOpen(false)} />
                  ))}
                </nav>
                
                <div className="pt-4 border-t border-slate-800/50 mt-4">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      logout();
                    }}
                    className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all group"
                  >
                    <LogOut size={20} className="group-hover:rotate-12 transition-transform" />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        {/* Top Navbar */}
        <header className="h-16 border-b border-slate-800/50 bg-slate-950/50 backdrop-blur-xl flex items-center justify-between px-3 sm:px-6 md:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button className="md:hidden p-2 text-slate-300 hover:text-white" onClick={() => setMobileOpen(true)}>
              <Menu size={22} />
            </button>
            
            {/* Live Digital Clock */}
            <LiveClock variant="compact" />
          </div>

          <div className="flex items-center gap-3 sm:gap-4 ml-auto">
            <Link to={user?.role === 'admin' ? '#' : '/worker/profile'} className="flex items-center gap-3 group">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-semibold text-white group-hover:text-indigo-400 transition-colors">{user?.name || 'User'}</p>
                <div className="flex items-center justify-end mt-0.5">
                  {user?.role === 'supervisor' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                      Supervisor
                    </span>
                  ) : user?.role === 'admin' ? (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Admin
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Trainee
                    </span>
                  )}
                </div>
              </div>
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-slate-800 border border-slate-700 group-hover:border-indigo-500 flex items-center justify-center text-indigo-400 font-bold overflow-hidden transition-all shadow-md">
                {user?.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" /> : (user?.name?.[0] || 'U').toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Worker & Supervisor Alert Banner & Notification Center */}
        {(user?.role === 'trainee' || user?.role === 'worker' || user?.role === 'supervisor') && <WorkerAlertManager user={user} />}

        {/* Real-time Notification Permission Dialog */}
        <NotificationPermissionModal />

        {/* Content */}
        <main className="flex-1 p-4 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
              className="h-full w-full"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
