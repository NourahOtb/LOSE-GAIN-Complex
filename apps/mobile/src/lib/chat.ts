import { useEffect, useState } from 'react';

import { supabase } from './supabase';

export type Conversation = {
  id: string;
  parent_id: string;
  coach_id: string;
  kid_id: string;
  last_message_at: string | null;
  last_sender_id: string | null;
};
export type Message = { id: string; conversation_id: string; sender_id: string; body: string; created_at: string; read_at: string | null };

export type ChatRow = Conversation & { kidName: string; otherName: string; lastBody: string | null; unread: number };

/** My conversations (guardian or coach), newest first, with names, last message and unread count. */
export async function loadChats(myId: string): Promise<ChatRow[]> {
  const { data: convs } = await supabase
    .from('conversations')
    .select('id, parent_id, coach_id, kid_id, last_message_at, last_sender_id')
    .or(`parent_id.eq.${myId},coach_id.eq.${myId}`)
    .order('last_message_at', { ascending: false, nullsFirst: false });
  const list = (convs ?? []) as Conversation[];
  if (!list.length) return [];
  const ids = list.map((c) => c.id);
  const [kids, names, msgs] = await Promise.all([
    supabase.from('kids').select('id, full_name').in('id', [...new Set(list.map((c) => c.kid_id))]),
    supabase.rpc('chat_names'),
    supabase.from('messages').select('conversation_id, sender_id, body, created_at, read_at').in('conversation_id', ids).order('created_at', { ascending: false }).limit(500),
  ]);
  const kidName = new Map(((kids.data ?? []) as { id: string; full_name: string }[]).map((k) => [k.id, k.full_name]));
  const nameOf = new Map(((names.data ?? []) as { id: string; full_name: string }[]).map((n) => [n.id, n.full_name]));
  const all = (msgs.data ?? []) as Message[];
  return list.map((c) => {
    const mine = all.filter((m) => m.conversation_id === c.id);
    return {
      ...c,
      kidName: kidName.get(c.kid_id) ?? '',
      otherName: nameOf.get(c.parent_id === myId ? c.coach_id : c.parent_id) ?? '',
      lastBody: mine[0]?.body ?? null,
      unread: mine.filter((m) => m.sender_id !== myId && !m.read_at).length,
    };
  });
}

/** How many chat messages are waiting for me (for the tab badge); updates live. */
export function useUnreadChats(myId: string | undefined): number {
  const [n, setN] = useState(0);

  useEffect(() => {
    if (!myId) return;
    let alive = true;
    const tick = () =>
      supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .neq('sender_id', myId)
        .is('read_at', null)
        .then(({ count }) => alive && setN(count ?? 0));
    tick();
    const timer = setInterval(tick, 30000);
    const channel = supabase
      .channel(`unread-${myId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => tick())
      .subscribe();
    return () => {
      alive = false;
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, [myId]);
  return myId ? n : 0;
}

/** "14:05" today, otherwise "18 Nov". */
export function chatTime(iso: string, lang: 'ar' | 'en'): string {
  const d = new Date(iso);
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';
  return d.toDateString() === new Date().toDateString()
    ? d.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}
