// UPayments online payments for LOSE | GAIN subscriptions.
//
//   POST /upayments/create   (parent, signed in)  { subscription_id, lang? , return_base? } -> { link }
//   POST /upayments/confirm  (parent, signed in)  { track_id }                            -> { status }
//   POST /upayments/webhook  (UPayments server)   notification body                       -> 200
//
// The price always comes from the database, never from the app. A subscription only becomes
// active after we ask UPayments ourselves (get-payment-status) and see result = CAPTURED with
// the same amount. The UPayments key lives here on the server only.

import { createClient } from 'npm:@supabase/supabase-js@2';

// Sandbox by default. For live payments set UPAYMENTS_BASE_URL and UPAYMENTS_TOKEN as function secrets.
const UPAY_BASE = Deno.env.get('UPAYMENTS_BASE_URL') ?? 'https://sandboxapi.upayments.com/api/v1';
// Public test token published by UPayments on their "Test environment details" page (sandbox only).
const UPAY_TOKEN = Deno.env.get('UPAYMENTS_TOKEN') ?? 'NWty8gdjt79cf756hdtyu6u8jht5ns6gfhgy8hdjL';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } });

// Where parents land after paying. Only these sites are allowed.
const RETURN_BASES = ['https://lg-complex-app.vercel.app', 'http://localhost:8081'];

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

type Sub = {
  id: string;
  kid_id: string;
  total: number;
  status: string;
  payment_order_id: string | null;
  kids: { full_name: string; parent_id: string };
};

async function signedInUser(req: Request) {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data } = await db.auth.getUser(token);
  return data.user ?? null;
}

async function upay(path: string, init: RequestInit = {}) {
  const res = await fetch(`${UPAY_BASE}/${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${UPAY_TOKEN}`, Accept: 'application/json', 'Content-Type': 'application/json', ...(init.headers ?? {}) },
  });
  const text = await res.text();
  let body: any = null;
  try {
    body = JSON.parse(text);
  } catch {
    body = { raw: text };
  }
  return { ok: res.ok, status: res.status, body };
}

/** Ask UPayments for the truth about a payment, then activate the matching subscription if it was captured. */
async function settle(trackId: string, mustBelongTo?: string) {
  const r = await upay(`get-payment-status/${encodeURIComponent(trackId)}`);
  const txn = r.body?.data?.transaction;
  if (!r.ok || !txn) return { status: 'unknown', detail: r.body?.message ?? `status ${r.status}` };

  const ids = [txn.requested_order_id, txn.order_id, txn.reference].filter(Boolean).map(String);
  const { data: subs } = await db
    .from('subscriptions')
    .select('id, kid_id, total, status, payment_order_id, kids!inner(full_name, parent_id)')
    .in('payment_order_id', ids.length ? ids : ['-']);
  const sub = (subs?.[0] ?? null) as Sub | null;
  if (!sub) return { status: 'not_found' };
  if (mustBelongTo && sub.kids.parent_id !== mustBelongTo) return { status: 'not_found' };
  if (sub.status === 'active') return { status: 'paid', subscription_id: sub.id };

  const captured = String(txn.result).toUpperCase() === 'CAPTURED';
  const amountOk = Math.abs(parseFloat(txn.total_price ?? '0') - Number(sub.total)) < 0.001;
  if (!captured) return { status: 'not_paid', result: txn.result };
  if (!amountOk) return { status: 'amount_mismatch' };

  const { data: updated } = await db
    .from('subscriptions')
    .update({ status: 'active', payment_method: 'online', paid_at: new Date().toISOString(), payment_track_id: String(txn.track_id ?? trackId) })
    .eq('id', sub.id)
    .eq('status', 'pending_payment')
    .select('id');

  if (updated?.length) {
    const name = sub.kids.full_name;
    await db.from('notifications').insert({
      user_id: sub.kids.parent_id,
      kind: 'payment_received',
      title_en: 'Payment received',
      body_en: `${name}'s subscription is now active. Paid online (${Number(sub.total).toFixed(3)} KD).`,
      title_ar: 'تم استلام الدفع',
      body_ar: `اشتراك ${name} أصبح فعالاً. تم الدفع أونلاين (${Number(sub.total).toFixed(3)} د.ك).`,
    });
  }
  return { status: 'paid', subscription_id: sub.id };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const route = new URL(req.url).pathname.split('/').pop();

  try {
    if (route === 'create' && req.method === 'POST') {
      const user = await signedInUser(req);
      if (!user) return json({ error: 'not_signed_in' }, 401);
      const { subscription_id, lang, return_base } = await req.json();

      const { data: sub } = await db
        .from('subscriptions')
        .select('id, kid_id, total, status, payment_order_id, kids!inner(full_name, parent_id)')
        .eq('id', subscription_id)
        .maybeSingle<Sub>();
      if (!sub || sub.kids.parent_id !== user.id) return json({ error: 'not_found' }, 404);
      if (sub.status !== 'pending_payment') return json({ error: 'not_waiting_for_payment' }, 409);

      const { data: parent } = await db.from('profiles').select('full_name, phone').eq('id', user.id).maybeSingle();
      // a fresh order id per attempt (UPayments limits: order 40, reference 35 chars)
      const orderId = `${sub.id.replace(/-/g, '').slice(0, 24)}${Date.now().toString(36)}`.slice(0, 35);
      await db.from('subscriptions').update({ payment_order_id: orderId, payment_link_at: new Date().toISOString() }).eq('id', sub.id);

      const base = RETURN_BASES.includes(return_base) ? return_base : RETURN_BASES[0];
      const charge = {
        order: {
          id: orderId,
          reference: orderId,
          description: `LOSE | GAIN Complex subscription: ${sub.kids.full_name}`.slice(0, 500),
          currency: 'KWD',
          amount: Number(Number(sub.total).toFixed(3)),
        },
        language: lang === 'ar' ? 'ar' : 'en',
        reference: { id: orderId },
        customer: {
          uniqueId: user.id,
          name: (parent?.full_name ?? 'Parent').slice(0, 50),
          email: (user.email ?? '').slice(0, 50),
          mobile: (parent?.phone ?? '').slice(0, 15),
        },
        returnUrl: `${base}/payment-result`,
        cancelUrl: `${base}/payment-result?cancelled=1`,
        notificationUrl: `${SUPABASE_URL}/functions/v1/upayments/webhook`,
      };
      const r = await upay('charge', { method: 'POST', body: JSON.stringify(charge) });
      const link = r.body?.data?.link;
      if (!r.ok || !link) {
        console.error('charge failed', r.status, JSON.stringify(r.body));
        return json({ error: 'payment_link_failed', detail: r.body?.message ?? r.status }, 502);
      }
      return json({ link });
    }

    if (route === 'confirm' && req.method === 'POST') {
      const user = await signedInUser(req);
      if (!user) return json({ error: 'not_signed_in' }, 401);
      const { track_id } = await req.json();
      if (!track_id) return json({ error: 'missing_track_id' }, 400);
      return json(await settle(String(track_id), user.id));
    }

    if (route === 'webhook' && req.method === 'POST') {
      const raw = await req.text();
      let body: Record<string, unknown> = {};
      try {
        body = JSON.parse(raw);
      } catch {
        body = Object.fromEntries(new URLSearchParams(raw));
      }
      const trackId = body.track_id ?? (body as any).data?.track_id;
      console.log('webhook', JSON.stringify({ result: body.result, track_id: trackId, order: body.requested_order_id ?? body.order_id }));
      if (trackId) await settle(String(trackId));
      return json({ received: true });
    }

    return json({ error: 'not_found' }, 404);
  } catch (e) {
    console.error(e);
    return json({ error: 'server_error' }, 500);
  }
});
