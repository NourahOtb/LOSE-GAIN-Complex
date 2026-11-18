// Staff accounts and desk-created family accounts (Task 14g).
//
//   POST /accounts  (signed-in staff)
//   { action: 'create_staff',  full_name, email, phone?, role, sport? }      -> { user_id, temp_password }
//   { action: 'update_staff',  user_id, role?, sport?, is_active?, full_name?, phone? } -> { ok }
//   { action: 'reset_password', user_id }                                      -> { temp_password }
//   { action: 'create_family', full_name, email, phone, account_type, relationship?, lang? } -> { user_id, temp_password }
//
// Rules:
//  - Owner (super admin): every staff account and role.
//  - Manager: only coaches and receptionists (add, change, switch off, new password).
//  - Owner, manager, receptionist: create a family at the desk, and give a family a new temporary password.
//  - Nobody changes their own role or switches themself off.
//  - Temporary passwords are shown once; the person must choose their own after logging in
//    (remember_temp_password keeps its hash, so the forced change can't be skipped).
//  - Switching off keeps the account (and history) but blocks logging in.

import { createClient } from 'npm:@supabase/supabase-js@2';

const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Role = 'parent' | 'coach' | 'super_admin' | 'manager' | 'receptionist' | 'accountant';
const STAFF_ROLES: Role[] = ['coach', 'super_admin', 'manager', 'receptionist', 'accountant'];
const MANAGER_CAN: Role[] = ['coach', 'receptionist'];
const RELATIONSHIPS = ['father', 'mother', 'grandfather', 'grandmother', 'brother', 'sister', 'uncle', 'aunt', 'guardian'];

/** easy to read out or type: no 0/O, 1/l/I */
function tempPassword() {
  const abc = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const bytes = crypto.getRandomValues(new Uint8Array(10));
  return 'LG-' + Array.from(bytes, (b) => abc[b % abc.length]).join('');
}
const email = (v: unknown) => {
  const s = String(v ?? '').trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) && s.length <= 200 ? s : null;
};
const text = (v: unknown, max = 120) => {
  const s = String(v ?? '').trim();
  return s && s.length <= max ? s : null;
};
/** Kuwait mobile: 8 digits starting 4/5/6/9 → +965XXXXXXXX */
const phone = (v: unknown) => {
  const d = String(v ?? '').replace(/[^\d]/g, '').replace(/^(00965|965)/, '');
  return /^[4569]\d{7}$/.test(d) ? `+965${d}` : null;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    const caller = auth.user;
    if (!caller) return json({ error: 'not_signed_in' }, 401);
    const { data: me } = await db.from('profiles').select('role, is_active').eq('id', caller.id).maybeSingle();
    const myRole = (me?.is_active ? me.role : null) as Role | null;
    if (!myRole || !['super_admin', 'manager', 'receptionist'].includes(myRole)) return json({ error: 'not_allowed' }, 403);

    const body = await req.json();
    const canManage = (role: Role) => myRole === 'super_admin' ? STAFF_ROLES.includes(role) : myRole === 'manager' && MANAGER_CAN.includes(role);

    const createUser = async (mail: string, meta: Record<string, unknown>) => {
      const password = tempPassword();
      const { data, error } = await db.auth.admin.createUser({ email: mail, password, email_confirm: true, user_metadata: meta });
      if (error || !data.user) {
        const taken = /already|registered|exists/i.test(error?.message ?? '');
        return { error: taken ? 'email_taken' : 'create_failed' } as const;
      }
      return { id: data.user.id, password } as const;
    };

    if (body.action === 'create_staff') {
      const role = body.role as Role;
      const mail = email(body.email);
      const name = text(body.full_name);
      const ph = body.phone ? phone(body.phone) : null;
      if (!mail || !name || (body.phone && !ph)) return json({ error: 'bad_request' }, 400);
      if (!canManage(role)) return json({ error: 'not_allowed' }, 403);
      const sport = role === 'coach' ? (body.sport === 'jiujitsu' ? 'jiujitsu' : body.sport === 'swimming' ? 'swimming' : null) : null;
      if (role === 'coach' && !sport) return json({ error: 'sport_required' }, 400);
      const u = await createUser(mail, { full_name: name, phone: ph, preferred_language: 'en' });
      if ('error' in u) return json({ error: u.error }, 409);
      const { error } = await db.from('profiles').update({ role, sport, full_name: name, phone: ph }).eq('id', u.id);
      await db.rpc('remember_temp_password', { p_user: u.id });
      if (error) {
        await db.auth.admin.deleteUser(u.id);
        return json({ error: 'create_failed' }, 500);
      }
      return json({ user_id: u.id, temp_password: u.password });
    }

    if (body.action === 'update_staff' || body.action === 'reset_password') {
      const id = String(body.user_id ?? '');
      const { data: target } = await db.from('profiles').select('id, role, is_active').eq('id', id).maybeSingle();
      if (!target) return json({ error: 'not_found' }, 404);
      const targetRole = target.role as Role;

      if (body.action === 'reset_password') {
        const ok = targetRole === 'parent' ? true : canManage(targetRole); // families: owner, manager, reception
        if (!ok || id === caller.id) return json({ error: 'not_allowed' }, 403);
        const password = tempPassword();
        const { error } = await db.auth.admin.updateUserById(id, { password });
        if (error) return json({ error: 'failed' }, 500);
        await db.rpc('remember_temp_password', { p_user: id });
        return json({ temp_password: password });
      }

      if (targetRole === 'parent' || !canManage(targetRole)) return json({ error: 'not_allowed' }, 403);
      const patch: Record<string, unknown> = {};
      if (body.role !== undefined && body.role !== targetRole) {
        if (id === caller.id || !canManage(body.role as Role)) return json({ error: 'not_allowed' }, 403);
        patch.role = body.role;
      }
      const newRole = (patch.role ?? targetRole) as Role;
      if (body.sport !== undefined || patch.role) {
        const sport = newRole === 'coach' ? (body.sport ?? null) : null;
        if (newRole === 'coach' && !['swimming', 'jiujitsu'].includes(String(sport))) return json({ error: 'sport_required' }, 400);
        patch.sport = sport;
      }
      if (body.full_name !== undefined) {
        const n = text(body.full_name);
        if (!n) return json({ error: 'bad_request' }, 400);
        patch.full_name = n;
      }
      if (body.phone !== undefined) {
        const p = body.phone ? phone(body.phone) : null;
        if (body.phone && !p) return json({ error: 'bad_phone' }, 400);
        patch.phone = p;
      }
      if (body.is_active !== undefined && Boolean(body.is_active) !== target.is_active) {
        if (id === caller.id) return json({ error: 'not_allowed' }, 403);
        patch.is_active = Boolean(body.is_active);
        // switched off: logging in is blocked (and current sessions can't refresh); history stays
        const { error } = await db.auth.admin.updateUserById(id, { ban_duration: patch.is_active ? 'none' : '876000h' });
        if (error) return json({ error: 'failed' }, 500);
      }
      if (Object.keys(patch).length) {
        const { error } = await db.from('profiles').update(patch).eq('id', id);
        if (error) return json({ error: 'failed' }, 500);
      }
      return json({ ok: true });
    }

    if (body.action === 'create_family') {
      const mail = email(body.email);
      const name = text(body.full_name);
      const ph = phone(body.phone);
      if (!mail || !name) return json({ error: 'bad_request' }, 400);
      if (!ph) return json({ error: 'bad_phone' }, 400);
      const type = body.account_type === 'single' ? 'single' : 'family';
      const rel = type === 'family' && RELATIONSHIPS.includes(String(body.relationship)) ? String(body.relationship) : null;
      const u = await createUser(mail, { full_name: name, phone: ph, preferred_language: body.lang === 'ar' ? 'ar' : 'en', account_type: type, relationship: rel });
      if ('error' in u) return json({ error: u.error }, 409);
      await db.rpc('remember_temp_password', { p_user: u.id });
      return json({ user_id: u.id, temp_password: u.password });
    }

    return json({ error: 'bad_request' }, 400);
  } catch (e) {
    console.error('accounts error', e instanceof Error ? e.message : String(e));
    return json({ error: 'server_error' }, 500);
  }
});
