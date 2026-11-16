import { ageOn, daysUntil, formatKD, nextClass, weekMarks, type Mark, type Sport } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { BeltBar } from '@/components/belt';
import { HomeHeader } from '@/components/home-header';
import { PaceClock } from '@/components/pace-clock';
import { Button, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { findClass, loadFamily, type FamilyData } from '@/lib/family';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
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

  const load = useCallback(async () => {
    if (profile) setData(await loadFamily(profile.id));
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
  const alerts: { text: string; action?: () => void }[] = [];
  for (const lane of lanes) {
    for (const m of weekMarks(lane.sub, lane.sport, data.cancels, now)) {
      if (m.mark === 'cancelled') {
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
    const cls = kid ? findClass(data.classes, next.sport, wd, next.sub.start_time, ageOn(kid.birth_date)) : undefined;
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
          ) : (
            <View style={{ flex: 1, gap: 8 }}>
              <T w="semibold">{t('home.noNext')}</T>
              <Button variant="link" title={t('home.registerCta')} onPress={() => router.push('/parent/register')} />
            </View>
          )}
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
              <Lane key={lane.sub.id + lane.sport} name={lane.kid.full_name} sportLabel={t(`sport.${lane.sport}`)} color={sportColor(p, lane.sport)} marks={weekMarks(lane.sub, lane.sport, data.cancels, now).map((m) => m.mark)} isRTL={isRTL} />
            ))}
          </View>
        ) : null}

        {/* sessions left per kid */}
        {active.length + pending.length > 0 ? (
          <View style={{ marginHorizontal: 20, borderTopWidth: 2, borderTopColor: p.ink }}>
            {[...active, ...pending].map((s) => {
              const kid = kidById.get(s.kid_id);
              if (!kid) return null;
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
                {t('home.renew')}
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
      <View style={{ width: 74 }}>
        <T w="semibold" size={15}>
          {name}
        </T>
        <T size={11} color={p.inkSoft}>
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
                    borderColor: m === 'cancelled' ? p.danger : color,
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
