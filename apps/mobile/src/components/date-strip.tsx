import { addDays, isoDate } from '@lg/shared';
import { useMemo } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Scrollable row of the next `days` dates (Fridays skipped: the complex is closed). Value is 'YYYY-MM-DD'. */
export function DateStrip({ value, onChange, days = 30 }: { value: string; onChange: (iso: string) => void; days?: number }) {
  const p = usePalette();
  const { lang, t } = useI18n();
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';

  const dates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: days }, (_, i) => addDays(today, i)).filter((d) => d.getDay() !== 5);
  }, [days]);

  const todayIso = isoDate(new Date());

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
      {dates.map((d) => {
        const iso = isoDate(d);
        const on = iso === value;
        const monthStart = d.getDate() === 1 || iso === todayIso;
        return (
          <Pressable
            key={iso}
            onPress={() => onChange(iso)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            style={({ pressed }) => ({
              width: 58,
              paddingVertical: 8,
              alignItems: 'center',
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: on ? p.ink : p.line,
              backgroundColor: on ? p.ink : pressed ? p.tile : p.surface,
            })}>
            <T w="cond" size={12} color={on ? p.onInk : p.inkSoft} style={{ textAlign: 'center' }}>
              {iso === todayIso ? t('reg.today') : d.toLocaleDateString(locale, { weekday: 'short' })}
            </T>
            <T w="cond" size={24} color={on ? p.onInk : p.ink} style={{ textAlign: 'center', lineHeight: 28 }}>
              {d.toLocaleDateString(locale, { day: 'numeric' })}
            </T>
            <View style={{ height: 14 }}>
              {monthStart || on ? (
                <T size={11} color={on ? p.onInk : p.inkSoft} style={{ textAlign: 'center' }}>
                  {d.toLocaleDateString(locale, { month: 'short' })}
                </T>
              ) : null}
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
