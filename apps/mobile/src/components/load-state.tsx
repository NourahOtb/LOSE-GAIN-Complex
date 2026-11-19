import { ActivityIndicator, View } from 'react-native';

import { Button, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** While a screen loads: say what is loading. If it failed: say so, with Try again. Never a blank screen. */
export function LoadState({ message, failed, onRetry }: { message: string; failed: boolean; onRetry: () => void }) {
  const { t } = useI18n();
  const p = usePalette();
  return (
    <View style={{ alignItems: 'center', gap: 14, padding: 24, marginTop: 24 }}>
      {failed ? null : <ActivityIndicator color={p.ink} />}
      <T color={failed ? p.danger : p.inkSoft} style={{ textAlign: 'center' }}>
        {failed ? t('load.failed') : message}
      </T>
      {failed ? <Button title={t('common.retry')} onPress={onRetry} style={{ alignSelf: 'stretch', maxWidth: 320, width: '100%' }} /> : null}
    </View>
  );
}
