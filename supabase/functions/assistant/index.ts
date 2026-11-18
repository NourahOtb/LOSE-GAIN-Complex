// LOSE | GAIN AI assistant for guardians and members (Claude, Anthropic).
//
//   POST /assistant  (member, signed in)
//   { messages: [{ role: 'user'|'assistant', content: string }], lang: 'ar'|'en' }
//   -> { reply: string, proposals: Proposal[] }   or  { error }
//
// Safety:
//  - The AI key lives only here (secret ANTHROPIC_API_KEY), never in the app.
//  - Every tool reads ONLY the signed-in member's own family.
//  - The assistant can't change anything. It can only PREPARE a registration or a payment;
//    the app shows a Confirm card and the member's own tap does the real action
//    (through the same "register" server function and payment flow as the buttons).
//  - Anything it can't handle is handed to reception (assistant_handoffs).
//  - It only works after the member agreed (once) to share their family's details with the AI service;
//    the whole complex has a daily cap (assistant_take) as well as 40 messages per member.

import Anthropic from 'npm:@anthropic-ai/sdk';
import { betaTool } from 'npm:@anthropic-ai/sdk/helpers/beta/json-schema';
import { createClient } from 'npm:@supabase/supabase-js@2';

import { pricingFrom, WEEKDAYS } from './pricing.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const db = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false } });
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const DAILY_LIMIT = 40;
const MODEL = 'claude-opus-5-5';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

// Stable instructions (cached). Facts come from the owner (2026-11-18); see apps/mobile/src/lib/about.ts.
const SYSTEM = `You are the assistant inside the LOSE | GAIN Complex app, a family sports center for swimming and Brazilian jiu-jitsu in Mansouriya, Kuwait. You talk with guardians (parents) and adult members.

Facts about the complex:
- Open Saturday to Thursday, 10:30 AM–9 PM. Friday closed. Location: Mansouriya, Kuwait.
- Swimming: kids' pool and Olympic pool. Kids' swimming classes at 4 PM and 5 PM, any days Saturday–Thursday (recommended groups Sun/Tue/Thu or Sat/Mon/Wed keep the same coaches). Men's swimming: 4 PM Sun/Tue/Thu, 4-week packages.
- Jiu-jitsu: two mats with a viewing area for parents. Warriors 1 (ages 5–7): 4 PM Sat/Mon/Wed, 5 PM Sun/Tue/Thu. Warriors 2 (8–10): 4 PM Sun/Tue/Thu, 5 PM Sat/Mon/Wed. Titans (11–15) and adults: 6–7:30 PM Sunday–Thursday (Gi Thursday→Monday, No-Gi Tuesday and Wednesday). Women: 7:30–8:30 PM Sun/Tue/Thu; women may also join the 6 PM adult class. Saturday open mat 6 PM is free.
- Open pool membership (adults, men and women): 10:30 AM–3 PM and 7:30–9 PM, Saturday–Thursday, unlimited, price per 4 weeks in get_price_list; one 1-week freeze per membership (reception approves). If the complex closes the pool, members get an extra day.
- Kids can start any day. Family discount (kids only) from the 2nd kid; 3/6/12-month packages get a discount (kids only). Payment at reception (KNET) or online (KNET/card).

How you work:
- Use your tools to look things up. Never guess a member's schedule, sessions left or a price: call get_my_family, get_timetable, get_price_list or check_price.
- You can't change anything yourself. To register, renew or pay, call prepare_registration or prepare_payment: the app then shows a card with the price, and only the guardian's tap makes it happen. Tell them to tap the button below: "Confirm" in English, "تأكيد" in Arabic ("Pay online" / "ادفع أونلاين" for payments). Never say it is done.
- Renewing = preparing a new registration with the same days and times, starting on a class day after the current end date (or the nearest allowed date within the next 2 weeks).
- Pausing and requests: in the app, Home → "Pause or change" under a registration (Arabic: "إيقاف أو تغيير"). There the guardian can pause up to 1 week by themselves (once per registration; the end date moves, no sessions are lost), or ask reception for a longer injury pause, a change of days or time, or to cancel. Point them there first.
- Closed days (holidays): get_timetable lists them. Classes missed on a closed day are added to the end of the registration automatically.
- Refunds, complaints, make-up classes, private classes or anything unusual: call handoff_to_reception with a short, clear summary, then tell the guardian reception will reply in the app inbox.
- Keep answers short and warm: a few sentences or a short list. Use the member's name. Prices in KD with 3 decimals (for example 90.000 KD).
- Write plain text only: no Markdown, no ** or #, no tables. For a list, start lines with "- ". No emojis.
- Classes that already started or ended today are not "next": compare with the current Kuwait time given at the end.
- Reply in the language the guardian writes in (Arabic or English); if unsure, use the app language given at the end.
- Only talk about LOSE | GAIN Complex, its classes, the guardian's family and general sports and safety questions related to the classes. Don't give medical advice; suggest asking a doctor and telling the coach.`;

type Proposal =
  | { type: 'register'; member: string; label: string; start_date: string; end_date: string; total: number; params: Record<string, unknown> }
  | { type: 'pay'; member: string; label: string; total: number; subscription_id: string };

const ageOn = (birth: string) => {
  const b = new Date(birth + 'T00:00:00Z');
  const n = new Date(Date.now() + 3 * 3600_000);
  let a = n.getUTCFullYear() - b.getUTCFullYear();
  if (n.getUTCMonth() < b.getUTCMonth() || (n.getUTCMonth() === b.getUTCMonth() && n.getUTCDate() < b.getUTCDate())) a--;
  return a;
};
const DAY_NAME: Record<string, string> = { sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu' };
const DAY_AR: Record<string, string> = { sat: 'السبت', sun: 'الأحد', mon: 'الاثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس' };
const arDigits = (x: string) => x.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]);
const t12ar = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return arDigits(`${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''}`) + (h < 12 ? ' ص' : ' م');
};
const LENGTH: Record<string, [string, string]> = {
  '1w': ['1 week', 'أسبوع'], '2w': ['2 weeks', 'أسبوعان'], '4w': ['4 weeks', '٤ أسابيع'],
  '3m': ['3 months', '٣ أشهر'], '6m': ['6 months', '٦ أشهر'], '12m': ['12 months', '١٢ شهراً'],
};
const t12 = (t: string) => {
  const [h, m] = t.slice(0, 5).split(':').map(Number);
  return `${h % 12 || 12}${m ? `:${String(m).padStart(2, '0')}` : ''} ${h < 12 ? 'AM' : 'PM'}`;
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'not_found' }, 404);
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data: auth } = await db.auth.getUser(token);
    const user = auth.user;
    if (!user) return json({ error: 'not_signed_in' }, 401);
    const { data: me } = await db.from('profiles').select('full_name, role, account_type, relationship, is_active, ai_consent_at').eq('id', user.id).maybeSingle();
    if (!me || me.role !== 'parent' || !me.is_active) return json({ error: 'not_allowed' }, 403);
    // the member agreed (once) that their family's details are sent to the AI service to answer
    if (!me.ai_consent_at) return json({ error: 'consent_required' }, 403);

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) return json({ error: 'not_configured' }, 503);

    const { data: ok } = await db.rpc('assistant_take', { p_user: user.id, p_limit: DAILY_LIMIT });
    if (ok === false) return json({ error: 'daily_limit' }, 429);

    const body = await req.json();
    const lang = body.lang === 'ar' ? 'ar' : 'en';
    // the app sends plain text turns; keep the last 12, each up to 2000 characters
    const history = (Array.isArray(body.messages) ? body.messages : [])
      .filter((m: { role?: string; content?: unknown }) => (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      .slice(-12)
      .map((m: { role: 'user' | 'assistant'; content: string }) => ({ role: m.role, content: m.content.slice(0, 2000) }));
    if (!history.length || history[history.length - 1].role !== 'user') return json({ error: 'bad_request' }, 400);
    while (history.length && history[0].role !== 'user') history.shift();

    const proposals: Proposal[] = [];

    // ---------- tools (all scoped to this member's own family) ----------
    const family = async () => {
      const { data: kids } = await db.from('kids').select('id, full_name, birth_date, gender, is_self, swim_level, belt').eq('parent_id', user.id).order('created_at');
      const ids = (kids ?? []).map((k) => k.id);
      const { data: subs } = ids.length
        ? await db
            .from('subscriptions')
            .select('id, kid_id, kind, swim_days, bjj_days, start_time, bjj_times, start_date, end_date, status, sessions_total, sessions_used, total, freeze_status, freeze_start')
            .in('kid_id', ids)
            .in('status', ['active', 'pending_payment'])
        : { data: [] };
      return { kids: kids ?? [], subs: subs ?? [] };
    };

    const callRegister = async (params: Record<string, unknown>) => {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/register`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, apikey: ANON, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...params, dry_run: true }),
      });
      return (await res.json()) as Record<string, unknown>;
    };

    const regSchema = {
      type: 'object',
      properties: {
        member_id: { type: 'string', description: 'id of the kid or adult member (from get_my_family)' },
        kind: { type: 'string', enum: ['classes', 'open_pool'] },
        swim_days: { type: 'array', items: { type: 'string', enum: [...WEEKDAYS] } },
        bjj_days: { type: 'array', items: { type: 'string', enum: [...WEEKDAYS] } },
        swim_time: { type: 'string', enum: ['16:00', '17:00'], description: "kids' swimming time" },
        adult_time: { type: 'string', enum: ['18:00', '19:30'], description: "women's jiu-jitsu: 18:00 adult class or 19:30 women's class" },
        duration: { type: 'string', enum: ['1w', '2w', '4w', '3m', '6m', '12m'] },
        start_date: { type: 'string', description: 'YYYY-MM-DD first day; must be one of the chosen days within the next 14 days (open pool: any day but Friday)' },
      },
      required: ['member_id', 'kind', 'duration', 'start_date'],
      additionalProperties: false,
    } as const;
    const toParams = (i: Record<string, unknown>) => ({
      kid_id: String(i.member_id ?? ''),
      kind: i.kind === 'open_pool' ? 'open_pool' : 'classes',
      swim_days: Array.isArray(i.swim_days) ? i.swim_days : [],
      bjj_days: Array.isArray(i.bjj_days) ? i.bjj_days : [],
      swim_time: i.swim_time === '17:00' ? '17:00' : '16:00',
      adult_time: i.adult_time === '19:30' ? '19:30' : '18:00',
      duration: String(i.duration ?? '4w'),
      start_date: String(i.start_date ?? ''),
    });

    const tools = [
      betaTool({
        name: 'get_my_family',
        description: "The guardian's members (kids and/or themself) with age, gender, swimming level, belt, and current registrations: days, times, dates, status (active or waiting for payment), sessions left, price, open pool freeze. Also upcoming class cancellations and open pool closures.",
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        run: async () => {
          const f = await family();
          const today = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
          const [{ data: cancels }, { data: closures }] = await Promise.all([
            db.from('class_cancellations').select('on_date, classes(sport, label, weekday, start_time)').gte('on_date', today).limit(30),
            db.from('open_pool_closures').select('on_date, session').gte('on_date', today),
          ]);
          return JSON.stringify({
            today,
            account: { name: me.full_name, type: me.account_type, relationship: me.relationship },
            members: f.kids.map((k) => ({ id: k.id, name: k.full_name, age: ageOn(k.birth_date), gender: k.gender, is_account_holder: k.is_self, swim_level: k.swim_level, belt: k.belt })),
            registrations: f.subs.map((s) => ({
              id: s.id,
              member_id: s.kid_id,
              kind: s.kind,
              swimming: s.swim_days.length ? `${s.swim_days.map((d: string) => DAY_NAME[d]).join(', ')} at ${t12(s.start_time)}` : null,
              jiujitsu: s.bjj_days.length ? s.bjj_days.map((d: string) => `${DAY_NAME[d]} ${t12((s.bjj_times ?? {})[d] ?? s.start_time)}`).join(', ') : null,
              start_date: s.start_date,
              end_date: s.end_date,
              status: s.status === 'pending_payment' ? 'waiting for payment' : 'active',
              sessions_left: s.kind === 'open_pool' ? null : s.sessions_total - s.sessions_used,
              total_kd: Number(s.total),
              freeze: s.freeze_status ? { status: s.freeze_status, from: s.freeze_start } : null,
            })),
            class_cancellations: cancels ?? [],
            open_pool_closures: closures ?? [],
          });
        },
      }),
      betaTool({
        name: 'get_timetable',
        description: 'The weekly timetable (sport, class name, day, start time, length, who it is for) and the upcoming days the whole complex is closed (holidays).',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        run: async () => {
          const [{ data }, { data: closed }] = await Promise.all([
            db.from('classes').select('sport, label, weekday, start_time, duration_min, audience, is_free, min_age, max_age').eq('is_active', true),
            db.from('closures').select('on_date, reason').gte('on_date', new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10)).order('on_date').limit(30),
          ]);
          return JSON.stringify({ classes: data ?? [], closed_days: closed ?? [] });
        },
      }),
      betaTool({
        name: 'get_price_list',
        description: 'The price tables (KD) for kids, Titans, adult jiu-jitsu (men/women), men\'s swimming and the open pool, plus discounts. For an exact price for a member, use check_price.',
        inputSchema: { type: 'object', properties: {}, additionalProperties: false },
        run: async () => {
          const { data } = await db.from('pricing').select('config').eq('id', 1).maybeSingle();
          return JSON.stringify(pricingFrom(data?.config));
        },
      }),
      betaTool({
        name: 'check_price',
        description: 'Exact price and dates for a possible registration of one member (nothing is saved). Returns an error code if the choice is not offered.',
        inputSchema: regSchema,
        run: async (input: Record<string, unknown>) => JSON.stringify(await callRegister(toParams(input))),
      }),
      betaTool({
        name: 'prepare_registration',
        description: 'Prepare a registration or renewal for the guardian to confirm. Shows a Confirm card with the price in the app. Nothing happens until the guardian taps Confirm.',
        inputSchema: regSchema,
        run: async (input: Record<string, unknown>) => {
          const params = toParams(input);
          const r = await callRegister(params);
          if (!r.ok) return JSON.stringify({ shown: false, error: r.error ?? 'not_offered' });
          const f = await family();
          const kid = f.kids.find((k) => k.id === params.kid_id);
          const ar = lang === 'ar';
          const day = (d: string) => (ar ? DAY_AR[d] : DAY_NAME[d]);
          const tm = (x: string) => (ar ? t12ar(x) : t12(x));
          const parts: string[] = [];
          if (params.kind === 'open_pool') parts.push(ar ? 'المسبح المفتوح' : 'Open pool');
          if ((params.swim_days as string[]).length) {
            parts.push(`${ar ? 'السباحة' : 'Swimming'} ${(params.swim_days as string[]).map(day).join(ar ? '، ' : ', ')} ${tm(String(r.swim_time ?? '16:00'))}`);
          }
          if ((params.bjj_days as string[]).length) {
            const times = (r.bjj_times ?? {}) as Record<string, string>;
            parts.push(`${ar ? 'الجوجيتسو' : 'Jiu-jitsu'} ${(params.bjj_days as string[]).map((d) => `${day(d)} ${tm(times[d] ?? '18:00')}`).join(ar ? '، ' : ', ')}`);
          }
          proposals.push({
            type: 'register',
            member: kid?.full_name ?? '',
            label: `${parts.join(' + ')} · ${(LENGTH[params.duration] ?? [params.duration, params.duration])[ar ? 1 : 0]}`,
            start_date: String(r.start_date),
            end_date: String(r.end_date),
            total: Number(r.total),
            params,
          });
          return JSON.stringify({ shown: true, total_kd: r.total, start_date: r.start_date, end_date: r.end_date });
        },
      }),
      betaTool({
        name: 'prepare_payment',
        description: 'Show a Pay online card for a registration that is waiting for payment. Nothing happens until the guardian taps it.',
        inputSchema: { type: 'object', properties: { registration_id: { type: 'string' } }, required: ['registration_id'], additionalProperties: false },
        run: async (input: Record<string, unknown>) => {
          const f = await family();
          const s = f.subs.find((x) => x.id === String(input.registration_id ?? ''));
          if (!s || s.status !== 'pending_payment') return JSON.stringify({ shown: false, error: 'not_waiting_for_payment' });
          const kid = f.kids.find((k) => k.id === s.kid_id);
          const label = s.kind === 'open_pool' ? (lang === 'ar' ? 'المسبح المفتوح' : 'Open pool') : lang === 'ar' ? 'تسجيل بانتظار الدفع' : 'Registration waiting for payment';
          proposals.push({ type: 'pay', member: kid?.full_name ?? '', label, total: Number(s.total), subscription_id: s.id });
          return JSON.stringify({ shown: true });
        },
      }),
      betaTool({
        name: 'handoff_to_reception',
        description: 'Send a request the assistant cannot handle (refund, complaint, make-up, private class, anything unusual; pauses, changes and cancelling are done in the app under "Pause or change") to reception. They reply in the app inbox.',
        inputSchema: { type: 'object', properties: { summary: { type: 'string', description: 'Short summary in English with member names and what is needed' } }, required: ['summary'], additionalProperties: false },
        run: async (input: Record<string, unknown>) => {
          const summary = String(input.summary ?? '').trim().slice(0, 1000);
          if (!summary) return JSON.stringify({ sent: false });
          const { error } = await db.from('assistant_handoffs').insert({ parent_id: user.id, summary });
          return JSON.stringify({ sent: !error });
        },
      }),
    ];

    const client = new Anthropic({ apiKey });
    const kw = new Date(Date.now() + 3 * 3600_000);
    const today = `${kw.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })}, ${kw.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })}`;
    const messages = [
      ...history,
      // per-request facts as a system note after the latest message, so the instructions above stay cached
      { role: 'system', content: `Now: ${today} (Kuwait time). App language: ${lang === 'ar' ? 'Arabic' : 'English'}. Guardian: ${me.full_name}.` },
    ];

    // deno-lint-ignore no-explicit-any
    const params: any = {
      model: MODEL,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: { effort: 'low' },
      system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
      tools,
      messages,
      max_iterations: 8,
    };
    const final = await client.beta.messages.toolRunner(params);

    let reply = '';
    if (final.stop_reason === 'refusal') {
      reply = lang === 'ar' ? 'لا أستطيع المساعدة في هذا. يمكن للاستقبال مساعدتك.' : "I can't help with that one. Reception can help you.";
    } else {
      // deno-lint-ignore no-explicit-any
      reply = (final.content as any[]).filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
    }
    return json({ reply, proposals });
  } catch (e) {
    console.error('assistant error', e instanceof Error ? e.message : String(e));
    if (e instanceof Anthropic.APIError) return json({ error: 'ai_unavailable' }, 502);
    return json({ error: 'server_error' }, 500);
  }
});
