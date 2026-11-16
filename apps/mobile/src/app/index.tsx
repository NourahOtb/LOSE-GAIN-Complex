import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';

import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Sends everyone to the right place: language → login → their home. */
export default function Gate() {
  const { ready, lang } = useI18n();
  const { loading, session, profile } = useAuth();
  const p = usePalette();

  if (!ready || loading || (session && !profile)) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: p.bg }}>
        <ActivityIndicator color={p.ink} />
      </View>
    );
  }
  if (!lang) return <Redirect href="/language" />;
  if (!session || !profile) return <Redirect href="/login" />;
  if (profile.role === 'parent') return <Redirect href="/parent" />;
  if (profile.role === 'coach') return <Redirect href="/coach" />;
  return <Redirect href="/staff" />;
}
