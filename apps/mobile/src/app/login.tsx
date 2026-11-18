import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Logo } from '@/components/logo';
import { PinIcon } from '@/components/tab-icons';
import { ThemeSwitch } from '@/components/theme-switch';
import { Button, ErrorText, Field, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

export default function LoginScreen() {
  const { t, lang, setLang } = useI18n();
  const { refreshProfile } = useAuth();
  const p = usePalette();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!email.trim() || !password) return setError(t('err.required'));
    setBusy(true);
    const { data, error: err } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    if (err || !data.session) {
      setBusy(false);
      return setError(t('err.login'));
    }
    const { data: prof } = await supabase.from('profiles').select('is_active').eq('id', data.session.user.id).maybeSingle();
    if (prof && !prof.is_active) {
      await supabase.auth.signOut();
      setBusy(false);
      return setError(t('err.inactive'));
    }
    await refreshProfile();
    setBusy(false);
    router.replace('/');
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 18, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Logo size={20} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Button variant="link" title={t('auth.changeLanguage')} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} />
              <ThemeSwitch />
            </View>
          </View>

          <View style={{ marginTop: 28, gap: 6 }}>
            <T w="semibold" size={26}>
              {t('auth.welcome')}
            </T>
            <T size={16} color={p.ink}>
              {t('auth.sub')}
            </T>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <PinIcon color={p.inkSoft} size={15} />
              <T size={14} color={p.inkSoft}>
                {t('auth.location')}
              </T>
            </View>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', marginVertical: 4 }}>
            <View style={{ flex: 1, height: 5, backgroundColor: p.ink }} />
            <View style={{ width: 5, height: 22, backgroundColor: p.ink, marginStart: 4 }} />
          </View>

          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            inputMode="email"
            textContentType="emailAddress"
          />
          <Field
            label={t('auth.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="current-password"
            textContentType="password"
            onSubmitEditing={submit}
          />
          <ErrorText>{error}</ErrorText>
          <Button title={t('auth.login')} onPress={submit} loading={busy} />

          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 8 }}>
            <T color={p.inkSoft}>{t('auth.noAccount')}</T>
            <Button variant="link" title={t('auth.createAccount')} onPress={() => router.push('/signup')} />
          </View>
          <Button variant="link" title={t('about.open')} onPress={() => router.push('/about')} style={{ alignSelf: 'center' }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
