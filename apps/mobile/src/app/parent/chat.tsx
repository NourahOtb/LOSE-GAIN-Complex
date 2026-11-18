import { timeOf, type Sport } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';

import { ChatList } from '@/components/chat-list';
import { HomeHeader } from '@/components/home-header';
import { Segmented } from '@/components/pickers';
import { Button, ErrorText, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { loadChats, type ChatRow } from '@/lib/chat';
import { ageGroupOf } from '@/lib/data';
import { findClass, loadFamily, type FamilyData } from '@/lib/family';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

/** Guardian chat: my chats with coaches, and "New message" → member → coach. */
export default function ParentChat() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [fam, setFam] = useState<FamilyData | null>(null);
  const [coachSports, setCoachSports] = useState<{ id: string; full_name: string; sport: string | null }[]>([]);
  const [composing, setComposing] = useState(false);
  const [kidId, setKidId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!profile) return;
    const [list, family, dir] = await Promise.all([loadChats(profile.id), loadFamily(profile.id), supabase.rpc('coach_directory')]);
    setRows(list);
    setFam(family);
    setCoachSports((dir.data ?? []) as { id: string; full_name: string; sport: string | null }[]);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  // the coaches of a member: from their classes; otherwise every coach of the sports they're in (or every coach)
  const coachesFor = (id: string) => {
    if (!fam) return [];
    const kid = fam.kids.find((k) => k.id === id);
    if (!kid) return [];
    const ids = new Set<string>();
    const sports = new Set<Sport>();
    for (const s of fam.subs.filter((x) => x.kid_id === id && x.kind === 'classes')) {
      for (const sport of ['swimming', 'jiujitsu'] as Sport[]) {
        const days = sport === 'swimming' ? s.swim_days : s.bjj_days;
        if (days.length) sports.add(sport);
        for (const d of days) {
          const c = findClass(fam.classes, sport, d, timeOf(s, sport, d), ageGroupOf(sport, kid));
          if (c?.coach_id) ids.add(c.coach_id);
        }
      }
    }
    const list = ids.size
      ? coachSports.filter((c) => ids.has(c.id))
      : coachSports.filter((c) => !sports.size || (c.sport && sports.has(c.sport as Sport)));
    return list;
  };

  const kids = fam?.kids ?? [];
  const chosenKid = kidId ?? kids[0]?.id ?? null;
  const coaches = chosenKid ? coachesFor(chosenKid) : [];
  const chosenCoach = coachId && coaches.some((c) => c.id === coachId) ? coachId : (coaches[0]?.id ?? null);

  const open = async () => {
    if (!chosenKid || !chosenCoach) return;
    setBusy(true);
    setError('');
    const { data, error: err } = await supabase.rpc('open_conversation', { p_kid: chosenKid, p_coach: chosenCoach });
    setBusy(false);
    if (err || !data) return setError(t('err.generic'));
    setComposing(false);
    router.push({ pathname: '/chat/[id]', params: { id: String(data) } });
  };

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <T w="semibold" size={24}>
          {t('chat.title')}
        </T>

        {composing ? (
          <View style={{ gap: 14, borderWidth: 1.5, borderColor: p.ink, borderRadius: 8, padding: 14 }}>
            <View style={{ gap: 8 }}>
              <Label>{t('chat.pickMember')}</Label>
              <Segmented options={kids.map((k) => ({ value: k.id, label: k.full_name }))} value={chosenKid} onChange={(v) => { setKidId(v); setCoachId(null); }} />
            </View>
            <View style={{ gap: 8 }}>
              <Label>{t('chat.pickCoach')}</Label>
              {coaches.length ? (
                <Segmented options={coaches.map((c) => ({ value: c.id, label: c.full_name }))} value={chosenCoach} onChange={setCoachId} />
              ) : (
                <T color={p.inkSoft}>{t('chat.noCoach')}</T>
              )}
            </View>
            <ErrorText>{error}</ErrorText>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Button title={t('chat.start')} onPress={open} loading={busy} disabled={!chosenCoach} style={{ flex: 1 }} />
              <Button variant="ghost" title={t('common.cancel')} onPress={() => setComposing(false)} style={{ flex: 1 }} />
            </View>
          </View>
        ) : kids.length ? (
          <Button title={`+  ${t('chat.new')}`} onPress={() => setComposing(true)} />
        ) : null}

        {rows && profile ? <ChatList rows={rows} myId={profile.id} empty={t('chat.empty')} /> : null}
      </ScrollView>
    </Screen>
  );
}
