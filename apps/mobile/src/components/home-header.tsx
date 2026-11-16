import { router } from 'expo-router';
import { View } from 'react-native';

import { Logo } from '@/components/logo';
import { Button, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Top of every signed-in screen: logo, greeting, language switch and log out. */
export function HomeHeader() {
  const { profile, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const p = usePalette();
  const name = profile?.full_name ?? '';
  const first = name.startsWith('Coach ') ? name : name.split(' ')[0];
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Logo size={17} />
      <View style={{ alignItems: 'flex-end', gap: 2 }}>
        <T size={13} color={p.inkSoft}>
          {t('hello', { name: first })}
        </T>
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <Button variant="link" title={t('auth.changeLanguage')} onPress={() => setLang(lang === 'ar' ? 'en' : 'ar')} />
          <Button
            variant="link"
            title={t('auth.logout')}
            onPress={async () => {
              await signOut();
              router.replace('/');
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function ComingSoon({ title }: { title: string }) {
  const { t } = useI18n();
  const p = usePalette();
  return (
    <View style={{ paddingHorizontal: 20, gap: 8 }}>
      <T w="semibold" size={24}>
        {title}
      </T>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1, height: 5, backgroundColor: p.ink }} />
        <View style={{ width: 5, height: 22, backgroundColor: p.ink, marginStart: 4 }} />
      </View>
      <T color={p.inkSoft}>{t('soon')}</T>
    </View>
  );
}
