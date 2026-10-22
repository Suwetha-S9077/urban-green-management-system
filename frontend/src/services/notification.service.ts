
export type AppNotification = {
  id: string;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  createdAt: string;
  read: boolean;
};

const STORAGE_KEY = 'urbanGreenNotifications';
export const EVENT_NAME = 'urbanGreenNotificationUpdated';

export function getNotifications(): AppNotification[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (!stored) return [];

    const parsed: unknown = JSON.parse(stored);

    if (!Array.isArray(parsed)) return [];

    return parsed as AppNotification[];
  } catch {
    return [];
  }
}

function saveNotifications(notifications: AppNotification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notifications));
    window.dispatchEvent(new Event(EVENT_NAME));
  } catch (error) {
    console.error('Could not save notifications:', error);
  }
}

export function addNotification(
  title: string,
  message: string,
  type: AppNotification['type'] = 'info',
) {
  const notification: AppNotification = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    title,
    message,
    type,
    createdAt: new Date().toISOString(),
    read: false,
  };

  const notifications = [notification, ...getNotifications()].slice(0, 50);

  saveNotifications(notifications);
}

export function markNotificationRead(id: string) {
  const updated = getNotifications().map((item) =>
    item.id === id ? { ...item, read: true } : item,
  );

  saveNotifications(updated);
}

export function markAllNotificationsRead() {
  const updated = getNotifications().map((item) => ({
    ...item,
    read: true,
  }));

  saveNotifications(updated);
}

export function clearNotifications() {
  saveNotifications([]);
}
