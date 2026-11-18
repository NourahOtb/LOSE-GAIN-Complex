import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { canOversee, when } from "@/lib/chats";

export default async function ChatThreadPage({ params }: PageProps<"/chats/[id]">) {
  const { id } = await params;
  const { supabase, profile } = await requireStaff();
  if (!canOversee(profile.role)) return <p className="text-ink-soft">Only the owner and managers can read chats.</p>;

  const { data: conv } = await supabase.from("conversations").select("id, parent_id, coach_id, kid_id").eq("id", id).maybeSingle();
  if (!conv) return <p className="text-ink-soft">Chat not found.</p>;
  const [people, kid, msgs] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", [conv.parent_id, conv.coach_id]),
    supabase.from("kids").select("full_name").eq("id", conv.kid_id).maybeSingle(),
    supabase.from("messages").select("id, sender_id, body, created_at").eq("conversation_id", id).order("created_at"),
  ]);
  const name = new Map(((people.data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));

  return (
    <div className="max-w-2xl">
      <Link href="/chats" className="text-sm underline underline-offset-2">
        ← All chats
      </Link>
      <h1 className="mt-2 text-[26px] font-semibold">
        {name.get(conv.parent_id)} ↔ {name.get(conv.coach_id)}
      </h1>
      <p className="text-ink-soft">About {kid.data?.full_name} · read only</p>
      <ol className="mt-5 flex flex-col gap-3">
        {((msgs.data ?? []) as { id: string; sender_id: string; body: string; created_at: string }[]).map((m) => {
          const coach = m.sender_id === conv.coach_id;
          return (
            <li key={m.id} className={`max-w-[80%] ${coach ? "self-end text-right" : "self-start"}`}>
              <div className="text-xs text-ink-soft">
                {name.get(m.sender_id)} · {when(m.created_at)}
              </div>
              <div className={`mt-1 whitespace-pre-wrap rounded-lg px-3 py-2 text-left ${coach ? "bg-ink text-surface" : "bg-tile"}`}>{m.body}</div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
