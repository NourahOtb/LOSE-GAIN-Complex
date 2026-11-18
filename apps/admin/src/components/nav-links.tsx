"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS: { href: string; label: string; roles?: string[] }[] = [
  { href: "/", label: "Today" },
  { href: "/check-in", label: "Check-in" },
  { href: "/approvals", label: "Approvals" },
  { href: "/registrations", label: "Registrations" },
  { href: "/kids", label: "Members & families" },
  { href: "/classes", label: "Classes" },
  { href: "/closures", label: "Closures" },
  { href: "/prices", label: "Prices" },
  { href: "/reports", label: "Reports", roles: ["super_admin", "manager"] },
  { href: "/staff", label: "Staff", roles: ["super_admin", "manager"] },
  { href: "/chats", label: "Chats" },
];

export function NavLinks({ compact, role }: { compact?: boolean; role?: string }) {
  const path = usePathname();
  return (
    <nav className={compact ? "flex min-w-0 flex-1 gap-4 overflow-x-auto whitespace-nowrap py-1 text-sm" : "mt-8 flex flex-col gap-0.5"}>
      {LINKS.filter((l) => !l.roles || (role && l.roles.includes(role))).map((l) => {
        const on = l.href === "/" ? path === "/" : path.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={on ? "page" : undefined}
            className={
              compact
                ? `${on ? "font-semibold text-white" : "text-white/60"}`
                : `rounded px-2.5 py-2 text-[15px] transition-colors ${on ? "bg-white/10 font-semibold text-white" : "text-white/60 hover:text-white"}`
            }>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
