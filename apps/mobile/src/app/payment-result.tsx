import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Button, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { confirmPayment } from '@/lib/payments';
import type { StringKey } from '@/lib/strings';
import { usePalette } from '@/lib/theme';

/** UPayments sends the parent back here (returnUrl / cancelUrl). We confirm with our server, which checks with UPayments. */
export default function PaymentResult() {
  const params = useLocalSearchParams<{ track_id?: string; result?: string; cancelled?: string }>();
  const { t } = useI18n();
  const { session, loading } = useAuth();
  const { reload } = useNotifications();
  const p = usePalette();
  const [state, setState] = useState<'checking' | 'paid' | 'not_paid' | 'cancelled' | 'unknown'>(
    params.cancelled && !params.track_id ? 'cancelled' : 'checking',
  );

  useEffect(() => {
    if (state !== 'checking' || loading) return;
    if (!params.track_id || !session) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-off result for a missing payment id
      setState(params.cancelled ? 'cancelled' : 'unknown');
      return;
    }
    confirmPayment(params.track_id).then((s) => {
      setState(s === 'paid' ? 'paid' : params.cancelled || s === 'not_paid' ? 'not_paid' : 'unknown');
      reload();
    });
  }, [state, loading, session, params.track_id, params.cancelled, reload]);

  const msg: Record<typeof state, StringKey> = {
    checking: 'pay.checking',
    paid: 'pay.success',
    not_paid: 'pay.notPaid',
    cancelled: 'pay.cancelled',
    unknown: 'pay.unknown',
  };
  const good = state === 'paid';

  return (
    <Screen style={{ padding: 24, gap: 24 }}>
      <Logo size={20} />
      <T w="semibold" size={26}>
        {t('pay.title')}
      </T>
      <View style={{ backgroundColor: good ? p.tile : state === 'checking' ? p.surface : p.dangerBg, borderRadius: 4, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' }}>
        {state === 'checking' ? <ActivityIndicator color={p.ink} /> : null}
        <T w="semibold" size={17} color={good || state === 'checking' ? p.ink : p.danger} style={{ flex: 1 }}>
          {t(msg[state])}
        </T>
      </View>
      {state !== 'checking' ? <Button title={t('tab.home')} onPress={() => router.replace('/parent')} /> : null}
      <T size={12} color={p.inkSoft}>
        {t('pay.sandbox')}
      </T>
    </Screen>
  );
}
