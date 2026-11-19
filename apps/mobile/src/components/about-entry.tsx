import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { InfoIcon } from '@/components/tab-icons';
import { T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** "About the complex" card on Home: opening hours, open pool and location, for logged-in families. */
export function AboutEntry() {
  const { t, isRTL } = useI18n();
  const p = usePalette();
  return (
    <Pressable
      onPress={() => router.push('/about')}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: p.line, borderRadius: 8, padding: 14, backgroundColor: pressed ? p.tile : p.surface })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.tile, alignItems: 'center', justifyContent: 'center' }}>
        <InfoIcon color={p.swim} size={20} />
      </View>
      <View style={{ flex: 1 }}>
        <T w="semibold" size={16}>
          {t('about.open')}
        </T>
        <T size={12} color={p.inkSoft}>
          {t('about.openSub')}
        </T>
      </View>
      <T size={18}>{isRTL ? '‹' : '›'}</T>
    </Pressable>
  );
}
