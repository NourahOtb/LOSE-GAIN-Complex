import { router, useLocalSearchParams, useSegments } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Button, ErrorText, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import { useNotifications } from '@/lib/notifications';
import { checkPayment, confirmPayment, startOnlinePayment, type PayStatus } from '@/lib/payments';
import type { StringKey } from '@/lib/strings';
import { usePalette } from '@/lib/theme';

type View_ = 'checking' | 'paid' | 'not_paid' | 'cancelled' | 'pending' | 'unknown';

const COPY: Record<View_, { title: StringKey; sub?: StringKey }> = {
  checking: { title: 'pay.checking' },
  paid: { title: 'pay.success', sub: 'pay.successSub' },
  not_paid: { title: 'pay.notPaid', sub: 'pay.notPaidSub' },
  cancelled: { title: 'pay.cancelled', sub: 'pay.cancelledSub' },
  pending: { title: 'pay.pending', sub: 'pay.pendingSub' },
  unknown: { title: 'pay.unknown', sub: 'pay.unknownSub' },
};

/**
 * UPayments sends the parent back here on success (returnUrl) and on failure/cancel (cancelUrl).
 * We never trust the URL: our server asks UPayments, then we show a friendly result with a way forward.
 */
export default function PaymentResult() {
  const params = useLocalSearchParams<{ sub?: string; track_id?: string; result?: string; cancelled?: string }>();
  // UPayments appends its own "?..." to our address, so our flags live in the path:
  // /payment-result/<sub> (returnUrl) and /payment-cancelled/<sub> (cancelUrl)
  const segments = useSegments() as string[];
  const cancelledRoute = segments[0] === 'payment-cancelled' || !!params.cancelled;
  // what UPayments says in the address; only ever used to show a failure faster, never to mark as paid
  const urlResult = String(params.result ?? '').toUpperCase();
  const urlFailed = !!urlResult && urlResult !== 'CAPTURED';
  const { t, lang } = useI18n();
  const { session, loading } = useAuth();
  const { reload } = useNotifications();
  const p = usePalette();
  const [view, setView] = useState<View_>('checking');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const tries = useRef(0);

  const check = useCallback(async (): Promise<PayStatus> => {
    if (params.track_id) return confirmPayment(params.track_id);
    if (params.sub) return checkPayment(params.sub);
    return 'none';
  }, [params.track_id, params.sub]);

  useEffect(() => {
    if (loading || view !== 'checking') return;
    if (!session) {
      router.replace('/login');
      return;
    }
    let alive = true;
    (async () => {
      const s = await check();
      if (!alive) return;
      if (s !== 'paid' && (urlFailed || (cancelledRoute && s !== 'unknown' && s !== 'pending'))) {
        setView(cancelledRoute || urlResult === 'CANCELED' || urlResult === 'CANCELLED' ? 'cancelled' : 'not_paid');
        return;
      }
      // still waiting on the bank or UPayments: re-check a few times before telling the parent
      if ((s === 'pending' || s === 'unknown') && tries.current < 4) {
        tries.current += 1;
        setTimeout(() => alive && setView('checking'), 3000);
        setView('pending');
        return;
      }
      if (s === 'paid') reload();
      setView(s === 'paid' ? 'paid' : s === 'not_paid' ? (cancelledRoute ? 'cancelled' : 'not_paid') : s === 'none' ? (cancelledRoute ? 'cancelled' : 'unknown') : s);
    })();
    return () => {
      alive = false;
    };
  }, [view, loading, session, check, reload, cancelledRoute, urlFailed, urlResult]);

  const tryAgain = async () => {
    if (!params.sub) return router.replace('/parent');
    setBusy(true);
    setError('');
    const r = await startOnlinePayment(params.sub, lang ?? 'en');
    setBusy(false);
    if (r.kind === 'error') setError(t(`pay.err.${r.error}` as StringKey));
    else if (r.kind === 'returned') {
      tries.current = 0;
      setView('checking');
    }
  };

  const good = view === 'paid';
  const waiting = view === 'checking' || view === 'pending';
  const bg = good ? p.tile : waiting ? p.surface : p.dangerBg;
  const fg = good || waiting ? p.ink : p.danger;
  const copy = COPY[view];

  return (
    <Screen style={{ padding: 24, gap: 20 }}>
      <Logo size={20} />
      <T w="semibold" size={26} style={{ marginTop: 8 }}>
        {t('pay.title')}
      </T>

      <View accessibilityLiveRegion="polite" style={{ backgroundColor: bg, borderRadius: 4, padding: 16, gap: 6, borderWidth: waiting ? 1 : 0, borderColor: p.line }}>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          {waiting ? <ActivityIndicator color={p.ink} /> : null}
          <T w="semibold" size={18} color={fg} style={{ flex: 1 }}>
            {t(copy.title)}
          </T>
        </View>
        {copy.sub ? (
          <T size={14} color={good || waiting ? p.inkSoft : p.danger} style={{ lineHeight: 20 }}>
            {t(copy.sub)}
          </T>
        ) : null}
      </View>

      <ErrorText>{error}</ErrorText>

      {/* a clear way forward for every outcome */}
      {view === 'paid' ? <Button title={t('pay.home')} onPress={() => router.replace('/parent')} /> : null}

      {view === 'not_paid' || view === 'cancelled' ? (
        <View style={{ gap: 10 }}>
          <Button title={t('pay.tryAgain')} onPress={tryAgain} loading={busy} />
          <Button variant="ghost" title={t('pay.reception')} onPress={() => router.replace('/parent')} />
        </View>
      ) : null}

      {view === 'unknown' ? (
        <View style={{ gap: 10 }}>
          <Button
            title={t('pay.checkAgain')}
            onPress={() => {
              tries.current = 0;
              setView('checking');
            }}
          />
          <Button variant="ghost" title={t('pay.home')} onPress={() => router.replace('/parent')} />
        </View>
      ) : null}

      {view === 'pending' ? <Button variant="ghost" title={t('pay.home')} onPress={() => router.replace('/parent')} /> : null}

      <T size={12} color={p.inkSoft}>
        {t('pay.sandbox')}
      </T>
    </Screen>
  );
}
