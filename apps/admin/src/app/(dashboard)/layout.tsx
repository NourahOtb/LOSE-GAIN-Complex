import { Logo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";

import { signOut } from "../actions";

export default async function DashboardLayout({ children }: LayoutProps<"/">) {
  const { profile } = await requireStaff();
  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 flex h-screen w-56 shrink-0 flex-col bg-rail px-4 py-6 text-white max-md:hidden">
        <Logo size={20} className="self-start text-white" />
        <NavLinks />
        <div className="mt-auto border-t border-white/15 pt-4 text-sm">
          <div className="font-semibold">{profile.full_name}</div>
          <div className="text-white/60">{ROLE_LABEL[profile.role]}</div>
          <form action={signOut}>
            <button className="mt-3 text-white/70 underline underline-offset-4 hover:text-white">Log out</button>
          </form>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        {/* compact top bar on small screens (tablet portrait / phone) */}
        <div className="flex items-center justify-between bg-rail px-4 py-3 text-white md:hidden">
          <Logo size={16} className="text-white" />
          <NavLinks compact />
        </div>
        <main className="mx-auto max-w-[1240px] px-6 py-7 max-md:px-4">{children}</main>
      </div>
    </div>
  );
}
