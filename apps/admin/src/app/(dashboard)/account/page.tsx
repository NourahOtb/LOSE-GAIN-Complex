import { ChangePassword } from "@/components/change-password";
import { requireStaff, ROLE_LABEL } from "@/lib/auth";

export default async function AccountPage() {
  const { profile, user } = await requireStaff({ passwordPage: true });
  const first = profile.must_change_password;
  return (
    <div className="max-w-2xl">
      <h1 className="text-[26px] font-semibold leading-tight">{first ? "Choose your password" : "Change password"}</h1>
      <p className="text-ink-soft">
        {profile.full_name} · {ROLE_LABEL[profile.role]} · {user.email}
      </p>
      {first ? <p className="mt-3 rounded-md bg-warn-bg px-4 py-3 font-semibold text-warn-ink">You logged in with a temporary password. Choose your own to continue.</p> : null}
      <div className="mt-5">
        <ChangePassword first={first} />
      </div>
    </div>
  );
}
