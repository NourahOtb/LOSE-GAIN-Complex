import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

import { T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  ar: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
};
const WEEK = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ar: ['أحد', 'إثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت'] };

const pad = (n: number) => String(n).padStart(2, '0');
const daysIn = (y: number, m: number) => new Date(y, m + 1, 0).getDate(); // m: 0–11

type Step = 'year' | 'month' | 'day';

/**
 * Date of birth as a calendar: choose the year, then the month, then tap the day.
 * Value is ISO "YYYY-MM-DD" (or '' when not chosen). Years run newest first, from maxYear down to minYear.
 */
export function DateField({
  label,
  value,
  onChange,
  minYear,
  maxYear,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  minYear: number;
  maxYear: number;
  placeholder: string;
}) {
  const p = usePalette();
  const { lang, t } = useI18n();
  const L = lang === 'ar' ? 'ar' : 'en';
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('year');
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);

  const [vy, vm, vd] = value ? value.split('-').map(Number) : [0, 0, 0];
  const shown = value ? `${vd} ${MONTHS[L][vm - 1]} ${vy}` : null;

  const start = () => {
    // reopening keeps the chosen date so a small fix (wrong day) is one tap
    if (value) {
      setYear(vy);
      setMonth(vm - 1);
      setStep('day');
    } else {
      setYear(null);
      setMonth(null);
      setStep('year');
    }
    setOpen(true);
  };

  const years: number[] = [];
  for (let y = maxYear; y >= minYear; y--) years.push(y);

  const cell = (on: boolean) => ({ pressed }: { pressed: boolean }) => ({
    minHeight: 46,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: on ? p.ink : p.line,
    backgroundColor: on ? p.ink : pressed ? p.tile : p.surface,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  });

  const crumb = (text: string, to: Step) => (
    <Pressable onPress={() => setStep(to)} accessibilityRole="button" hitSlop={8} style={{ paddingVertical: 4, paddingHorizontal: 2 }}>
      <T w="semibold" size={16} style={{ textDecorationLine: 'underline' }}>
        {text}
      </T>
    </Pressable>
  );

  let body = null;
  if (step === 'year') {
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {years.map((y) => (
          <Pressable
            key={y}
            accessibilityRole="button"
            onPress={() => {
              setYear(y);
              setStep('month');
            }}
            style={(s) => [cell(y === year)(s), { width: '22%' }]}>
            <T w="semibold" size={15} color={y === year ? p.onInk : p.ink}>
              {y}
            </T>
          </Pressable>
        ))}
      </View>
    );
  } else if (step === 'month' && year !== null) {
    body = (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {MONTHS[L].map((m, i) => (
          <Pressable
            key={m}
            accessibilityRole="button"
            onPress={() => {
              setMonth(i);
              setStep('day');
            }}
            style={(s) => [cell(i === month)(s), { width: '31%' }]}>
            <T w="semibold" size={15} color={i === month ? p.onInk : p.ink}>
              {m}
            </T>
          </Pressable>
        ))}
      </View>
    );
  } else if (year !== null && month !== null) {
    const first = new Date(year, month, 1).getDay(); // 0 = Sunday
    const n = daysIn(year, month);
    const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => i + 1)];
    while (cells.length % 7) cells.push(null);
    const chosen = (d: number) => vy === year && vm === month + 1 && vd === d;
    body = (
      <View style={{ gap: 6 }}>
        <View style={{ flexDirection: 'row' }}>
          {WEEK[L].map((w) => (
            <T key={w} size={12} color={p.inkSoft} style={{ flex: 1, textAlign: 'center' }}>
              {w}
            </T>
          ))}
        </View>
        {Array.from({ length: cells.length / 7 }, (_, r) => (
          <View key={r} style={{ flexDirection: 'row', gap: 4 }}>
            {cells.slice(r * 7, r * 7 + 7).map((d, i) =>
              d === null ? (
                <View key={i} style={{ flex: 1 }} />
              ) : (
                <Pressable
                  key={i}
                  accessibilityRole="button"
                  accessibilityLabel={`${d} ${MONTHS[L][month]} ${year}`}
                  onPress={() => {
                    onChange(`${year}-${pad(month + 1)}-${pad(d)}`);
                    setOpen(false);
                  }}
                  style={(s) => [cell(chosen(d))(s), { flex: 1, minHeight: 42 }]}>
                  <T w="semibold" size={15} color={chosen(d) ? p.onInk : p.ink}>
                    {d}
                  </T>
                </Pressable>
              ),
            )}
          </View>
        ))}
      </View>
    );
  }

  const title = step === 'year' ? t('date.pickYear') : step === 'month' ? t('date.pickMonth') : t('date.pickDay');

  return (
    <View style={{ gap: 6 }}>
      <T w="semibold" size={14}>
        {label}
      </T>
      <Pressable
        onPress={start}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${shown ?? placeholder}`}
        style={({ pressed }) => ({
          minHeight: 50,
          borderWidth: 1.5,
          borderColor: p.ink,
          borderRadius: 6,
          paddingHorizontal: 14,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          backgroundColor: pressed ? p.tile : p.surface,
        })}>
        <T size={16} color={shown ? p.ink : p.inkSoft}>
          {shown ?? placeholder}
        </T>
        <T size={16} color={p.inkSoft}>
          📅
        </T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: p.bg, borderRadius: 8, maxHeight: '85%', maxWidth: 420, width: '100%', alignSelf: 'center', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 2, borderBottomColor: p.ink, gap: 6 }}>
              <T w="semibold" size={17}>
                {label}
              </T>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {year !== null && step !== 'year' ? crumb(String(year), 'year') : null}
                {month !== null && step === 'day' ? (
                  <>
                    <T color={p.inkSoft}>›</T>
                    {crumb(MONTHS[L][month], 'month')}
                  </>
                ) : null}
                <T color={p.inkSoft}>{title}</T>
              </View>
            </View>
            <ScrollView contentContainerStyle={{ padding: 16 }}>{body}</ScrollView>
            <Pressable onPress={() => setOpen(false)} accessibilityRole="button" style={{ padding: 14, alignItems: 'center', borderTopWidth: 1, borderTopColor: p.line }}>
              <T w="semibold">{t('common.cancel')}</T>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
