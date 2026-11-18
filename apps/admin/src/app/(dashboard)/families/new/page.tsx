import Link from "next/link";

import { NewFamily } from "@/components/family-forms";
import { requireStaff } from "@/lib/auth";

export default async function NewFamilyPage() {
  const { profile } = await requireStaff();
  const can = ["super_admin", "manager", "receptionist"].includes(profile.role);
  return (
    <div className="max-w-3xl">
      <Link href="/kids" className="text-sm underline underline-offset-2">
        ← Members &amp; families
      </Link>
      <h1 className="mt-3 text-[26px] font-semibold leading-tight">New family at the desk</h1>
      <p className="text-ink-soft">For families who walk in without the app. They get a temporary password by WhatsApp and choose their own when they first log in.</p>
      <div className="mt-5">{can ? <NewFamily /> : <p className="text-ink-soft">Reception, a manager or the owner can create family accounts.</p>}</div>
    </div>
  );
}
