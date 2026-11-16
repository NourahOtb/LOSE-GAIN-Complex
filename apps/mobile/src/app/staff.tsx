import { View } from 'react-native';

import { HomeHeader } from '@/components/home-header';
import { Screen, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Staff log in to the admin dashboard, not the app. */
export default function StaffScreen() {
  const { t } = useI18n();
  const p = usePalette();
  return (
    <Screen>
      <HomeHeader />
      <View style={{ padding: 20, gap: 10 }}>
        <T w="semibold" size={24}>
          {t('staff.title')}
        </T>
        <T color={p.inkSoft}>{t('staff.body')}</T>
      </View>
    </Screen>
  );
}
