import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { canOversee, loadChats, when } from "@/lib/chats";

export default async function ChatsPage() {
  const { supabase, profile } = await requireStaff();
  if (!canOversee(profile.role)) {
    return (
      <div>
        <h1 className="text-[26px] font-semibold">Chats</h1>
        <p className="text-ink-soft">Only the owner and managers can read guardian ↔ coach chats.</p>
      </div>
    );
  }
  const chats = await loadChats(supabase);
  const late = chats.filter((c) => c.waitingHours !== null && c.waitingHours >= 12);

  return (
    <div>
      <h1 className="text-[26px] font-semibold">Chats</h1>
      <p className="text-ink-soft">
        Guardian ↔ coach chats, read only. {late.length ? <span className="font-semibold text-danger">{late.length} waiting more than 12 hours for a coach reply.</span> : "No guardian is waiting more than 12 hours."}
      </p>
      <div className="mt-5 overflow-x-auto rounded-md border border-line bg-surface">
        <table className="w-full min-w-[720px] text-[14px]">
          <thead>
            <tr className="border-b border-ink text-left">
              {["Guardian", "Coach", "About", "Last message", "Status"].map((h) => (
                <th key={h} className="label px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {chats.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-4 text-ink-soft">
                  No chats yet.
                </td>
              </tr>
            ) : (
              chats.map((c) => {
                const isLate = c.waitingHours !== null && c.waitingHours >= 12;
                return (
                  <tr key={c.id} className={`border-b border-line align-top last:border-0 ${isLate ? "bg-danger-bg" : ""}`}>
                    <td className="px-3 py-2.5 font-semibold">
                      <Link href={`/chats/${c.id}`} className="underline underline-offset-2">
                        {c.parent}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5">{c.coach}</td>
                    <td className="px-3 py-2.5">{c.kid}</td>
                    <td className="max-w-[280px] px-3 py-2.5">
                      <div className="truncate">{c.lastBody ?? "—"}</div>
                      {c.lastAt ? <div className="text-xs text-ink-soft">{when(c.lastAt)}</div> : null}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      {c.waitingHours === null ? (
                        <span className="text-ink-soft">{c.lastAt ? "Coach replied" : "No messages"}</span>
                      ) : isLate ? (
                        <span className="font-semibold text-danger">No reply · {c.waitingHours} h</span>
                      ) : (
                        <span>Waiting for coach · {c.waitingHours} h</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
