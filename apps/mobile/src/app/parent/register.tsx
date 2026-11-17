import { addDays, DURATION_WEEKS, formatKD, isoDate, priceSubscription, startOptions, WEEKDAYS, type Duration, type Weekday } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import { HomeHeader } from '@/components/home-header';
import { DayPicker, Segmented } from '@/components/pickers';
import { Button, ErrorText, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { startOnlinePayment } from '@/lib/payments';
import type { Kid } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type SportChoice = 'swimming' | 'jiujitsu' | 'both';
const GROUP_A: Weekday[] = ['sun', 'tue', 'thu'];
const GROUP_B: Weekday[] = ['sat', 'mon', 'wed'];
const DURATIONS: Duration[] = ['1w', '2w', '4w', '3m', '6m', '12m'];

export default function RegisterScreen() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();

  const [kids, setKids] = useState<Kid[]>([]);
  const [registeredKidIds, setRegisteredKidIds] = useState<string[]>([]);
  const [kidId, setKidId] = useState<string | null>(null);
  const [sport, setSport] = useState<SportChoice>('swimming');
  const [swimDays, setSwimDays] = useState<Weekday[]>([]);
  const [bjjDays, setBjjDays] = useState<Weekday[]>([]);
  const [time, setTime] = useState<'16:00' | '17:00'>('16:00');
  const [duration, setDuration] = useState<Duration>('4w');
  const [pickedStart, setPickedStart] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [payWith, setPayWith] = useState<'desk' | 'online'>('desk');

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      (async () => {
        const { data: k } = await supabase.from('kids').select('*').eq('parent_id', profile.id).order('created_at');
        const list = (k as Kid[]) ?? [];
        setKids(list);
        setKidId((cur) => cur ?? list[0]?.id ?? null);
        const { data: s } = await supabase
          .from('subscriptions')
          .select('kid_id')
          .in('kid_id', list.map((x) => x.id))
          .in('status', ['active', 'pending_payment']);
        setRegisteredKidIds([...new Set((s ?? []).map((x: { kid_id: string }) => x.kid_id))]);
      })();
    }, [profile]),
  );

  const swim = sport === 'swimming' || sport === 'both' ? swimDays : [];
  const bjj = sport === 'jiujitsu' || sport === 'both' ? bjjDays : [];

  // start dates: the chosen class days over the next 2 weeks; default = the first one
  const startDates = startOptions([...new Set([...swim, ...bjj])], time, new Date());
  const startIso = pickedStart && startDates.includes(pickedStart) ? pickedStart : (startDates[0] ?? null);

  // family size for the discount: kids already registered + this one
  const familyKidCount = useMemo(() => new Set([...registeredKidIds, ...(kidId ? [kidId] : [])]).size, [registeredKidIds, kidId]);
  const price = priceSubscription({ member: 'kid', swimDays: swim, bjjDays: bjj, duration, familyKidCount });
  const picked = swim.length + bjj.length;

  const recommended = swimDays.some((d) => GROUP_B.includes(d)) && !swimDays.some((d) => GROUP_A.includes(d)) ? GROUP_B : GROUP_A;
  const toggle = (set: (fn: (cur: Weekday[]) => Weekday[]) => void) => (d: Weekday) =>
    set((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-KW' : 'en-GB', { day: 'numeric', month: 'short' });
  const sportLabel = t(`sport.${sport}` as StringKey);
  const lengthLabel = t(`dur.${duration}` as StringKey);

  const submit = async () => {
    setError('');
    if (!kidId) return setError(t('reg.noKids'));
    if (!price.ok) return setError(t(`reg.err.${price.error}` as StringKey));
    if (!startIso) return setError(t('reg.pickDaysFirst'));
    setBusy(true);
    const [y, m, d] = startIso.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);
    const endDate = addDays(startDate, DURATION_WEEKS[duration] * 7);
    const { data: created, error: err } = await supabase.from('subscriptions').insert({
      kid_id: kidId,
      swim_days: swim,
      bjj_days: bjj,
      start_time: time,
      weeks: DURATION_WEEKS[duration],
      start_date: isoDate(startDate),
      end_date: isoDate(endDate),
      sessions_total: price.sessions,
      base_price: price.base,
      discount_pct: price.totalPct,
      total: price.total,
      status: 'pending_payment',
    }).select('id').single();
    if (err || !created) {
      setBusy(false);
      return setError(t('err.generic'));
    }
    if (payWith === 'online') {
      const r = await startOnlinePayment(created.id, lang ?? 'en');
      setBusy(false);
      // website: already on its way to UPayments. Phone: the payment browser closed, so show the outcome.
      if (r.kind === 'returned') router.replace({ pathname: '/payment-result', params: { sub: created.id } });
      if (r.kind === 'error') {
        // the registration is saved; the parent can pay from home or at reception
        setError(t(`pay.err.${r.error}` as StringKey));
        setDone(true);
      }
      return;
    }
    setBusy(false);
    setDone(true);
  };

  if (done) {
    return (
      <Screen edges={['top']}>
        <HomeHeader />
        <View style={{ padding: 20, gap: 16 }}>
          <View style={{ backgroundColor: p.tile, padding: 16, borderRadius: 4 }}>
            <T w="semibold" size={17}>
              {t('reg.done')}
            </T>
          </View>
          <ErrorText>{error}</ErrorText>
          <Button
            title={t('tab.home')}
            onPress={() => {
              setDone(false);
              setError('');
              setSwimDays([]);
              setBjjDays([]);
              router.replace('/parent');
            }}
          />
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40, gap: 22 }}>
        <T w="semibold" size={24}>
          {t('reg.title')}
        </T>

        <Section title={t('reg.who')}>
          {kids.length === 0 ? (
            <View style={{ gap: 10 }}>
              <T color={p.inkSoft}>{t('reg.noKids')}</T>
              <Button variant="ghost" title={`+  ${t('kids.add')}`} onPress={() => router.push('/add-kid')} />
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Segmented options={kids.map((k) => ({ value: k.id, label: k.full_name }))} value={kidId} onChange={setKidId} />
            </View>
          )}
        </Section>

        <Section title={t('reg.sport')}>
          <Segmented
            options={(['swimming', 'jiujitsu', 'both'] as const).map((s) => ({ value: s, label: t(`sport.${s}`) }))}
            value={sport}
            onChange={setSport}
          />
        </Section>

        {sport !== 'jiujitsu' ? (
          <Section title={t('reg.swimDays')} accent={p.swim}>
            <DayPicker days={WEEKDAYS} selected={swimDays} onToggle={toggle(setSwimDays)} recommended={recommended} accent={p.swim} labelFor={(d) => t(`day.${d}`)} />
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.swim, marginTop: 6 }} />
              <T size={12} color={p.inkSoft} style={{ flex: 1, lineHeight: 17 }}>
                {t('reg.daysHint')}
              </T>
            </View>
          </Section>
        ) : null}

        {sport !== 'swimming' ? (
          <Section title={t('reg.bjjDays')} accent={p.bjj}>
            <DayPicker days={WEEKDAYS} selected={bjjDays} onToggle={toggle(setBjjDays)} accent={p.bjj} labelFor={(d) => t(`day.${d}`)} />
          </Section>
        ) : null}

        <Section title={t('reg.time')}>
          <Segmented options={[{ value: '16:00', label: t('reg.4pm') }, { value: '17:00', label: t('reg.5pm') }]} value={time} onChange={setTime} />
        </Section>

        <Section title={t('reg.length')}>
          <View style={{ gap: 8 }}>
            <Segmented options={DURATIONS.slice(0, 3).map((d) => ({ value: d, label: t(`dur.${d}`) }))} value={duration} onChange={setDuration} />
            <Segmented options={DURATIONS.slice(3).map((d) => ({ value: d, label: t(`dur.${d}`) }))} value={duration} onChange={setDuration} />
          </View>
        </Section>

        <Section title={t('reg.startTitle')}>
          {startDates.length > 0 ? (
            <DateStrip dates={startDates} value={startIso} onChange={setPickedStart} />
          ) : (
            <T size={13} color={p.inkSoft}>
              {t('reg.pickDaysFirst')}
            </T>
          )}
        </Section>

        {/* price summary */}
        <View style={{ borderTopWidth: 2, borderTopColor: p.ink, paddingTop: 12, gap: 6 }}>
          {price.ok ? (
            <>
              <Row left={t('reg.summary', { sport: sportLabel, days: price.daysPerWeek, length: lengthLabel })} right={formatKD(price.base, lang ?? 'en')} />
              <T size={12} color={p.inkSoft}>
                {t('reg.sessions', { n: price.sessions })}
                {startIso ? ` · ${t('reg.dates', { start: fmt(startIso), end: fmt(isoDate(addDays(new Date(startIso + 'T00:00:00'), price.weeks * 7))) })}` : ''}
              </T>
              {price.familyPct > 0 ? (
                <Row left={t('reg.familyDisc', { n: familyKidCount, pct: price.familyPct })} right={`−${formatKD((price.base * price.familyPct) / 100, lang ?? 'en')}`} color={p.swim} />
              ) : null}
              {price.monthsPct > 0 ? (
                <Row left={t('reg.monthsDisc', { length: lengthLabel, pct: price.monthsPct })} right={`−${formatKD((price.base * price.monthsPct) / 100, lang ?? 'en')}`} color={p.swim} />
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: p.line, paddingTop: 8, marginTop: 4 }}>
                <T w="cond" size={30}>
                  {t('reg.total')}
                </T>
                <T w="cond" size={30}>
                  {formatKD(price.total, lang ?? 'en')}
                </T>
              </View>
            </>
          ) : picked > 0 ? (
            <T color={p.danger} w="semibold">
              {t(`reg.err.${price.error}` as StringKey)}
            </T>
          ) : (
            <T color={p.inkSoft}>{t('reg.err.too_few_days')}</T>
          )}
        </View>

        <Section title={t('reg.payHow')}>
          <Segmented
            options={[
              { value: 'desk', label: t('reg.payDesk') },
              { value: 'online', label: t('reg.payOnline') },
            ]}
            value={payWith}
            onChange={setPayWith}
          />
        </Section>

        <ErrorText>{error}</ErrorText>
        <Button title={t('reg.submit')} onPress={submit} loading={busy} disabled={!price.ok || !kidId || !startIso} />
      </ScrollView>
    </Screen>
  );
}

function Section({ title, children, accent }: { title: string; children: ReactNode; accent?: string }) {
  return (
    <View style={{ gap: 10 }}>
      <Label color={accent}>{title}</Label>
      {children}
    </View>
  );
}

function Row({ left, right, color }: { left: string; right: string; color?: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <T size={14} color={color} style={{ flex: 1 }}>
        {left}
      </T>
      <T w="semibold" size={14} color={color}>
        {right}
      </T>
    </View>
  );
}
