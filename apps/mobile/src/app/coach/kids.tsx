import { ageOn, type Sport } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, View } from 'react-native';

import { BeltBar } from '@/components/belt';
import { HomeHeader } from '@/components/home-header';
import { Segmented } from '@/components/pickers';
import { AlertIcon } from '@/components/tab-icons';
import { Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { currentStripes, daysOf, loadCoachData, type CoachData } from '@/lib/coach';
import type { Kid } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { sportColor, usePalette } from '@/lib/theme';

const A = ['sun', 'tue', 'thu'];
const B = ['sat', 'mon', 'wed'];

export default function CoachKids() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const sport: Sport = profile?.sport ?? 'swimming';
  const [data, setData] = useState<CoachData | null>(null);
  const [tab, setTab] = useState<'active' | 'inactive'>('active');

  useFocusEffect(
    useCallback(() => {
      if (profile) loadCoachData(profile.sport ?? 'swimming').then(setData);
    }, [profile]),
  );

  if (!data) {
    return (
      <Screen edges={['top']}>
        <HomeHeader />
        <ActivityIndicator color={p.ink} style={{ marginTop: 40 }} />
      </Screen>
    );
  }

  // days each kid trains in this sport (from current subscriptions)
  const daysByKid = new Map<string, string[]>();
  for (const s of data.subs) {
    const d = daysOf(s, sport);
    if (d.length) daysByKid.set(s.kid_id, [...new Set([...(daysByKid.get(s.kid_id) ?? []), ...d])]);
  }
  const active = data.kids.filter((k) => daysByKid.has(k.id));
  const inactive = data.kids.filter((k) => !daysByKid.has(k.id) && (sport === 'swimming' ? k.swim_level !== null : k.belt !== null));

  const groupOf = (k: Kid) => {
    const d = daysByKid.get(k.id) ?? [];
    if (d.every((x) => A.includes(x))) return 'groupA';
    if (d.every((x) => B.includes(x))) return 'groupB';
    return 'groupMixed';
  };
  const groups = (['groupA', 'groupB', 'groupMixed'] as const).map((g) => ({ g, kids: active.filter((k) => groupOf(k) === g) })).filter((x) => x.kids.length);

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}>
        <View>
          <Label color={sportColor(p, sport)}>{t(`sport.${sport}`)}</Label>
          <T w="semibold" size={24}>
            {t('tab.kids')}
          </T>
        </View>
        <Segmented
          options={[
            { value: 'active', label: `${t('coach.active')} · ${active.length}` },
            { value: 'inactive', label: `${t('coach.inactive')} · ${inactive.length}` },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === 'active' ? (
          groups.length === 0 ? (
            <T color={p.inkSoft}>{t('coach.noKids')}</T>
          ) : (
            groups.map(({ g, kids }) => (
              <View key={g} style={{ borderTopWidth: 2, borderTopColor: p.ink, paddingTop: 10 }}>
                <Label>{t(`coach.${g}` as StringKey)} · {kids.length}</Label>
                {kids.map((k) => (
                  <Row key={k.id} kid={k} sport={sport} data={data} days={(daysByKid.get(k.id) ?? []).map((d) => t(`day.${d}` as StringKey)).join(' · ')} />
                ))}
              </View>
            ))
          )
        ) : inactive.length === 0 ? (
          <T color={p.inkSoft}>{t('coach.noKids')}</T>
        ) : (
          <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
            {inactive.map((k) => (
              <Row key={k.id} kid={k} sport={sport} data={data} dim />
            ))}
          </View>
        )}
      </ScrollView>
    </Screen>
  );
}

function Row({ kid, sport, data, days, dim }: { kid: Kid; sport: Sport; data: CoachData; days?: string; dim?: boolean }) {
  const p = usePalette();
  const { t } = useI18n();
  return (
    <Pressable
      onPress={() => router.push({ pathname: '/kid/[id]', params: { id: kid.id } })}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.7 : dim ? 0.6 : 1 })}>
      <View style={{ flex: 1 }}>
        <T w="semibold" size={15}>
          {kid.full_name}
        </T>
        <T size={12} color={p.inkSoft}>
          {t('kids.years', { n: ageOn(kid.birth_date) })}
          {days ? ` · ${days}` : ''}
        </T>
      </View>
      {kid.health_conditions.length > 0 ? (
        <View style={{ width: 26, height: 26, borderRadius: 4, backgroundColor: p.dangerBg, alignItems: 'center', justifyContent: 'center' }}>
          <AlertIcon color={p.danger} size={15} />
        </View>
      ) : null}
      {sport === 'jiujitsu' && kid.belt ? <BeltBar belt={kid.belt} stripes={currentStripes(data, kid).length} height={14} width={78} /> : null}
      {sport === 'swimming' && kid.swim_level ? <Label color={p.swim}>{t('kids.level', { n: kid.swim_level })}</Label> : null}
    </Pressable>
  );
}
