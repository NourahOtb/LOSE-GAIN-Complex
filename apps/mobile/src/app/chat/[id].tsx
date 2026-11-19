import { router, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';

import { MemberAvatar } from '@/components/avatar';
import { Button, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { chatTime, liveName, type Conversation, type Message } from '@/lib/chat';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

/** One chat between a guardian and a coach about one member. New messages appear live. */
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuth();
  const { t, lang, f, isRTL } = useI18n();
  const p = usePalette();
  const [kid, setKid] = useState<{ full_name: string; photo_url: string | null } | null>(null);
  const [other, setOther] = useState('');
  const [msgs, setMsgs] = useState<Message[] | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const me = profile?.id;

  const markRead = useCallback(() => {
    if (id) supabase.rpc('mark_chat_read', { p_conversation: id }).then(() => {});
  }, [id]);

  useEffect(() => {
    if (!id || !me) return;
    let alive = true;
    (async () => {
      const { data: c } = await supabase.from('conversations').select('id, parent_id, coach_id, kid_id, last_message_at, last_sender_id').eq('id', id).maybeSingle();
      if (!alive || !c) return;
      const [k, names, m] = await Promise.all([
        supabase.from('kids').select('full_name, photo_url').eq('id', c.kid_id).maybeSingle(),
        supabase.rpc('chat_names'),
        supabase.from('messages').select('*').eq('conversation_id', id).order('created_at').limit(300),
      ]);
      if (!alive) return;
      setKid(k.data ?? null);
      const cv = c as Conversation;
      const otherId = cv.parent_id === me ? cv.coach_id : cv.parent_id;
      setOther(((names.data ?? []) as { id: string; full_name: string }[]).find((n) => n.id === otherId)?.full_name ?? '');
      setMsgs((m.data ?? []) as Message[]);
      markRead();
    })();

    // live: new messages in this chat
    const channel = supabase
      .channel(liveName(`chat-${id}`))
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const msg = payload.new as Message;
        setMsgs((cur) => (cur && !cur.some((x) => x.id === msg.id) ? [...cur, msg] : cur));
        if (msg.sender_id !== me) markRead();
      })
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(channel);
    };
  }, [id, me, markRead]);

  useEffect(() => {
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 50);
  }, [msgs?.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || !id || !me) return;
    setSending(true);
    setError('');
    const { data, error: err } = await supabase.from('messages').insert({ conversation_id: id, sender_id: me, body }).select('*').single();
    setSending(false);
    if (err || !data) return setError(t('chat.failed'));
    setText('');
    setMsgs((cur) => (cur && !cur.some((x) => x.id === data.id) ? [...cur, data as Message] : cur));
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        {/* header: who and about whom */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: p.ink }}>
          <Button variant="link" title={isRTL ? '→' : '←'} onPress={back} />
          {kid ? <MemberAvatar kid={kid} size={40} /> : null}
          <View style={{ flex: 1 }}>
            <T w="semibold" size={17}>
              {other || ' '}
            </T>
            <T size={12} color={p.inkSoft}>
              {kid ? t('chat.about', { kid: kid.full_name }) : ' '}
            </T>
          </View>
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}>
          <T size={11} color={p.inkSoft} style={{ textAlign: 'center', marginBottom: 6 }}>
            {t('chat.oversight')}
          </T>
          {msgs === null ? (
            <ActivityIndicator color={p.ink} />
          ) : (
            msgs.map((m) => {
              const mine = m.sender_id === me;
              return (
                <View key={m.id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '82%', gap: 2 }}>
                  <View
                    style={{
                      backgroundColor: mine ? p.ink : p.tile,
                      paddingHorizontal: 12,
                      paddingVertical: 9,
                      borderRadius: 14,
                      borderBottomEndRadius: mine ? 4 : 14,
                      borderBottomStartRadius: mine ? 14 : 4,
                    }}>
                    <T size={15} color={mine ? p.onInk : p.ink} style={{ lineHeight: 21 }}>
                      {m.body}
                    </T>
                  </View>
                  <T size={11} color={p.inkSoft} style={{ alignSelf: mine ? 'flex-end' : 'flex-start' }}>
                    {chatTime(m.created_at, lang ?? 'en')}
                    {mine && m.read_at ? ' · ✓✓' : ''}
                  </T>
                </View>
              );
            })
          )}
        </ScrollView>

        {error ? (
          <T size={13} color={p.danger} style={{ paddingHorizontal: 16 }}>
            {error}
          </T>
        ) : null}
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12, borderTopWidth: 1, borderTopColor: p.line }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('chat.placeholder')}
            placeholderTextColor={p.inkSoft}
            multiline
            maxLength={2000}
            accessibilityLabel={t('chat.placeholder')}
            style={{
              flex: 1,
              minHeight: 46,
              maxHeight: 120,
              borderWidth: 1.5,
              borderColor: p.ink,
              borderRadius: 22,
              paddingHorizontal: 16,
              paddingTop: 12,
              paddingBottom: 12,
              color: p.ink,
              backgroundColor: p.surface,
              fontFamily: f.regular,
              fontSize: 15,
              textAlign: isRTL ? 'right' : 'left',
            }}
          />
          <Pressable
            onPress={send}
            disabled={sending || !text.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            style={({ pressed }) => ({
              height: 46,
              paddingHorizontal: 18,
              borderRadius: 23,
              backgroundColor: p.ink,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: sending || !text.trim() ? 0.4 : pressed ? 0.8 : 1,
            })}>
            {sending ? <ActivityIndicator color={p.onInk} /> : <T w="semibold" color={p.onInk}>{t('chat.send')}</T>}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
