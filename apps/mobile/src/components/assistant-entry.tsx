import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** "Ask the assistant" card: opens the AI assistant. */
export function AssistantEntry() {
  const { t, isRTL } = useI18n();
  const p = usePalette();
  return (
    <Pressable
      onPress={() => router.push('/assistant')}
      accessibilityRole="button"
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1.5, borderColor: p.ink, borderRadius: 8, padding: 14, backgroundColor: pressed ? p.tile : p.surface })}>
      <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: p.ink, alignItems: 'center', justifyContent: 'center' }}>
        <T w="cond" size={16} color={p.onInk}>
          AI
        </T>
      </View>
      <View style={{ flex: 1 }}>
        <T w="semibold" size={16}>
          {t('ai.open')}
        </T>
        <T size={12} color={p.inkSoft}>
          {t('ai.openSub')}
        </T>
      </View>
      <T size={18}>{isRTL ? '‹' : '›'}</T>
    </Pressable>
  );
}
