import { addDays, ageOn, isoDate } from '@lg/shared';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, TextInput, View } from 'react-native';

import { MemberAvatar } from '@/components/avatar';
import { BeltBar } from '@/components/belt';
import { DateStrip } from '@/components/date-strip';
import { AlertIcon } from '@/components/tab-icons';
import { Button, ErrorText, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { nextBelt } from '@/lib/coach';
import { beltName, genderKey, type Kid, type Stripe } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type Note = { id: string; body: string; created_at: string; author_id: string | null };

/** Kid profile for coaches and staff: health first, then progress, then notes. */
export default function KidProfile() {
  const { id, add } = useLocalSearchParams<{ id: string; add?: string }>();
  const { t, lang, f, isRTL } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';
  const canEdit = profile?.role !== 'parent';

  const [kid, setKid] = useState<Kid | null>(null);
  const [stripes, setStripes] = useState<Stripe[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [sheet, setSheet] = useState<'stripe' | null>(add === 'stripe' ? 'stripe' : null);
  const [stripeDate, setStripeDate] = useState(isoDate(new Date()));
  const [level, setLevel] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [guardian, setGuardian] = useState<{ full_name: string; relationship: string | null } | null>(null);

  const load = useCallback(async () => {
    const [k, s, n, c] = await Promise.all([
      supabase.from('kids').select('*').eq('id', id).maybeSingle(),
      supabase.from('stripes').select('*').eq('kid_id', id).order('awarded_on', { ascending: false }),
      supabase.from('coach_notes').select('id, body, created_at, author_id').eq('kid_id', id).order('created_at', { ascending: false }),
      supabase.rpc('coach_directory'),
    ]);
    const kidRow = k.data as Kid | null;
    setKid(kidRow);
    if (kidRow && !kidRow.is_self) {
      const { data: g } = await supabase.from('profiles').select('full_name, relationship').eq('id', kidRow.parent_id).maybeSingle();
      setGuardian(g ?? null);
    }
    setLevel(kidRow?.swim_level ?? null);
    setStripes((s.data ?? []) as Stripe[]);
    setNotes((n.data ?? []) as Note[]);
    const map: Record<string, string> = {};
    for (const x of (c.data ?? []) as { id: string; full_name: string }[]) map[x.id] = x.full_name;
    setNames(map);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!kid) {
    return (
      <Screen>
        <ActivityIndicator color={p.ink} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
  const onBelt = stripes.filter((s) => s.belt === kid.belt);
  const promoteTo = kid.belt ? nextBelt(kid.belt) : null;
  // stripe dates: today and the past 2 weeks (Fridays skipped)
  const recentDates = Array.from({ length: 15 }, (_, i) => addDays(new Date(), -i)).filter((d) => d.getDay() !== 5).map(isoDate);

  const run = async (key: string, fn: () => PromiseLike<{ error: unknown }>) => {
    setBusy(key);
    setError('');
    const { error: err } = await fn();
    setBusy(null);
    if (err) {
      setError(t('err.generic'));
      return false;
    }
    await load();
    return true;
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: sheet ? 320 : 40 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Button variant="link" title={`${isRTL ? '›' : '‹'} ${t('common.back')}`} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
          <T size={12} color={p.inkSoft}>
            {t('kids.member', { n: kid.member_no })}
          </T>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <MemberAvatar kid={kid} size={72} />
        <View style={{ flex: 1 }}>
          <T w="semibold" size={28}>
            {kid.full_name}
          </T>
          <T color={p.inkSoft}>
            {t('kids.years', { n: ageOn(kid.birth_date) })}
            {genderKey(kid) ? ` · ${t(genderKey(kid)!)}` : ''}
          </T>
          {canEdit && kid.is_self ? <T color={p.inkSoft}>{t('guardian.adult')}</T> : null}
          {canEdit && !kid.is_self && guardian ? (
            <T color={p.inkSoft}>
              {guardian.relationship
                ? t('guardian.line', { name: guardian.full_name, rel: t(`rel.${guardian.relationship}` as StringKey) })
                : guardian.full_name}
            </T>
          ) : null}
        </View>
        </View>

        {profile?.role === 'coach' ? (
          <Button
            variant="ghost"
            title={t('chat.messageGuardian')}
            onPress={async () => {
              const { data } = await supabase.rpc('open_conversation', { p_kid: kid.id });
              if (data) router.push({ pathname: '/chat/[id]', params: { id: String(data) } });
            }}
          />
        ) : null}

        {/* health first */}
        {kid.health_conditions.length > 0 || kid.health_other ? (
          <View style={{ backgroundColor: p.dangerBg, borderRadius: 4, padding: 12, gap: 4 }}>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <AlertIcon color={p.danger} size={18} />
              <T w="semibold" color={p.danger} style={{ flex: 1 }}>
                {kid.health_conditions.map((h) => t(`h.${h}` as StringKey)).join(' · ')}
              </T>
            </View>
            {kid.health_other ? <T size={14} color={p.danger}>{kid.health_other}</T> : null}
            {kid.emergency_phone ? <T size={13} color={p.danger}>{t('kid.emergency.call', { phone: kid.emergency_phone })}</T> : null}
          </View>
        ) : (
          <T size={13} color={p.inkSoft}>
            {t('kid.health.none')}
            {kid.emergency_phone ? ` · ${t('kid.emergency.call', { phone: kid.emergency_phone })}` : ''}
          </T>
        )}

        {/* jiu-jitsu belt */}
        {kid.belt ? (
          <View style={{ gap: 8 }}>
            <Label>{t('kid.belt')}</Label>
            <BeltBar belt={kid.belt} stripes={onBelt.length} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <T w="semibold">
                {beltName(kid.belt, lang ?? 'en')} · {onBelt.length}/4
              </T>
              {kid.belt_since ? <T size={13} color={p.inkSoft}>{fmt(kid.belt_since)}</T> : null}
            </View>
            {onBelt.map((s, i) => (
              <View key={s.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: p.line }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ width: 5, height: 16, backgroundColor: '#111', borderWidth: 1, borderColor: '#fff' }} />
                  <T size={14}>{t('kid.stripeN', { n: onBelt.length - i })}</T>
                </View>
                <T size={13} color={p.inkSoft}>
                  {fmt(s.awarded_on)}
                  {s.coach_id && names[s.coach_id] ? ` · ${names[s.coach_id]}` : ''}
                </T>
              </View>
            ))}
            {canEdit ? (
              onBelt.length < 4 ? (
                <Button variant="ghost" title={t('kid.addStripe', { n: onBelt.length + 1 })} onPress={() => setSheet('stripe')} />
              ) : promoteTo ? (
                <View style={{ gap: 8 }}>
                  <T size={13} color={p.bjj} w="semibold">
                    {t('kid.full')}
                  </T>
                  <Button
                    title={t('kid.promote', { belt: beltName(promoteTo, lang ?? 'en') })}
                    loading={busy === 'belt'}
                    onPress={() => run('belt', () => supabase.rpc('set_level', { p_kid: kid.id, p_swim_level: null, p_belt: promoteTo }))}
                  />
                </View>
              ) : null
            ) : null}
          </View>
        ) : null}

        {/* new jiu-jitsu kid: give the first belt */}
        {!kid.belt && canEdit && profile?.sport !== 'swimming' ? (
          <View style={{ gap: 8 }}>
            <Label color={p.bjj}>{t('kid.belt')}</Label>
            <Button
              variant="ghost"
              title={t('kid.firstBelt')}
              loading={busy === 'belt'}
              onPress={() => run('belt', () => supabase.rpc('set_level', { p_kid: kid.id, p_swim_level: null, p_belt: 'white' }))}
            />
          </View>
        ) : null}

        {/* swimming level */}
        {kid.swim_level !== null || (canEdit && profile?.sport === 'swimming') ? (
          <View style={{ gap: 8 }}>
            <Label color={p.swim}>{t('kid.swimLevel')}</Label>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
              {canEdit ? <Stepper label="−" onPress={() => setLevel((l) => Math.max(1, (l ?? 1) - 1))} /> : null}
              <T w="cond" size={44} color={p.swim} style={{ minWidth: 40, textAlign: 'center' }}>
                {level ?? '–'}
              </T>
              {canEdit ? <Stepper label="+" onPress={() => setLevel((l) => Math.min(10, (l ?? 0) + 1))} /> : null}
              {kid.swim_level_since ? <T size={13} color={p.inkSoft}>{t('coach.atLevel', { date: fmt(kid.swim_level_since) })}</T> : null}
            </View>
            {canEdit && level !== kid.swim_level && level ? (
              <Button title={t('kid.saveLevel')} loading={busy === 'level'} onPress={() => run('level', () => supabase.rpc('set_level', { p_kid: kid.id, p_swim_level: level, p_belt: null }))} />
            ) : null}
          </View>
        ) : null}

        {/* notes */}
        <View style={{ gap: 10, borderTopWidth: 2, borderTopColor: p.ink, paddingTop: 12 }}>
          <Label>{t('kid.notes')}</Label>
          {canEdit ? (
            <View style={{ gap: 8 }}>
              <TextInput
                value={note}
                onChangeText={setNote}
                multiline
                placeholder={t('kid.notePlaceholder')}
                placeholderTextColor={p.inkSoft}
                style={{ borderWidth: 1.5, borderColor: p.ink, borderRadius: 6, padding: 12, minHeight: 80, color: p.ink, fontFamily: f.regular, fontSize: 15, textAlign: isRTL ? 'right' : 'left', textAlignVertical: 'top', backgroundColor: p.surface }}
              />
              <Button
                variant="ghost"
                title={t('kid.addNote')}
                disabled={!note.trim()}
                loading={busy === 'note'}
                onPress={async () => {
                  if (await run('note', () => supabase.rpc('add_coach_note', { p_kid: kid.id, p_body: note.trim() }))) setNote('');
                }}
              />
            </View>
          ) : null}
          {notes.length === 0 ? <T size={13} color={p.inkSoft}>{t('kid.noNotes')}</T> : null}
          {notes.map((n) => (
            <View key={n.id} style={{ paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: p.line, gap: 4 }}>
              <T>{n.body}</T>
              <T size={12} color={p.inkSoft}>
                {fmt(n.created_at.slice(0, 10))}
                {n.author_id && names[n.author_id] ? ` · ${names[n.author_id]}` : ''}
              </T>
            </View>
          ))}
        </View>
        <ErrorText>{error}</ErrorText>
      </ScrollView>

      {/* add-stripe sheet */}
      {sheet === 'stripe' && kid.belt && onBelt.length < 4 ? (
        <View style={{ position: 'absolute', start: 0, end: 0, bottom: 0, backgroundColor: p.surface, borderTopStartRadius: 18, borderTopEndRadius: 18, padding: 20, paddingBottom: 32, gap: 14, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 18, shadowOffset: { width: 0, height: -6 }, elevation: 12, borderTopWidth: 1, borderColor: p.line }}>
          <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: p.line, alignSelf: 'center' }} />
          <T w="semibold" size={20}>
            {t('kid.addStripe', { n: onBelt.length + 1 })}
          </T>
          <BeltBar belt={kid.belt} stripes={onBelt.length + 1} height={20} />
          <Label>{t('kid.stripeDate')}</Label>
          <DateStrip dates={recentDates} value={stripeDate} onChange={setStripeDate} />
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button variant="ghost" title={t('common.cancel')} onPress={() => setSheet(null)} style={{ flex: 1 }} />
            <Button
              title={t('kid.stripeSave')}
              loading={busy === 'stripe'}
              style={{ flex: 1.4 }}
              onPress={async () => {
                if (await run('stripe', () => supabase.rpc('add_stripe', { p_kid: kid.id, p_date: stripeDate }))) setSheet(null);
              }}
            />
          </View>
          <T size={12} color={p.inkSoft} style={{ textAlign: 'center' }}>
            {t('kid.parentNotified')}
          </T>
        </View>
      ) : null}
    </Screen>
  );
}

function Stepper({ label, onPress }: { label: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label === '+' ? 'increase' : 'decrease'} style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: p.ink, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? p.tile : p.surface })}>
      <T w="semibold" size={22} style={{ textAlign: 'center' }}>
        {label}
      </T>
    </Pressable>
  );
}
