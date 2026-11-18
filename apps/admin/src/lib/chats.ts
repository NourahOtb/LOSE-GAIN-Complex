import type { SupabaseClient } from "@supabase/supabase-js";

export type ChatSummary = {
  id: string;
  parent: string;
  coach: string;
  kid: string;
  lastAt: string | null;
  lastBody: string | null;
  waitingHours: number | null; // guardian wrote last and no coach reply yet
};

/** All guardian ↔ coach chats for oversight (managers and super admins only, by database rules). */
export async function loadChats(supabase: SupabaseClient): Promise<ChatSummary[]> {
  const { data: convs } = await supabase
    .from("conversations")
    .select("id, parent_id, coach_id, kid_id, last_message_at, last_sender_id")
    .order("last_message_at", { ascending: false, nullsFirst: false });
  const list = (convs ?? []) as { id: string; parent_id: string; coach_id: string; kid_id: string; last_message_at: string | null; last_sender_id: string | null }[];
  if (!list.length) return [];
  const [people, kids, msgs] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", [...new Set(list.flatMap((c) => [c.parent_id, c.coach_id]))]),
    supabase.from("kids").select("id, full_name").in("id", [...new Set(list.map((c) => c.kid_id))]),
    supabase.from("messages").select("conversation_id, body, created_at").in("conversation_id", list.map((c) => c.id)).order("created_at", { ascending: false }).limit(1000),
  ]);
  const name = new Map(((people.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
  const kid = new Map(((kids.data ?? []) as { id: string; full_name: string }[]).map((k) => [k.id, k.full_name]));
  const last = new Map<string, string>();
  for (const m of (msgs.data ?? []) as { conversation_id: string; body: string }[]) if (!last.has(m.conversation_id)) last.set(m.conversation_id, m.body);
  const now = Date.now();
  return list.map((c) => ({
    id: c.id,
    parent: name.get(c.parent_id) ?? "",
    coach: name.get(c.coach_id) ?? "",
    kid: kid.get(c.kid_id) ?? "",
    lastAt: c.last_message_at,
    lastBody: last.get(c.id) ?? null,
    waitingHours: c.last_message_at && c.last_sender_id === c.parent_id ? Math.floor((now - new Date(c.last_message_at).getTime()) / 3600_000) : null,
  }));
}

export const canOversee = (role: string) => role === "super_admin" || role === "manager";
export const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
