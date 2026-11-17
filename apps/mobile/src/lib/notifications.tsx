import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { useAuth } from './auth';
import { supabase } from './supabase';

export type Notification = {
  id: string;
  kind: string;
  title_en: string;
  body_en: string;
  title_ar: string;
  body_ar: string;
  read_at: string | null;
  created_at: string;
};

type Ctx = { items: Notification[]; unread: number; reload: () => Promise<void>; markRead: (ids: string[]) => Promise<void> };
const NotificationsCtx = createContext<Ctx | null>(null);

/** In-app inbox: loads the signed-in user's notifications and updates live when new ones arrive. */
export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const userId = profile?.id;

  const fetchItems = useCallback(async (): Promise<Notification[]> => {
    if (!userId) return [];
    const { data } = await supabase.from('notifications').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(100);
    return (data ?? []) as Notification[];
  }, [userId]);

  const reload = useCallback(async () => {
    setItems(await fetchItems());
  }, [fetchItems]);

  useEffect(() => {
    let alive = true;
    const tick = () => fetchItems().then((list) => alive && setItems(list));
    tick();
    // refresh every 30 s while the app is open (simple and reliable for the demo)
    const timer = setInterval(tick, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [fetchItems]);

  const markRead = useCallback(
    async (ids: string[]) => {
      if (!ids.length) return;
      const now = new Date().toISOString();
      setItems((cur) => cur.map((n) => (ids.includes(n.id) ? { ...n, read_at: now } : n)));
      await supabase.from('notifications').update({ read_at: now }).in('id', ids);
    },
    [],
  );

  return (
    <NotificationsCtx.Provider value={{ items, unread: items.filter((n) => !n.read_at).length, reload, markRead }}>
      {children}
    </NotificationsCtx.Provider>
  );
}

export function useNotifications() {
  const v = useContext(NotificationsCtx);
  if (!v) throw new Error('useNotifications outside NotificationsProvider');
  return v;
}
