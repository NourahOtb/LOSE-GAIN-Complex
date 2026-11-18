import AsyncStorage from '@react-native-async-storage/async-storage';
import { formatKD } from '@lg/shared';
import { router } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View, type ScrollViewInstance } from 'react-native';

import { Button, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { startOnlinePayment } from '@/lib/payments';
import type { StringKey } from '@/lib/strings';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type Proposal =
  | { type: 'register'; member: string; label: string; start_date: string; end_date: string; total: number; params: Record<string, unknown> }
  | { type: 'pay'; member: string; label: string; total: number; subscription_id: string };
type Turn = { role: 'user' | 'assistant'; content: string; proposals?: Proposal[] };

/** AI assistant for guardians. It answers and prepares; only the guardian's Confirm tap changes anything. */
export default function AssistantScreen() {
  const { profile } = useAuth();
  const { t, lang, f, isRTL } = useI18n();
  const p = usePalette();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const scroll = useRef<ScrollViewInstance>(null);
  const key = profile ? `lg.assistant.${profile.id}` : null;

  // keep the conversation on this device (last 30 turns)
  useEffect(() => {
    if (!key) return;
    AsyncStorage.getItem(key)
      .then((v) => v && setTurns(JSON.parse(v) as Turn[]))
      .catch(() => {});
  }, [key]);
  useEffect(() => {
    if (key) AsyncStorage.setItem(key, JSON.stringify(turns.slice(-30))).catch(() => {});
    setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 60);
  }, [turns, key]);

  const ask = async (question: string) => {
    const q = question.trim();
    if (!q || busy) return;
    setError('');
    const next: Turn[] = [...turns, { role: 'user', content: q }];
    setTurns(next);
    setText('');
    setBusy(true);
    const { data, error: err } = await supabase.functions.invoke('assistant', {
      body: { lang: lang ?? 'en', messages: next.map((x) => ({ role: x.role, content: x.content })) },
    });
    setBusy(false);
    if (err || !data?.reply) {
      let code = '';
      try {
        const ctx = (err as { context?: Response } | null)?.context;
        if (ctx && typeof ctx.json === 'function') code = ((await ctx.json()) as { error?: string }).error ?? '';
      } catch {
        // generic
      }
      setError(t((['not_configured', 'daily_limit'].includes(code) ? `ai.err.${code}` : 'ai.err.generic') as StringKey));
      return;
    }
    setTurns((cur) => [...cur, { role: 'assistant', content: String(data.reply), proposals: (data.proposals ?? []) as Proposal[] }]);
  };

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));
  const suggestions: StringKey[] = ['ai.s1', 'ai.s2', 'ai.s3', 'ai.s4'];

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 2, borderBottomColor: p.ink }}>
          <Button variant="link" title={isRTL ? '→' : '←'} onPress={back} />
          <T w="semibold" size={18} style={{ flex: 1 }}>
            {t('ai.title')}
          </T>
          {turns.length ? <Button variant="link" title={t('ai.clear')} onPress={() => setTurns([])} /> : null}
        </View>

        <ScrollView ref={scroll} contentContainerStyle={{ padding: 16, gap: 10, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {turns.length === 0 ? (
            <View style={{ gap: 14 }}>
              <View style={{ backgroundColor: p.tile, padding: 14, borderRadius: 8 }}>
                <T size={14} style={{ lineHeight: 20 }}>
                  {t('ai.sub')}
                </T>
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {suggestions.map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => ask(t(s))}
                    accessibilityRole="button"
                    style={({ pressed }) => ({ borderWidth: 1.5, borderColor: p.ink, borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9, backgroundColor: pressed ? p.tile : p.surface })}>
                    <T w="semibold" size={14}>
                      {t(s)}
                    </T>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : (
            turns.map((m, i) => (
              <View key={i} style={{ gap: 8 }}>
                <View
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '86%',
                    backgroundColor: m.role === 'user' ? p.ink : p.tile,
                    paddingHorizontal: 12,
                    paddingVertical: 9,
                    borderRadius: 14,
                  }}>
                  <T size={15} color={m.role === 'user' ? p.onInk : p.ink} style={{ lineHeight: 21 }}>
                    {m.content}
                  </T>
                </View>
                {m.proposals?.map((pr, j) => <ProposalCard key={j} proposal={pr} />)}
              </View>
            ))
          )}
          {busy ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <ActivityIndicator color={p.ink} />
              <T size={13} color={p.inkSoft}>
                {t('ai.thinking')}
              </T>
            </View>
          ) : null}
          {error ? (
            <T size={14} color={p.danger} w="semibold">
              {error}
            </T>
          ) : null}
        </ScrollView>

        <T size={11} color={p.inkSoft} style={{ textAlign: 'center', paddingHorizontal: 16 }}>
          {t('ai.note')}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 8, padding: 12 }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={t('ai.placeholder')}
            placeholderTextColor={p.inkSoft}
            multiline
            maxLength={1000}
            accessibilityLabel={t('ai.placeholder')}
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
            onPress={() => ask(text)}
            disabled={busy || !text.trim()}
            accessibilityRole="button"
            accessibilityLabel={t('chat.send')}
            style={({ pressed }) => ({ height: 46, paddingHorizontal: 18, borderRadius: 23, backgroundColor: p.ink, alignItems: 'center', justifyContent: 'center', opacity: busy || !text.trim() ? 0.4 : pressed ? 0.8 : 1 })}>
            <T w="semibold" color={p.onInk}>
              {t('chat.send')}
            </T>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

/** What the assistant prepared. Only these buttons change anything, through the same server checks as the app. */
function ProposalCard({ proposal }: { proposal: Proposal }) {
  const { t, lang } = useI18n();
  const p = usePalette();
  const [state, setState] = useState<'idle' | 'busy' | 'done' | 'error'>('idle');
  const [subId, setSubId] = useState<string | null>(proposal.type === 'pay' ? proposal.subscription_id : null);
  const [msg, setMsg] = useState('');
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString(lang === 'ar' ? 'ar-KW' : 'en-GB', { day: 'numeric', month: 'short' });

  const pay = async (id: string) => {
    setState('busy');
    const r = await startOnlinePayment(id, lang ?? 'en');
    if (r.kind === 'error') {
      setState('error');
      setMsg(t(`pay.err.${r.error}` as StringKey));
    }
    if (r.kind === 'returned') router.push({ pathname: '/payment-result', params: { sub: id } });
  };

  const confirm = async () => {
    if (proposal.type !== 'register') return;
    setState('busy');
    setMsg('');
    const { data, error } = await supabase.functions.invoke('register', { body: proposal.params });
    if (error || !data?.id) {
      setState('error');
      setMsg(t('err.generic'));
      return;
    }
    setSubId(String(data.id));
    setState('done');
  };

  return (
    <View style={{ borderWidth: 2, borderColor: p.ink, borderRadius: 8, padding: 14, gap: 6, backgroundColor: p.surface }}>
      <T w="semibold" size={16}>
        {proposal.member}
      </T>
      <T size={14}>{proposal.label}</T>
      {proposal.type === 'register' ? (
        <T size={12} color={p.inkSoft}>
          {t('ai.dates', { start: fmt(proposal.start_date), end: fmt(proposal.end_date) })}
        </T>
      ) : null}
      <T w="cond" size={28}>
        {formatKD(proposal.total, lang ?? 'en')}
      </T>
      {state === 'done' ? (
        <View style={{ gap: 8 }}>
          <T size={13} w="semibold" color={p.swim}>
            {t('ai.confirmed')}
          </T>
          {subId ? <Button title={t('ai.payOnline')} onPress={() => pay(subId)} /> : null}
        </View>
      ) : proposal.type === 'register' ? (
        <Button title={t('ai.confirm')} onPress={confirm} loading={state === 'busy'} />
      ) : (
        <Button title={t('ai.payOnline')} onPress={() => pay(proposal.subscription_id)} loading={state === 'busy'} />
      )}
      {msg ? (
        <T size={13} color={p.danger}>
          {msg}
        </T>
      ) : null}
    </View>
  );
}
