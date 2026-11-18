import { normalizeKuwaitPhone } from '@lg/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, View } from 'react-native';

import { Logo } from '@/components/logo';
import { ChoiceCards, Select } from '@/components/pickers';
import { Button, ErrorText, Field, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { RELATIONSHIPS, supabase, type Relationship } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const { t, lang } = useI18n();
  const { refreshProfile } = useAuth();
  const p = usePalette();
  const [accountType, setAccountType] = useState<'family' | 'single' | null>(null);
  const [relationship, setRelationship] = useState<Relationship | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError('');
    if (!accountType) return setError(t('err.accountFor'));
    if (accountType === 'family' && !relationship) return setError(t('err.relationship'));
    if (!name.trim() || !phone.trim() || !email.trim() || !password) return setError(t('err.required'));
    const normalized = normalizeKuwaitPhone(phone);
    if (!normalized) return setError(t('err.phone'));
    if (!EMAIL.test(email.trim())) return setError(t('err.email'));
    if (password.length < 8) return setError(t('err.password'));

    setBusy(true);
    const { data, error: err } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: name.trim(),
          phone: normalized,
          preferred_language: lang ?? 'en',
          account_type: accountType,
          relationship: accountType === 'family' ? relationship : null,
        },
      },
    });
    setBusy(false);
    if (err) return setError(err.message || t('err.generic'));
    if (!data.session) {
      // email confirmation is switched on in Supabase
      setInfo(lang === 'ar' ? 'تم إنشاء الحساب. افتح بريدك الإلكتروني لتأكيده ثم سجّل الدخول.' : 'Account created. Open your email to confirm it, then log in.');
      return;
    }
    await refreshProfile();
    // "Just me": fill in your own details first, then register
    if (accountType === 'single') router.replace({ pathname: '/add-kid', params: { self: '1', first: '1' } });
    else router.replace('/');
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }} keyboardShouldPersistTaps="handled">
          <Logo size={20} />
          <T w="semibold" size={26} style={{ marginTop: 20 }}>
            {t('auth.createAccount')}
          </T>

          <View style={{ gap: 8 }}>
            <T w="semibold" size={14}>
              {t('auth.accountFor')}
            </T>
            <ChoiceCards
              options={[
                { value: 'family', title: t('auth.forFamily'), sub: t('auth.forFamilySub') },
                { value: 'single', title: t('auth.forMe'), sub: t('auth.forMeSub') },
              ]}
              value={accountType}
              onChange={setAccountType}
            />
          </View>
          {accountType === 'family' ? (
            <Select
              label={t('auth.relationship')}
              placeholder={t('auth.choose')}
              options={RELATIONSHIPS.map((r) => ({ value: r, label: t(`rel.${r}`) }))}
              value={relationship}
              onChange={setRelationship}
            />
          ) : null}

          <Field label={t('auth.fullName')} value={name} onChangeText={setName} autoComplete="name" textContentType="name" />
          <Field
            label={t('auth.phone')}
            hint={t('auth.phoneHint')}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            inputMode="tel"
            autoComplete="tel"
            placeholder="9XXX XXXX"
          />
          <Field
            label={t('auth.email')}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            inputMode="email"
            autoComplete="email"
          />
          <Field
            label={t('auth.password')}
            hint={t('auth.passwordHint')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            textContentType="newPassword"
          />
          <ErrorText>{error}</ErrorText>
          {info ? (
            <View style={{ backgroundColor: p.tile, padding: 12, borderRadius: 4 }}>
              <T w="semibold">{info}</T>
            </View>
          ) : null}
          <Button title={t('auth.signup')} onPress={submit} loading={busy} />
          <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center' }}>
            <T color={p.inkSoft}>{t('auth.haveAccount')}</T>
            <Button variant="link" title={t('auth.login')} onPress={() => router.replace('/login')} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
