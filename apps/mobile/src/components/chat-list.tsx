import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { chatTime, type ChatRow } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** List of chats: name, about whom, last message, unread count. */
export function ChatList({ rows, myId, empty }: { rows: ChatRow[]; myId: string; empty: string }) {
  const { t, lang } = useI18n();
  const p = usePalette();
  if (!rows.length) return <T color={p.inkSoft}>{empty}</T>;
  return (
    <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
      {rows.map((c) => (
        <Pressable
          key={c.id}
          onPress={() => router.push({ pathname: '/chat/[id]', params: { id: c.id } })}
          accessibilityRole="button"
          style={({ pressed }) => ({ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: p.line, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}>
              <T w="semibold" size={16} style={{ flex: 1 }}>
                {c.otherName}
              </T>
              {c.last_message_at ? (
                <T size={12} color={p.inkSoft}>
                  {chatTime(c.last_message_at, lang ?? 'en')}
                </T>
              ) : null}
            </View>
            <T size={12} color={p.inkSoft}>
              {t('chat.about', { kid: c.kidName })}
            </T>
            {c.lastBody ? (
              <T size={14} numberOfLines={1} w={c.unread ? 'semibold' : 'regular'} color={c.unread ? p.ink : p.inkSoft}>
                {c.last_sender_id === myId ? `${t('chat.you')}: ` : ''}
                {c.lastBody}
              </T>
            ) : null}
          </View>
          {c.unread ? (
            <View style={{ minWidth: 24, height: 24, borderRadius: 12, backgroundColor: p.danger, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
              <T w="semibold" size={12} color="#FFFFFF">
                {c.unread}
              </T>
            </View>
          ) : null}
        </Pressable>
      ))}
    </View>
  );
}
