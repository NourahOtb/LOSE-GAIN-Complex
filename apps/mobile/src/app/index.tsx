import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Button, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Sends everyone to the right place: language → login → their home. */
export default function Gate() {
  const { ready, lang, t } = useI18n();
  const { loading, session, profile, profileError, refreshProfile, signOut } = useAuth();
  const p = usePalette();
  const waiting = !ready || loading || (!!session && !profile);
  // never a silent blank screen: after 8 seconds say it's slow and offer a way out
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    if (!waiting) return;
    const id = setTimeout(() => setSlow(true), 8000);
    return () => {
      clearTimeout(id);
      setSlow(false);
    };
  }, [waiting]);

  if (waiting) {
    const stuck = profileError || slow;
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg, padding: 24, gap: 18 }}>
        <Logo />
        {stuck ? null : <ActivityIndicator color={p.ink} />}
        {ready ? (
          <T color={p.inkSoft} style={{ textAlign: 'center' }}>
            {profileError ? t('gate.failed') : slow ? t('gate.slow') : session ? t('gate.signingIn') : t('gate.starting')}
          </T>
        ) : null}
        {ready && stuck && session ? (
          <View style={{ gap: 10, width: '100%', maxWidth: 320 }}>
            <Button title={t('common.retry')} onPress={() => refreshProfile()} />
            <Button variant="link" title={t('auth.logout')} onPress={() => signOut()} style={{ alignSelf: 'center' }} />
          </View>
        ) : null}
      </View>
    );
  }
  if (!lang) return <Redirect href="/language" />;
  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.must_change_password) return <Redirect href="/password" />;
  if (profile.role === 'parent') return <Redirect href="/parent" />;
  if (profile.role === 'coach') return <Redirect href="/coach" />;
  return <Redirect href="/staff" />;
}
