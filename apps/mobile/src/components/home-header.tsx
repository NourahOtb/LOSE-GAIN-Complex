import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Logo } from '@/components/logo';
import { GearIcon } from '@/components/tab-icons';
import { T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Top of every signed-in screen: logo, greeting, language switch and log out. */
export function HomeHeader() {
  const { profile } = useAuth();
  const { t } = useI18n();
  const p = usePalette();
  const name = profile?.full_name ?? '';
  const first = name.startsWith('Coach ') ? name : name.split(' ')[0];
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <Logo size={17} />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T size={13} color={p.inkSoft}>
          {t('hello', { name: first })}
        </T>
        <Pressable
          onPress={() => router.push('/settings')}
          accessibilityRole="button"
          accessibilityLabel={t('settings.open')}
          hitSlop={8}
          style={({ pressed }) => ({ width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 20, backgroundColor: pressed ? p.tile : 'transparent' })}>
          <GearIcon color={p.ink} size={22} />
        </Pressable>
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
