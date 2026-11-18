import { addDays, isoDate } from '@lg/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { DateStrip } from '@/components/date-strip';
import { Segmented } from '@/components/pickers';
import { Button, Label, Screen, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type Sub = {
  id: string;
  kind: 'classes' | 'open_pool';
  status: string;
  start_date: string;
  end_date: string;
  sessions_total: number;
  sessions_used: number;
  pause_start: string | null;
  pause_end: string | null;
  kids: { full_name: string } | null;
};
type Req = { id: string; kind: 'pause' | 'injury_pause' | 'switch' | 'cancel'; status: 'pending' | 'approved' | 'rejected'; pause_start: string | null; pause_days: number | null; note: string | null; reply: string | null; created_at: string };
type Action = 'pause' | 'injury_pause' | 'switch' | 'cancel';

const ERRORS = ['already_requested', 'already_paused', 'pause_used', 'class_overlap', 'note_required'];

/** Guardian: pause a registration (up to 1 week, at once) or ask reception for a longer pause, a change, or to cancel. */
export default function ManageRegistration() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t, lang, f, isRTL } = useI18n();
  const p = usePalette();
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short' });

  const [sub, setSub] = useState<Sub | null>(null);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState<Action | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [days, setDays] = useState<string>('7');
  const [weeks, setWeeks] = useState<string>('2');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState('');

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      supabase.from('subscriptions').select('id, kind, status, start_date, end_date, sessions_total, sessions_used, pause_start, pause_end, kids(full_name)').eq('id', id).maybeSingle(),
      supabase.from('requests').select('id, kind, status, pause_start, pause_days, note, reply, created_at').eq('subscription_id', id).order('created_at', { ascending: false }),
    ]);
    setSub(s.data as Sub | null);
    setReqs((r.data ?? []) as Req[]);
    setLoaded(true);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (!loaded) {
    return (
      <Screen edges={['top']}>
        <ActivityIndicator color={p.ink} style={{ marginTop: 40 }} />
      </Screen>
    );
  }
  if (!sub) {
    return (
      <Screen edges={['top']} style={{ padding: 20, gap: 12 }}>
        <T>{t('err.generic')}</T>
        <Button variant="link" title={isRTL ? '→' : '←'} onPress={back} />
      </Screen>
    );
  }

  const today = isoDate(new Date());
  const isClasses = sub.kind === 'classes';
  const active = sub.status === 'active';
  const pausedNow = !!sub.pause_end && sub.pause_end >= today;
  const pauseUsed = reqs.some((r) => r.kind === 'pause');
  const pending = (k: Action) => reqs.some((r) => r.kind === k && r.status === 'pending');

  // dates a pause can start: tomorrow (or the first day) up to 2 weeks ahead, not after the end, no Fridays
  const startDates = (fromToday: boolean) => {
    const soonest = addDays(new Date(), fromToday ? 0 : 1);
    const first = isoDate(soonest) < sub.start_date ? new Date(sub.start_date + 'T00:00:00') : soonest;
    const out: string[] = [];
    for (let i = 0; i < 21 && out.length < 14; i++) {
      const d = addDays(first, i);
      const iso = isoDate(d);
      if (iso > sub.end_date) break;
      if (d.getDay() !== 5) out.push(iso);
    }
    return out;
  };

  const choose = (a: Action) => {
    setOpen(open === a ? null : a);
    setStart(null);
    setNote('');
    setError('');
    setDone('');
  };

  const fail = (message?: string) => {
    const code = ERRORS.find((c) => message?.includes(c));
    setError(code ? t(`manage.err.${code}` as StringKey) : t('err.generic'));
  };

  const pauseNow = async () => {
    if (!start) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('pause_registration', { p_sub: sub.id, p_start: start, p_days: Number(days) });
    setBusy(false);
    if (err) return fail(err.message);
    const r = data as { pause_end: string; end_date: string };
    setOpen(null);
    setDone(t('manage.pauseDone', { date: fmt(r.pause_end), end: fmt(r.end_date) }));
    load();
  };

  const send = async (kind: Exclude<Action, 'pause'>) => {
    setBusy(true);
    setError('');
    const { error: err } = await supabase.rpc('send_request', {
      p_sub: sub.id,
      p_kind: kind,
      p_note: note,
      p_start: kind === 'injury_pause' ? start : null,
      p_days: kind === 'injury_pause' ? Number(weeks) * 7 : null,
    });
    setBusy(false);
    if (err) return fail(err.message);
    setOpen(null);
    setDone(t('manage.sent'));
    load();
  };

  const withdraw = async (reqId: string) => {
    await supabase.rpc('withdraw_request', { p_id: reqId });
    load();
  };

  const noteBox = (label: StringKey) => (
    <View style={{ gap: 6 }}>
      <T w="semibold" size={14}>
        {t(label)}
      </T>
      <TextInput
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={1000}
        accessibilityLabel={t(label)}
        style={{ minHeight: 84, borderWidth: 1.5, borderColor: p.ink, borderRadius: 6, padding: 12, color: p.ink, backgroundColor: p.surface, fontFamily: f.regular, fontSize: 15, textAlign: isRTL ? 'right' : 'left', textAlignVertical: 'top' }}
      />
    </View>
  );

  const options: { key: Action; title: StringKey; sub: StringKey; show: boolean; blocked?: string }[] = [
    { key: 'pause', title: 'manage.pause', sub: 'manage.pauseSub', show: isClasses && active, blocked: pauseUsed ? t('manage.pauseUsed') : pausedNow ? t('manage.err.already_paused') : undefined },
    { key: 'injury_pause', title: 'manage.injury', sub: 'manage.injurySub', show: active, blocked: pending('injury_pause') ? t('manage.err.already_requested') : pausedNow ? t('manage.err.already_paused') : undefined },
    { key: 'switch', title: 'manage.switch', sub: 'manage.switchSub', show: isClasses && active, blocked: pending('switch') ? t('manage.err.already_requested') : undefined },
    { key: 'cancel', title: 'manage.cancel', sub: 'manage.cancelSub', show: active || sub.status === 'pending_payment', blocked: pending('cancel') ? t('manage.err.already_requested') : undefined },
  ];

  return (
    <Screen edges={['top', 'bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: p.ink }}>
        <Button variant="link" title={isRTL ? '→' : '←'} onPress={back} />
        <T w="semibold" size={18} style={{ flex: 1 }}>
          {t('manage.title')}
        </T>
      </View>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <View style={{ gap: 4 }}>
          <T w="semibold" size={22}>
            {sub.kids?.full_name ?? ''}
          </T>
          <T size={13} color={p.inkSoft}>
            {t('manage.ends', { date: fmt(sub.end_date), n: sub.sessions_total - sub.sessions_used })}
          </T>
          {pausedNow && sub.pause_start ? (
            <T size={13} w="semibold" color={p.bjj}>
              {t('manage.paused', { start: fmt(sub.pause_start), end: fmt(sub.pause_end!) })}
            </T>
          ) : null}
        </View>

        {done ? (
          <View style={{ backgroundColor: p.tile, padding: 14, borderRadius: 6 }}>
            <T size={14} w="semibold">
              {done}
            </T>
          </View>
        ) : null}

        <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
          {options
            .filter((o) => o.show)
            .map((o) => (
              <View key={o.key} style={{ borderBottomWidth: 1, borderBottomColor: p.line, paddingVertical: 14, gap: 12 }}>
                <Pressable
                  onPress={() => !o.blocked && choose(o.key)}
                  disabled={!!o.blocked}
                  accessibilityRole="button"
                  accessibilityState={{ expanded: open === o.key, disabled: !!o.blocked }}
                  style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ flex: 1, gap: 3 }}>
                    <T w="semibold" size={16} color={o.blocked ? p.inkSoft : p.ink}>
                      {t(o.title)}
                    </T>
                    <T size={13} color={p.inkSoft}>
                      {o.blocked ?? t(o.sub)}
                    </T>
                  </View>
                  {!o.blocked ? (
                    <T w="semibold" size={20}>
                      {open === o.key ? '−' : '+'}
                    </T>
                  ) : null}
                </Pressable>

                {open === 'pause' && o.key === 'pause' ? (
                  <View style={{ gap: 10 }}>
                    <Label>{t('manage.pauseFrom')}</Label>
                    <DateStrip dates={startDates(false)} value={start} onChange={setStart} />
                    <Label>{t('manage.pauseDays')}</Label>
                    <Segmented options={['1', '2', '3', '4', '5', '6', '7'].map((v) => ({ value: v, label: v }))} value={days} onChange={setDays} />
                    <Button title={t('manage.pauseNow')} onPress={pauseNow} loading={busy} disabled={!start} />
                  </View>
                ) : null}

                {open === 'injury_pause' && o.key === 'injury_pause' ? (
                  <View style={{ gap: 10 }}>
                    <Label>{t('manage.injuryFrom')}</Label>
                    <DateStrip dates={startDates(true)} value={start} onChange={setStart} />
                    <Label>{t('manage.injuryWeeks')}</Label>
                    <Segmented options={['1', '2', '3', '4', '6', '8'].map((v) => ({ value: v, label: t('manage.weeks', { n: v }) }))} value={weeks} onChange={setWeeks} />
                    {noteBox('manage.injuryNote')}
                    <Button title={t('manage.send')} onPress={() => send('injury_pause')} loading={busy} disabled={!start || !note.trim()} />
                  </View>
                ) : null}

                {open === 'switch' && o.key === 'switch' ? (
                  <View style={{ gap: 10 }}>
                    {noteBox('manage.switchNote')}
                    <Button title={t('manage.send')} onPress={() => send('switch')} loading={busy} disabled={!note.trim()} />
                  </View>
                ) : null}

                {open === 'cancel' && o.key === 'cancel' ? (
                  <View style={{ gap: 10 }}>
                    {noteBox('manage.reasonOptional')}
                    <Button title={t('manage.send')} onPress={() => send('cancel')} loading={busy} />
                  </View>
                ) : null}

                {open === o.key && error ? (
                  <T size={13} color={p.danger} w="semibold">
                    {error}
                  </T>
                ) : null}
              </View>
            ))}
        </View>

        {reqs.length ? (
          <View style={{ gap: 8 }}>
            <Label>{t('manage.requests')}</Label>
            {reqs.map((r) => (
              <View key={r.id} style={{ backgroundColor: p.tile, borderRadius: 6, padding: 12, gap: 4 }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
                  <T w="semibold" size={14} style={{ flex: 1 }}>
                    {t(`manage.kind.${r.kind}` as StringKey)}
                    {r.pause_days && r.pause_start ? ` · ${fmt(r.pause_start)} · ${t('manage.days', { n: r.pause_days })}` : ''}
                  </T>
                  <T size={12} w="semibold" color={r.status === 'approved' ? p.swim : r.status === 'rejected' ? p.danger : p.inkSoft}>
                    {t(`manage.status.${r.status}` as StringKey)}
                  </T>
                </View>
                {r.note ? (
                  <T size={13} color={p.inkSoft}>
                    {r.note}
                  </T>
                ) : null}
                {r.reply ? <T size={13}>{r.reply}</T> : null}
                {r.status === 'pending' ? <Button variant="link" title={t('manage.withdraw')} onPress={() => withdraw(r.id)} style={{ alignSelf: 'flex-start' }} /> : null}
              </View>
            ))}
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}
