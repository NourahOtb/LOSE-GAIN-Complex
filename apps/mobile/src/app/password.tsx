import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Button, ErrorText, Field, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

/** Change password. Also shown straight after logging in with a temporary password from reception. */
export default function PasswordScreen() {
  const { t, isRTL } = useI18n();
  const { profile, refreshProfile, signOut } = useAuth();
  const p = usePalette();
  const first = !!profile?.must_change_password;
  const [a, setA] = useState('');
  const [b, setB] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  const save = async () => {
    setError('');
    if (a.length < 8) return setError(t('pw.short'));
    if (a !== b) return setError(t('pw.mismatch'));
    setBusy(true);
    const { error: err } = await supabase.auth.updateUser({ password: a });
    if (err) {
      setBusy(false);
      return setError(/different/i.test(err.message) ? t('pw.same') : /should contain|weak|at least/i.test(err.message) ? t('pw.weak') : t('err.generic'));
    }
    const { data: changed } = await supabase.rpc('password_changed');
    if (changed === false) {
      setBusy(false);
      return setError(t('pw.same'));
    }
    await refreshProfile();
    setBusy(false);
    setA('');
    setB('');
    if (first) router.replace('/');
    else setDone(true);
  };

  return (
    <Screen edges={['top', 'bottom']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18 }} keyboardShouldPersistTaps="handled">
          {!first ? <Button variant="link" title={isRTL ? '→' : '←'} onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} style={{ alignSelf: 'flex-start' }} /> : null}
          <T w="semibold" size={26}>
            {first ? t('pw.firstTitle') : t('pw.change')}
          </T>
          {first ? (
            <View style={{ backgroundColor: p.tile, padding: 14, borderRadius: 6 }}>
              <T size={14} style={{ lineHeight: 20 }}>
                {t('pw.firstSub')}
              </T>
            </View>
          ) : null}
          <Field label={t('pw.new')} value={a} onChangeText={setA} secureTextEntry autoComplete="new-password" textContentType="newPassword" hint={t('pw.hint')} />
          <Field label={t('pw.again')} value={b} onChangeText={setB} secureTextEntry autoComplete="new-password" textContentType="newPassword" />
          {error ? <ErrorText>{error}</ErrorText> : null}
          {done ? (
            <T w="semibold" color={p.swim}>
              {t('pw.saved')}
            </T>
          ) : null}
          <Button title={t('pw.save')} onPress={save} loading={busy} disabled={!a || !b} />
          {first ? <Button variant="link" title={t('auth.logout')} onPress={async () => { await signOut(); router.replace('/'); }} style={{ alignSelf: 'center' }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
