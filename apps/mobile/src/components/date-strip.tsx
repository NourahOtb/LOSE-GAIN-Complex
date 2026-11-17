import { isoDate } from '@lg/shared';
import { Pressable, ScrollView, View } from 'react-native';

import { T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Row of selectable dates (ISO 'YYYY-MM-DD'), e.g. the next class days a kid could start on. */
export function DateStrip({ dates, value, onChange }: { dates: string[]; value: string | null; onChange: (iso: string) => void }) {
  const p = usePalette();
  const { lang, t } = useI18n();
  const locale = lang === 'ar' ? 'ar-KW' : 'en-GB';
  const todayIso = isoDate(new Date());

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 2 }}>
      {dates.map((iso) => {
        const d = new Date(iso + 'T00:00:00');
        const on = iso === value;
        return (
          <Pressable
            key={iso}
            onPress={() => onChange(iso)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={d.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long' })}
            style={({ pressed }) => ({
              width: 62,
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
            <View>
              <T size={11} color={on ? p.onInk : p.inkSoft} style={{ textAlign: 'center' }}>
                {d.toLocaleDateString(locale, { month: 'short' })}
              </T>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}
