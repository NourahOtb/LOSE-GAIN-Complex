import { ComingSoon, HomeHeader } from '@/components/home-header';
import { Screen } from '@/components/ui';
import { useI18n } from '@/lib/i18n';

export default function Placeholder() {
  const { t } = useI18n();
  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ComingSoon title={t('tab.private')} />
    </Screen>
  );
}
