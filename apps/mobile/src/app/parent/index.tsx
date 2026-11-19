import { addDays, daysUntil, formatKD, isoDate, nextClass, timeOf, weekMarks, type Mark, type Sport } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { AssistantEntry } from '@/components/assistant-entry';
import { BeltBar } from '@/components/belt';
import { DateStrip } from '@/components/date-strip';
import { HomeHeader } from '@/components/home-header';
import { PaceClock } from '@/components/pace-clock';
import { Button, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { checkPayment, startOnlinePayment, type PayStatus } from '@/lib/payments';
import { ageGroupOf, clockTime } from '@/lib/data';
import { findClass, loadFamily, type FamilyData } from '@/lib/family';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { sportColor, usePalette } from '@/lib/theme';

const DAYS = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as const;

export default function ParentHome() {
  const { t, lang, isRTL } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const [data, setData] = useState<FamilyData | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const now = new Date();
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';

  const [attempts, setAttempts] = useState<Record<string, PayStatus>>({});

  const load = useCallback(async () => {
    if (!profile) return;
    const fam = await loadFamily(profile.id);
    setData(fam);
    // a parent may come back from UPayments by any route (back button, closed tab, error page):
    // check recent online payment attempts and refresh if one went through
    const recent = fam.subs.filter((s) => s.status === 'pending_payment' && s.payment_link_at && Date.now() - new Date(s.payment_link_at).getTime() < 3 * 3600_000);
    if (!recent.length) return;
    const results = await Promise.all(recent.map(async (s) => [s.id, await checkPayment(s.id)] as const));
    setAttempts(Object.fromEntries(results));
    if (results.some(([, st]) => st === 'paid')) setData(await loadFamily(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) {
    return (
      <Screen edges={['top']}>
        <HomeHeader />
        <ActivityIndicator color={p.ink} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const kidById = new Map(data.kids.map((k) => [k.id, k]));
  const active = data.subs.filter((s) => s.status === 'active');
  const pending = data.subs.filter((s) => s.status === 'pending_payment');
  const next = nextClass(active, data.cancels, now);

  // lanes: one per kid+sport with an active subscription
  const lanes = active.flatMap((s) =>
    (['swimming', 'jiujitsu'] as Sport[])
      .filter((sp) => (sp === 'swimming' ? s.swim_days : s.bjj_days).length > 0)
      .map((sp) => ({ sub: s, sport: sp, kid: kidById.get(s.kid_id)! })),
  );

  // alerts: cancellations this week, renewals within 3 days
  const alerts: { text: string; action?: () => void; cta?: string }[] = [];
  const todayIso = isoDate(now);
  const soon = isoDate(addDays(now, 14));
  const closedSet = new Set(data.closures.map((c) => c.on_date));
  for (const c of data.closures.filter((x) => x.on_date >= todayIso && x.on_date <= soon)) {
    const date = new Date(c.on_date + 'T00:00:00').toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    alerts.push({ text: c.reason ? t('home.closedReason', { date, reason: c.reason }) : t('home.closed', { date }) });
  }
  // waitlist: an offered place first (it has a deadline), then classes they're waiting for
  const classById = new Map(data.classes.map((c) => [c.id, c]));
  const clsText = (classId: string) => {
    const c = classById.get(classId);
    return c ? `${t(`sport.${c.sport}`)} ${t(`day.${c.weekday}` as StringKey)} ${clockTime(c.start_time, lang ?? 'en')}` : '';
  };
  for (const w of data.waitlist) {
    const kid = kidById.get(w.kid_id)?.full_name ?? '';
    if (w.status === 'offered' && w.offer_expires) {
      const date = new Date(w.offer_expires).toLocaleString(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });
      alerts.unshift({ text: t('home.offer', { kid, cls: clsText(w.class_id), date }), action: () => router.push({ pathname: '/parent/register', params: { kid: w.kid_id, cls: w.class_id } }), cta: t('tab.register') });
    } else alerts.push({ text: t('home.waiting', { kid, cls: clsText(w.class_id) }) });
  }
  for (const lane of lanes) {
    for (const m of weekMarks(lane.sub, lane.sport, data.cancels, now)) {
      if (m.mark === 'cancelled' && !closedSet.has(m.date)) {
        alerts.push({ text: t('home.cancelled', { sport: t(`sport.${lane.sport}`), day: t(`day.${m.day}`) }) });
      }
    }
  }
  for (const s of active) {
    const left = daysUntil(s.end_date, now);
    const kid = kidById.get(s.kid_id);
    if (kid && left >= 0 && left <= 3) {
      alerts.push({
        text: left === 0 ? t('home.renewToday', { kid: kid.full_name }) : t('home.renewSoon', { kid: kid.full_name, n: left }),
        action: () => router.push('/parent/register'),
      });
    }
  }

  const nextInfo = (() => {
    if (!next) return null;
    const kid = kidById.get(next.sub.kid_id);
    const wd = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][next.at.getDay()];
    const cls = kid ? findClass(data.classes, next.sport, wd, timeOf(next.sub, next.sport, wd), ageGroupOf(next.sport, kid)) : undefined;
    const isToday = next.at.toDateString() === now.toDateString();
    const isTomorrow = next.at.toDateString() === new Date(now.getTime() + 86400000).toDateString();
    const when = isToday ? t('home.today') : isTomorrow ? t('home.tomorrow') : next.at.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'short' });
    return {
      kid: kid?.full_name ?? '',
      place: cls ? t(`place.${cls.location}` as StringKey) : t(`sport.${next.sport}`),
      coach: cls?.coach_id ? data.coaches[cls.coach_id] : undefined,
      when,
      time: next.at.toLocaleTimeString(lang === 'ar' ? 'ar-KW' : 'en-US', { hour: 'numeric', minute: '2-digit' }),
      minutes: next.at.getMinutes(),
    };
  })();

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, gap: 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        {/* pace clock: the next class */}
        <View style={{ marginHorizontal: 20, backgroundColor: p.tile, borderRadius: 4, padding: 16, flexDirection: 'row', alignItems: 'center', gap: 16 }}>
          <PaceClock minutes={nextInfo?.minutes ?? 0} />
          {nextInfo ? (
            <View style={{ flex: 1 }}>
              <Label>{t('home.next', { kid: nextInfo.kid, place: nextInfo.place })}</Label>
              <T w="cond" size={40} style={{ lineHeight: 44 }}>
                {nextInfo.time}
              </T>
              <T size={13}>{nextInfo.coach ? t('home.with', { when: nextInfo.when, coach: nextInfo.coach }) : nextInfo.when}</T>
            </View>
          ) : active.some((s) => s.kind === 'open_pool') ? (
            <View style={{ flex: 1, gap: 4 }}>
              <Label color={p.swim}>{t('pool.title')}</Label>
              <T w="semibold">{t('pool.hours')}</T>
            </View>
          ) : (
            <View style={{ flex: 1, gap: 8 }}>
              <T w="semibold">{t('home.noNext')}</T>
              <Button variant="link" title={t('home.registerCta')} onPress={() => router.push('/parent/register')} />
            </View>
          )}
        </View>

        <View style={{ marginHorizontal: 20 }}>
          <AssistantEntry />
        </View>

        {/* this week as pool lanes */}
        {lanes.length > 0 ? (
          <View style={{ marginHorizontal: 20 }}>
            <Label>{t('home.week')}</Label>
            <View style={{ flexDirection: 'row', marginTop: 8, marginStart: 74, paddingEnd: 14 }}>
              {DAYS.map((d) => (
                <T key={d} w="cond" size={12} color={p.inkSoft} style={{ flex: 1, textAlign: 'center' }}>
                  {t(`day.${d}`)}
                </T>
              ))}
            </View>
            {lanes.map((lane) => (
              <Lane key={lane.sub.id + lane.sport} name={lane.kid.first_name || lane.kid.full_name.split(' ')[0]} sportLabel={t(`sport.${lane.sport}`)} color={sportColor(p, lane.sport)} marks={weekMarks(lane.sub, lane.sport, data.cancels, now).map((m) => m.mark)} isRTL={isRTL} />
            ))}
          </View>
        ) : null}

        {/* sessions left per kid */}
        {active.length + pending.length > 0 ? (
          <View style={{ marginHorizontal: 20, borderTopWidth: 2, borderTopColor: p.ink }}>
            {[...active, ...pending].map((s) => {
              const kid = kidById.get(s.kid_id);
              if (!kid) return null;
              if (s.kind === 'open_pool') return <PoolRow key={s.id} sub={s} name={kid.full_name} lastAttempt={attempts[s.id]} onChanged={load} />;
              const sport: Sport = s.swim_days.length >= s.bjj_days.length ? 'swimming' : 'jiujitsu';
              const left = s.sessions_total - s.sessions_used;
              const end = new Date(s.end_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
              const isPending = s.status === 'pending_payment';
              return (
                <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: p.line }}>
                  <T w="cond" size={46} color={isPending ? p.inkSoft : sportColor(p, sport)} style={{ width: 52, textAlign: 'center', lineHeight: 50 }}>
                    {left}
                  </T>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T w="semibold" size={16}>
                      {kid.full_name}
                    </T>
                    <T size={12} color={isPending ? p.bjj : p.inkSoft}>
                      {isPending ? t('home.pending', { amount: formatKD(s.total, lang ?? 'en') }) : t('home.left', { date: end })}
                      {daysUntil(s.start_date, now) > 0
                        ? ` · ${t('home.starts', { date: new Date(s.start_date + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}`
                        : ''}
                    </T>
                    {s.pause_end && s.pause_end >= isoDate(now) ? (
                      <T size={12} w="semibold" color={p.bjj}>
                        {t('home.paused', { date: new Date(s.pause_end + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' }) })}
                      </T>
                    ) : null}
                    {isPending ? <PayOnline subscriptionId={s.id} lastAttempt={attempts[s.id]} /> : null}
                    <Button variant="link" title={t('manage.link')} onPress={() => router.push({ pathname: '/manage/[id]', params: { id: s.id } })} style={{ alignSelf: 'flex-start', marginTop: 2 }} />
                    {kid.belt && s.bjj_days.length > 0 ? <BeltBar belt={kid.belt} stripes={kid.stripes?.[0]?.count ?? 0} height={12} width={150} /> : null}
                    {kid.swim_level && s.swim_days.length > 0 ? <Label color={p.swim}>{t('kids.level', { n: kid.swim_level })}</Label> : null}
                  </View>
                </View>
              );
            })}
          </View>
        ) : null}

        {/* alerts */}
        {alerts.map((a, i) => (
          <Pressable
            key={i}
            disabled={!a.action}
            onPress={a.action}
            style={{ marginHorizontal: 20, backgroundColor: p.ink, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
            <T size={14} color={p.onInk} style={{ flex: 1 }}>
              {a.text}
            </T>
            {a.action ? (
              <T w="semibold" size={14} color={p.onInk}>
                {a.cta ?? t('home.renew')}
              </T>
            ) : null}
          </Pressable>
        ))}
      </ScrollView>
    </Screen>
  );
}

function Lane({ name, sportLabel, color, marks, isRTL }: { name: string; sportLabel: string; color: string; marks: Mark[]; isRTL: boolean }) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', height: 58, borderTopWidth: 1, borderTopColor: p.line }}>
      {/* first name only, one line each: long names wrapped and ran into the row below */}
      <View style={{ width: 74, paddingEnd: 6 }}>
        <T w="semibold" size={15} numberOfLines={1}>
          {name}
        </T>
        <T size={11} color={p.inkSoft} numberOfLines={1}>
          {sportLabel}
        </T>
      </View>
      <View style={{ flex: 1, height: '100%', justifyContent: 'center' }}>
        {/* lane line with its T-end */}
        <View style={{ position: 'absolute', start: 0, end: 12, height: 5, backgroundColor: p.ink }} />
        <View style={{ position: 'absolute', end: 7, width: 5, height: 24, backgroundColor: p.ink }} />
        <View style={{ flexDirection: 'row', paddingEnd: 14 }}>
          {marks.map((m, i) => (
            <View key={i} style={{ flex: 1, alignItems: 'center' }}>
              {m === 'none' ? null : (
                <View
                  accessibilityLabel={m}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 13,
                    borderWidth: 3,
                    borderColor: m === 'cancelled' ? p.danger : m === 'paused' ? p.line : color,
                    borderStyle: m === 'paused' ? 'dashed' : 'solid',
                    backgroundColor: m === 'done' ? color : p.bg,
                    alignItems: 'center',
                    justifyContent: 'center',
                    transform: [{ scale: m === 'next' ? 1.15 : 1 }],
                  }}>
                  {m === 'cancelled' ? <View style={{ width: 22, height: 2.5, backgroundColor: p.danger, transform: [{ rotate: isRTL ? '45deg' : '-45deg' }] }} /> : null}
                </View>
              )}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

function PayOnline({ subscriptionId, lastAttempt }: { subscriptionId: string; lastAttempt?: PayStatus }) {
  const { t, lang } = useI18n();
  const p = usePalette();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  return (
    <View style={{ alignItems: 'flex-start', gap: 6, marginTop: 4 }}>
      {lastAttempt === 'not_paid' ? (
        <T size={12} color={p.danger}>
          {t('pay.lastFailed')}
        </T>
      ) : lastAttempt === 'pending' || lastAttempt === 'unknown' ? (
        <T size={12} color={p.inkSoft}>
          {t('pay.lastPending')}
        </T>
      ) : null}
      <Button
        title={busy ? t('pay.opening') : lastAttempt === 'not_paid' ? t('pay.tryAgain') : t('pay.now')}
        loading={busy}
        style={{ minHeight: 38, paddingHorizontal: 14 }}
        onPress={async () => {
          setBusy(true);
          setError('');
          const r = await startOnlinePayment(subscriptionId, lang ?? 'en');
          setBusy(false);
          if (r.kind === 'error') setError(t(`pay.err.${r.error}` as StringKey));
          if (r.kind === 'returned') router.push({ pathname: '/payment-result', params: { sub: subscriptionId } });
        }}
      />
      {error ? (
        <T size={12} color={p.danger}>
          {error}
        </T>
      ) : null}
    </View>
  );
}

/** An open pool membership on the home screen: until when, and the 1-week freeze. */
function PoolRow({ sub, name, lastAttempt, onChanged }: { sub: FamilyData['subs'][number]; name: string; lastAttempt?: PayStatus; onChanged: () => void }) {
  const { t, lang } = useI18n();
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const [start, setStart] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  const isPending = sub.status === 'pending_payment';

  // freeze can start any day from today (or the start date) up to the end, except Fridays
  const today = new Date();
  const first = sub.start_date > isoDate(today) ? new Date(sub.start_date + 'T00:00:00') : today;
  const dates: string[] = [];
  for (let i = 0; i < 28 && dates.length < 14; i++) {
    const d = addDays(first, i);
    const iso = isoDate(d);
    if (iso > sub.end_date) break;
    if (d.getDay() !== 5) dates.push(iso);
  }

  const send = async () => {
    if (!start) return;
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('request_pool_freeze', { p_sub: sub.id, p_start: start });
    setBusy(false);
    if (err) return setError(t('err.generic'));
    setOpen(false);
    onChanged();
  };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: p.line }}>
      <View style={{ width: 52, height: 52, borderRadius: 4, backgroundColor: p.tile, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ width: 30, height: 4, backgroundColor: p.swim, marginBottom: 5 }} />
        <View style={{ width: 30, height: 4, backgroundColor: p.swim }} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <T w="semibold" size={16}>
          {name}
        </T>
        <T size={12} color={isPending ? p.bjj : p.inkSoft}>
          {isPending ? `${t('pool.title')} · ${t('home.pending', { amount: formatKD(sub.total, lang ?? 'en') })}` : t('pool.until', { date: fmt(sub.end_date) })}
        </T>
        {isPending ? <PayOnline subscriptionId={sub.id} lastAttempt={lastAttempt} /> : null}
        {sub.status === 'active' && sub.freeze_status === 'requested' && sub.freeze_start ? (
          <T size={12} color={p.inkSoft}>{t('pool.freezeRequested', { date: fmt(sub.freeze_start) })}</T>
        ) : null}
        {sub.status === 'active' && sub.freeze_status === 'approved' && sub.freeze_start ? (
          <T size={12} color={p.swim}>{t('pool.freezeApproved', { date: fmt(sub.freeze_start) })}</T>
        ) : null}
        {sub.status === 'active' && sub.freeze_status === 'rejected' ? (
          <T size={12} color={p.danger}>{t('pool.freezeRejected')}</T>
        ) : null}
        {sub.status === 'active' && (!sub.freeze_status || sub.freeze_status === 'rejected') && dates.length > 0 ? (
          open ? (
            <View style={{ gap: 8, marginTop: 4 }}>
              <T w="semibold" size={14}>{t('pool.freezeTitle')}</T>
              <T size={12} color={p.inkSoft}>{t('pool.freezeHint')}</T>
              <DateStrip dates={dates} value={start} onChange={setStart} />
              {error ? <T size={12} color={p.danger}>{error}</T> : null}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Button title={t('pool.freezeSend')} onPress={send} loading={busy} disabled={!start} style={{ minHeight: 40, paddingHorizontal: 14 }} />
                <Button variant="ghost" title={t('common.cancel')} onPress={() => setOpen(false)} style={{ minHeight: 40, paddingHorizontal: 14 }} />
              </View>
            </View>
          ) : (
            <Button variant="link" title={t('pool.freeze')} onPress={() => setOpen(true)} style={{ alignSelf: 'flex-start' }} />
          )
        ) : null}
        {!open ? <Button variant="link" title={t('manage.link')} onPress={() => router.push({ pathname: '/manage/[id]', params: { id: sub.id } })} style={{ alignSelf: 'flex-start' }} /> : null}
      </View>
    </View>
  );
}
