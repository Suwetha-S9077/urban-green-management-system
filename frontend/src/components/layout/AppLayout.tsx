
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications,
  EVENT_NAME,
  type AppNotification,
} from '@/services/notification.service';

interface AppLayoutProps {
  children: ReactNode;
}

const navigation = [
  { label: 'Dashboard', path: '/dashboard', icon: '▦', description: 'Overview' },
  { label: 'Tree Inventory', path: '/trees', icon: '🌳', description: 'Tree records' },
  { label: 'Tree Map', path: '/tree-map', icon: '⌖', description: 'Locations' },
  { label: 'Upload Tree', path: '/tree-upload', icon: '＋', description: 'Add records' },
  { label: 'Green Insights', path: '/green-insights', icon: '🌿', description: 'Environmental insights' },
  { label: 'Ward Analytics', path: '/ward-analytics', icon: '📊', description: 'Ward comparisons' },
  { label: 'Green Achievements', path: '/green-achievements', icon: '🏆', description: 'Your achievements' },
  { label: 'Activity Centre', path: '/activity-centre', icon: '🕒', description: 'Recent activities' },
];

function getDisplayName(): string {
  const savedName = localStorage.getItem('urbanGreenDisplayName');

  if (savedName?.trim()) return savedName.trim();

  try {
    const storedUser = localStorage.getItem('urbanGreenUser');

    if (storedUser) {
      const user = JSON.parse(storedUser);
      const name =
        user.username ||
        user.name ||
        user.fullName ||
        user.email?.split('@')[0];

      if (typeof name === 'string' && name.trim()) {
        return name.trim();
      }
    }
  } catch {
    // Use the default name if stored user data is invalid.
  }

  return 'Green Admin';
}

function getDisplayEmail(): string {
  const savedEmail = localStorage.getItem('urbanGreenSignupEmail');

  if (savedEmail?.trim()) return savedEmail.trim();

  try {
    const storedUser = localStorage.getItem('urbanGreenUser');

    if (storedUser) {
      const user = JSON.parse(storedUser);

      if (typeof user.email === 'string') {
        return user.email;
      }
    }
  } catch {
    // Use the default email if stored user data is invalid.
  }

  return 'Manage your account';
}

function formatNotificationDate(dateString: string): string {
  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) return '';

  const difference = Date.now() - date.getTime();

  if (difference < 60_000) return 'Just now';
  if (difference < 3_600_000) {
    return `${Math.floor(difference / 60_000)} min ago`;
  }
  if (difference < 86_400_000) {
    return `${Math.floor(difference / 3_600_000)} hr ago`;
  }
  if (difference < 172_800_000) return 'Yesterday';

  return date.toLocaleDateString();
}

export function AppLayout({ children }: AppLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();

  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [username, setUsername] = useState(getDisplayName);
  const [notifications, setNotifications] = useState<AppNotification[]>(
    getNotifications,
  );

  const unreadCount = notifications.filter((item) => !item.read).length;

  useEffect(() => {
    setUsername(getDisplayName());
  }, [location.pathname]);

  useEffect(() => {
    function updateUsername() {
      setUsername(getDisplayName());
    }

    window.addEventListener('urbanGreenProfileUpdated', updateUsername);

    return () => {
      window.removeEventListener('urbanGreenProfileUpdated', updateUsername);
    };
  }, []);

  useEffect(() => {
    function refreshNotifications() {
      setNotifications(getNotifications());
    }

    function handleStorage(event: StorageEvent) {
      if (
        event.key === 'urbanGreenNotifications' ||
        event.key === null
      ) {
        refreshNotifications();
      }
    }

    window.addEventListener(EVENT_NAME, refreshNotifications);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener(EVENT_NAME, refreshNotifications);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (menuRef.current && !menuRef.current.contains(target)) {
        setProfileMenuOpen(false);
      }

      if (
        notificationRef.current &&
        !notificationRef.current.contains(target)
      ) {
        setNotificationOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        setNotificationOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  const initials = username
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const currentPage =
    navigation.find((item) => item.path === location.pathname)?.label ||
    (location.pathname === '/settings'
      ? 'Settings'
      : location.pathname === '/profile'
        ? 'My Account'
        : 'Green Dashboard');

  function handleLogout() {
    setProfileMenuOpen(false);
    localStorage.removeItem('token');
    localStorage.removeItem('urbanGreenToken');
    localStorage.removeItem('authToken');
    localStorage.removeItem('urbanGreenUser');
    sessionStorage.clear();

    navigate('/login', { replace: true });
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
  }

  function handleClearNotifications() {
    clearNotifications();
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[250px] flex-col bg-[#103b2d] text-white md:flex">
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-400/15 text-2xl">
            🌿
          </div>

          <div>
            <p className="text-lg font-bold tracking-tight">UrbanGreen</p>
            <p className="text-xs text-emerald-200">Management System</p>
          </div>
        </div>

        <div className="px-5 pb-2 pt-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/70">
            Workspace
          </p>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 pb-5">
          {navigation.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `group flex items-center gap-3 rounded-xl px-3 py-3 transition ${
                  isActive
                    ? 'bg-emerald-500/20 text-white shadow-sm'
                    : 'text-emerald-100/75 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
                      isActive
                        ? 'bg-emerald-400/20'
                        : 'bg-white/5 group-hover:bg-white/10'
                    }`}
                  >
                    {item.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">
                      {item.label}
                    </span>
                    <span className="mt-0.5 block text-xs text-emerald-100/50">
                      {item.description}
                    </span>
                  </span>

                  {isActive && (
                    <span className="h-2 w-2 rounded-full bg-emerald-300" />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <div className="flex items-center gap-3 rounded-xl bg-white/5 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-sm font-bold text-emerald-100">
              {initials || 'GA'}
            </div>

            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{username}</p>
              <p className="text-xs text-emerald-200/60">Green Admin</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="min-h-screen md:ml-[250px]">
        <header className="sticky top-0 z-20 flex min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur sm:px-7">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400">
              Urban Green Management
            </p>
            <h1 className="mt-1 truncate text-lg font-bold text-slate-900 sm:text-xl">
              {currentPage}
            </h1>
          </div>

          <div className="flex shrink-0 items-center gap-3 sm:gap-5">
            <div className="relative" ref={notificationRef}>
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={notificationOpen}
                title="Notifications"
                onClick={() => {
                  setNotificationOpen((open) => !open);
                  setProfileMenuOpen(false);
                }}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-xl text-slate-600 transition hover:bg-emerald-50"
              >
                🔔

                {unreadCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>

              {notificationOpen && (
                <div className="absolute right-0 top-full z-50 mt-3 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-4">
                    <div>
                      <h2 className="font-bold text-slate-900">
                        Notifications
                      </h2>
                      <p className="mt-1 text-xs text-slate-500">
                        {unreadCount} unread notification
                        {unreadCount === 1 ? '' : 's'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={unreadCount === 0}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Mark all read
                    </button>
                  </div>

                  <div className="max-h-96 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-5 py-10 text-center">
                        <div className="text-3xl">🔔</div>
                        <p className="mt-3 font-semibold text-slate-700">
                          You're all caught up!
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Tree upload updates will appear here.
                        </p>
                      </div>
                    ) : (
                      notifications.map((item) => (
                        <div
                          key={item.id}
                          className={`border-b border-slate-100 p-4 ${
                            item.read ? 'bg-white' : 'bg-emerald-50/70'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="mt-0.5 text-lg">
                              {item.type === 'success'
                                ? '✅'
                                : item.type === 'error'
                                  ? '❌'
                                  : item.type === 'warning'
                                    ? '⚠️'
                                    : 'ℹ️'}
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-2">
                                <p className="text-sm font-bold text-slate-800">
                                  {item.title}
                                </p>

                                {!item.read && (
                                  <span
                                    className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600"
                                    title="Unread"
                                  />
                                )}
                              </div>

                              <p className="mt-1 whitespace-pre-wrap break-words text-sm text-slate-600">
                                {item.message}
                              </p>

                              <p className="mt-2 text-xs text-slate-400">
                                {formatNotificationDate(item.createdAt)}
                              </p>

                              {!item.read && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    markNotificationRead(item.id)
                                  }
                                  className="mt-2 text-xs font-semibold text-emerald-700 hover:underline"
                                >
                                  Mark as read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {notifications.length > 0 && (
                    <div className="flex items-center justify-between border-t border-slate-100 p-3">
                      <span className="text-xs text-slate-400">
                        Latest {notifications.length} notification
                        {notifications.length === 1 ? '' : 's'}
                      </span>

                      <button
                        type="button"
                        onClick={handleClearNotifications}
                        className="text-xs font-semibold text-red-600 hover:underline"
                      >
                        Clear all
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                aria-label="Open profile menu"
                aria-expanded={profileMenuOpen}
                onClick={() => {
                  setProfileMenuOpen((open) => !open);
                  setNotificationOpen(false);
                }}
                className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-1.5 pr-2.5 transition hover:bg-slate-50 sm:gap-3 sm:pr-3"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-sm font-bold text-emerald-800">
                  {initials || 'GA'}
                </span>

                <span className="hidden max-w-28 truncate text-sm font-semibold text-slate-700 sm:block">
                  {username}
                </span>

                <span className="text-xs text-slate-400">▾</span>
              </button>

              {profileMenuOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-full z-50 mt-3 w-60 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl"
                >
                  <div className="border-b border-slate-100 px-4 py-3">
                    <p className="truncate text-sm font-bold text-slate-800">
                      {username}
                    </p>
                    <p className="mt-1 truncate text-xs text-slate-500">
                      {getDisplayEmail()}
                    </p>
                  </div>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/profile');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                  >
                    <span>👤</span>
                    My Account
                  </button>

                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/settings');
                    }}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-emerald-50"
                  >
                    <span>⚙️</span>
                    Settings
                  </button>

                  <div className="my-1 border-t border-slate-100" />

                  <button
                    type="button"
                    role="menuitem"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm font-semibold text-red-600 transition hover:bg-red-50"
                  >
                    <span>↪</span>
                    Log Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="p-4 sm:p-7 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
