import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView } from 'react-native';

import { ChatList } from '@/components/chat-list';
import { HomeHeader } from '@/components/home-header';
import { Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { loadChats, type ChatRow } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';

/** Coach chat: every guardian who wrote, unread first in mind (red number). */
export default function CoachChat() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const [rows, setRows] = useState<ChatRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (profile) setRows(await loadChats(profile.id));
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <T w="semibold" size={24}>
          {t('chat.title')}
        </T>
        {rows && profile ? <ChatList rows={rows} myId={profile.id} empty={t('chat.emptyCoach')} /> : null}
      </ScrollView>
    </Screen>
  );
}
