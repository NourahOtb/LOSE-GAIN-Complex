import { addDays, ageOn, DEFAULT_PRICING, DURATION_WEEKS, formatKD, isoDate, priceOpenPool, priceSubscription, startOptions, WEEKDAYS, weekdayOf, type Duration, type Weekday } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import { HomeHeader } from '@/components/home-header';
import { DayPicker, Segmented } from '@/components/pickers';
import { Button, ErrorText, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { startOnlinePayment } from '@/lib/payments';
import { clockTime, memberType, type Kid } from '@/lib/data';
import { CLASS_COLS, type ClassRow } from '@/lib/family';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type SportChoice = 'swimming' | 'jiujitsu' | 'both' | 'pool';
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
  const [kidTime, setTime] = useState<'16:00' | '17:00'>('16:00');
  const [kidDuration, setDuration] = useState<Duration>('4w');
  const [pickedStart, setPickedStart] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [payWith, setPayWith] = useState<'desk' | 'online'>('desk');
  const [classes, setClasses] = useState<ClassRow[]>([]);
  const [adultTime, setAdultTime] = useState<'18:00' | '19:30'>('18:00');
  const [genderBusy, setGenderBusy] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (!profile) return;
      (async () => {
        const { data: c } = await supabase.from('classes').select(CLASS_COLS).eq('is_active', true);
        setClasses((c ?? []) as ClassRow[]);
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

  // who is joining decides the choices:
  //   kid (5–10): swimming / jiu-jitsu (Warriors, time by day) / both
  //   titan (11–15): swimming (kids' classes) or jiu-jitsu with the adults (6 PM, 4 weeks, men's prices)
  //   adult (16+ or "me"): men's swimming (men), jiu-jitsu (6 PM, or 7:30 PM women's), open pool
  const single = profile?.account_type === 'single';
  const isAdult = (k: Kid) => k.is_self || ageOn(k.birth_date) >= 16;
  const member = kids.find((k) => k.id === kidId);
  const mt = member ? memberType(member) : 'kid';
  const gender = member?.gender ?? null;
  const needGender = mt === 'adult' && !gender;
  const choices: SportChoice[] =
    mt === 'kid' ? ['swimming', 'jiujitsu', 'both'] : mt === 'titan' ? ['swimming', 'jiujitsu'] : gender === 'female' ? ['jiujitsu', 'pool'] : ['swimming', 'jiujitsu', 'pool'];
  const sportNow: SportChoice = choices.includes(sport) ? sport : choices[0];
  const mode =
    sportNow === 'pool' ? 'pool'
    : mt === 'adult' ? (sportNow === 'swimming' ? 'adultSwim' : 'adultBjj')
    : mt === 'titan' && sportNow === 'jiujitsu' ? 'titanBjj'
    : 'kid';
  const adultDays = DEFAULT_PRICING.adultDays;
  const bjjAdultDays = DEFAULT_PRICING.adultBjjDays;
  const womenDays: Weekday[] = ['sun', 'tue', 'thu'];
  const bjjChoiceDays: readonly Weekday[] =
    mode === 'kid' ? WEEKDAYS : mode === 'adultBjj' && gender === 'female' && adultTime === '19:30' ? womenDays : bjjAdultDays;

  const swim = mode === 'adultSwim' ? swimDays.filter((d) => adultDays.includes(d)) : mode === 'kid' && (sportNow === 'swimming' || sportNow === 'both') ? swimDays : [];
  const bjj = mode === 'pool' || mode === 'adultSwim' ? [] : mode === 'kid' ? (sportNow === 'jiujitsu' || sportNow === 'both' ? bjjDays : []) : bjjDays.filter((d) => bjjChoiceDays.includes(d));
  const swimTime = mode === 'adultSwim' ? '16:00' : kidTime;

  // jiu-jitsu time per day: kids from their Warriors class (by age and day); Titans and adults at the chosen time
  const age = member ? ageOn(member.birth_date) : 0;
  const bjjTimeFor = (day: string): string => {
    if (mode !== 'kid') return mode === 'adultBjj' && gender === 'female' ? adultTime : '18:00';
    const c = classes.find(
      (x) => x.sport === 'jiujitsu' && x.weekday === day && !x.is_free && x.audience === 'all' && x.age_group === 'kids' && age >= (x.min_age ?? 0) && age <= (x.max_age ?? 200),
    );
    return c?.start_time.slice(0, 5) ?? kidTime;
  };
  const bjjTimes = Object.fromEntries(bjj.map((d) => [d, bjjTimeFor(d)]));
  const time = swim.length ? swimTime : (bjj[0] ? bjjTimeFor(bjj[0]) : swimTime);

  const durationChoices: Duration[] =
    mode === 'kid' ? DURATIONS : mode === 'adultBjj' ? ['1w', '2w', '4w'] : ['4w'];
  const duration: Duration = durationChoices.includes(kidDuration) ? kidDuration : '4w';

  // start dates: the chosen class days over the next 2 weeks (open pool: any day but Friday); default = the first one
  const poolDates = Array.from({ length: 15 }, (_, i) => addDays(new Date(), i)).filter((d) => d.getDay() !== 5).map(isoDate).slice(0, 14);
  const startDates =
    mode === 'pool'
      ? poolDates
      : startOptions([...new Set([...swim, ...bjj])], (day) => (bjj.includes(day as Weekday) && !swim.includes(day as Weekday) ? bjjTimeFor(day) : swimTime), new Date());
  const startIso = pickedStart && startDates.includes(pickedStart) ? pickedStart : (startDates[0] ?? null);

  // family size for the discount: kids already registered + this one
  // (the family discount counts kids only, not adult members)
  const familyKidCount = useMemo(() => {
    const kidIds = new Set(kids.filter((k) => !isAdult(k)).map((k) => k.id));
    return new Set([...registeredKidIds, ...(kidId ? [kidId] : [])].filter((id) => kidIds.has(id))).size;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [registeredKidIds, kidId, kids]);
  const price =
    mode === 'pool'
      ? priceOpenPool('adult', duration)
      : priceSubscription({
          member: mode === 'titanBjj' ? 'titan' : mt === 'adult' ? 'adult' : 'kid',
          gender: gender ?? undefined,
          swimDays: swim,
          bjjDays: bjj,
          duration,
          familyKidCount,
        });
  const picked = swim.length + bjj.length;

  const recommended = swimDays.some((d) => GROUP_B.includes(d)) && !swimDays.some((d) => GROUP_A.includes(d)) ? GROUP_B : GROUP_A;
  const toggle = (set: (fn: (cur: Weekday[]) => Weekday[]) => void) => (d: Weekday) =>
    set((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-KW' : 'en-GB', { day: 'numeric', month: 'short' });
  const sportLabel = t(`sport.${sportNow}` as StringKey);
  const timesList = bjj.length
    ? (['sat', 'sun', 'mon', 'tue', 'wed', 'thu'] as Weekday[]).filter((d) => bjj.includes(d)).map((d) => `${t(`day.${d}`)} ${clockTime(bjjTimeFor(d), lang ?? 'en')}`).join(' · ')
    : '';

  const setGender = async (g: 'male' | 'female') => {
    if (!member) return;
    setGenderBusy(true);
    const { error: err } = await supabase.from('kids').update({ gender: g }).eq('id', member.id);
    setGenderBusy(false);
    if (err) return setError(t('err.generic'));
    setKids((cur) => cur.map((k) => (k.id === member.id ? { ...k, gender: g } : k)));
  };
  const lengthLabel = t(`dur.${duration}` as StringKey);

  const submit = async () => {
    setError('');
    if (!kidId) return setError(single ? t('reg.noMe') : t('reg.noKids'));
    if (!price.ok) return setError(t(`reg.err.${price.error}` as StringKey));
    if (!startIso) return setError(t('reg.pickDaysFirst'));
    if (needGender) return setError(t('reg.genderFirst'));
    setBusy(true);
    const [y, m, d] = startIso.split('-').map(Number);
    const startDate = new Date(y, m - 1, d);
    const endDate = addDays(startDate, DURATION_WEEKS[duration] * 7);
    const { data: created, error: err } = await supabase.from('subscriptions').insert({
      kid_id: kidId,
      kind: mode === 'pool' ? 'open_pool' : 'classes',
      swim_days: swim,
      bjj_days: bjj,
      start_time: time,
      bjj_times: bjj.length ? bjjTimes : null,
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
              <T color={p.inkSoft}>{single ? t('reg.noMe') : t('reg.noKids')}</T>
              {single ? (
                <Button variant="ghost" title={t('me.complete')} onPress={() => router.push({ pathname: '/add-kid', params: { self: '1' } })} />
              ) : (
                <Button variant="ghost" title={`+  ${t('kids.add')}`} onPress={() => router.push('/add-kid')} />
              )}
            </View>
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Segmented options={kids.map((k) => ({ value: k.id, label: k.full_name }))} value={kidId} onChange={setKidId} />
            </View>
          )}
        </Section>

        {needGender ? (
          <Section title={t('me.gender')}>
            <T size={13} color={p.inkSoft}>
              {t('reg.genderFirst')}
            </T>
            <Segmented
              options={[
                { value: 'male', label: t('g.male'), disabled: genderBusy },
                { value: 'female', label: t('g.female'), disabled: genderBusy },
              ]}
              value={null}
              onChange={setGender}
            />
          </Section>
        ) : null}

        {needGender ? null : (
          <Section title={t('reg.sport')}>
            <Segmented options={choices.map((c) => ({ value: c, label: t(`sport.${c}` as StringKey) }))} value={sportNow} onChange={setSport} />
          </Section>
        )}

        {/* what this registration is, in one line */}
        {needGender ? null : mode === 'pool' ? (
          <Info text={t('reg.poolInfo')} />
        ) : mode === 'adultSwim' ? (
          <Info text={t('reg.adultInfo')} />
        ) : mode === 'titanBjj' ? (
          <Info text={t('reg.titanInfo')} />
        ) : mode === 'adultBjj' ? (
          <Info text={t('reg.adultBjjInfo')} />
        ) : null}

        {!needGender && (mode === 'adultSwim' || (mode === 'kid' && sportNow !== 'jiujitsu')) ? (
          <Section title={t('reg.swimDays')} accent={p.swim}>
            <DayPicker days={mode === 'adultSwim' ? adultDays : WEEKDAYS} selected={swim} onToggle={toggle(setSwimDays)} recommended={mode === 'adultSwim' ? [] : recommended} accent={p.swim} labelFor={(d) => t(`day.${d}`)} />
            {mode === 'adultSwim' ? null : (
              <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: p.swim, marginTop: 6 }} />
                <T size={12} color={p.inkSoft} style={{ flex: 1, lineHeight: 17 }}>
                  {t('reg.daysHint')}
                </T>
              </View>
            )}
          </Section>
        ) : null}

        {!needGender && mode === 'adultBjj' && gender === 'female' ? (
          <Section title={t('reg.womenWhich')}>
            <Segmented
              options={[
                { value: '18:00', label: t('reg.time6') },
                { value: '19:30', label: t('reg.time730') },
              ]}
              value={adultTime}
              onChange={setAdultTime}
            />
            {adultTime === '19:30' ? (
              <T size={12} color={p.inkSoft}>
                {t('reg.time730Hint')}
              </T>
            ) : null}
          </Section>
        ) : null}

        {!needGender && (mode === 'titanBjj' || mode === 'adultBjj' || (mode === 'kid' && sportNow !== 'swimming')) ? (
          <Section title={t('reg.bjjDays')} accent={p.bjj}>
            <DayPicker days={bjjChoiceDays} selected={bjj} onToggle={toggle(setBjjDays)} accent={p.bjj} labelFor={(d) => t(`day.${d}`)} />
            {timesList ? (
              <T size={12} color={p.inkSoft} style={{ marginTop: 6 }}>
                {t('reg.bjjTimes', { list: timesList })}
              </T>
            ) : null}
          </Section>
        ) : null}

        {!needGender && mode === 'kid' && sportNow !== 'jiujitsu' ? (
          <Section title={t('reg.time')}>
            <Segmented options={[{ value: '16:00', label: t('reg.4pm') }, { value: '17:00', label: t('reg.5pm') }]} value={kidTime} onChange={setTime} />
          </Section>
        ) : null}

        {!needGender && durationChoices.length > 1 ? (
          <Section title={t('reg.length')}>
            <View style={{ gap: 8 }}>
              <Segmented options={durationChoices.slice(0, 3).map((d) => ({ value: d, label: t(`dur.${d}`) }))} value={duration} onChange={setDuration} />
              {durationChoices.length > 3 ? (
                <Segmented options={durationChoices.slice(3).map((d) => ({ value: d, label: t(`dur.${d}`) }))} value={duration} onChange={setDuration} />
              ) : null}
            </View>
          </Section>
        ) : null}

        <Section title={mode === 'pool' ? t('reg.poolStart') : t('reg.startTitle')}>
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
              <Row left={mode === 'pool' ? `${sportLabel} · ${lengthLabel}` : t('reg.summary', { sport: sportLabel, days: price.daysPerWeek, length: lengthLabel })} right={formatKD(price.base, lang ?? 'en')} />
              <T size={12} color={p.inkSoft}>
                {mode === 'pool' ? '' : t('reg.sessions', { n: price.sessions })}
                {startIso ? `${mode === 'pool' ? '' : ' · '}${t('reg.dates', { start: fmt(startIso), end: fmt(isoDate(addDays(new Date(startIso + 'T00:00:00'), price.weeks * 7))) })}` : ''}
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
          ) : picked > 0 || mode === 'pool' ? (
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

function Info({ text }: { text: string }) {
  const p = usePalette();
  return (
    <View style={{ backgroundColor: p.tile, padding: 14, borderRadius: 4 }}>
      <T w="semibold" size={14} style={{ lineHeight: 20 }}>
        {text}
      </T>
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
