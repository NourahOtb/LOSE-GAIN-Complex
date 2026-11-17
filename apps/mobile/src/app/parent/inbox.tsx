import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { HomeHeader } from '@/components/home-header';
import { AlertIcon } from '@/components/tab-icons';
import { Button, Screen, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { useNotifications, type Notification } from '@/lib/notifications';
import { usePalette } from '@/lib/theme';

export default function InboxScreen() {
  const { t, lang } = useI18n();
  const { items, unread, reload, markRead } = useNotifications();
  const p = usePalette();
  const [refreshing, setRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';

  useFocusEffect(
    useCallback(() => {
      reload();
      setNow(Date.now());
    }, [reload]),
  );

  const when = (iso: string) => {
    const mins = Math.round((now - new Date(iso).getTime()) / 60000);
    if (mins < 1) return t('inbox.justNow');
    if (mins < 60) return t('inbox.minutes', { n: mins });
    if (mins < 24 * 60) return t('inbox.hours', { n: Math.round(mins / 60) });
    return new Date(iso).toLocaleDateString(locale, { day: 'numeric', month: 'short' });
  };

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 12 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await reload(); setRefreshing(false); }} />}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <T w="semibold" size={24}>
            {t('inbox.title')}
          </T>
          {unread > 0 ? <Button variant="link" title={t('inbox.markAll')} onPress={() => markRead(items.filter((n) => !n.read_at).map((n) => n.id))} /> : null}
        </View>

        {items.length === 0 ? <T color={p.inkSoft}>{t('inbox.empty')}</T> : null}

        <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
          {items.map((n) => (
            <Row key={n.id} n={n} lang={lang ?? 'en'} when={when(n.created_at)} onPress={() => !n.read_at && markRead([n.id])} />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

function Row({ n, lang, when, onPress }: { n: Notification; lang: 'ar' | 'en'; when: string; onPress: () => void }) {
  const p = usePalette();
  const unread = !n.read_at;
  const urgent = n.kind === 'class_cancelled';
  const accent = urgent ? p.danger : n.kind === 'stripe_awarded' || n.kind === 'belt_changed' ? p.bjj : n.kind === 'level_changed' ? p.swim : p.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: unread }}
      style={({ pressed }) => ({ flexDirection: 'row', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: p.line, opacity: pressed ? 0.7 : 1 })}>
      <View style={{ width: 28, alignItems: 'center', paddingTop: 3 }}>
        {urgent ? <AlertIcon color={accent} size={18} /> : <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: unread ? accent : 'transparent', borderWidth: 1.5, borderColor: accent }} />}
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
          <T w={unread ? 'bold' : 'semibold'} size={15} color={urgent ? p.danger : p.ink} style={{ flex: 1 }}>
            {lang === 'ar' ? n.title_ar : n.title_en}
          </T>
          <T size={12} color={p.inkSoft}>
            {when}
          </T>
        </View>
        <T size={14} color={unread ? p.ink : p.inkSoft} style={{ lineHeight: 20 }}>
          {lang === 'ar' ? n.body_ar : n.body_en}
        </T>
      </View>
    </Pressable>
  );
}
