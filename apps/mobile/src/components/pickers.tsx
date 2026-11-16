import { Pressable, View } from 'react-native';

import { T } from '@/components/ui';
import { usePalette } from '@/lib/theme';

/** Row of equal buttons, one selected (black). */
export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; label: string; disabled?: boolean }[];
  value: V | null;
  onChange: (v: V) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: p.ink, borderRadius: 6, overflow: 'hidden' }}>
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            disabled={o.disabled}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on, disabled: o.disabled }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 46,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 4,
              backgroundColor: on ? p.ink : pressed ? p.tile : p.surface,
              borderStartWidth: i === 0 ? 0 : 1.5,
              borderColor: p.ink,
              opacity: o.disabled ? 0.4 : 1,
            })}>
            <T w="semibold" size={14} color={on ? p.onInk : p.ink} style={{ textAlign: 'center' }}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Sat–Thu day picker; free choice, with small dots marking recommended days. */
export function DayPicker<D extends string>({
  days,
  selected,
  onToggle,
  recommended = [],
  accent,
  labelFor,
}: {
  days: readonly D[];
  selected: D[];
  onToggle: (d: D) => void;
  recommended?: D[];
  accent: string;
  labelFor: (d: D) => string;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 6 }}>
      {days.map((d) => {
        const on = selected.includes(d);
        const rec = recommended.includes(d);
        return (
          <Pressable
            key={d}
            onPress={() => onToggle(d)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 48,
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
              borderWidth: 1.5,
              borderColor: on ? p.ink : p.line,
              backgroundColor: on ? p.ink : pressed ? p.tile : p.surface,
            })}>
            <T w="semibold" size={13} color={on ? p.onInk : p.ink} style={{ textAlign: 'center' }}>
              {labelFor(d)}
            </T>
            {rec ? (
              <View style={{ position: 'absolute', top: 5, end: 5, width: 5, height: 5, borderRadius: 3, backgroundColor: on ? p.onInk : accent }} />
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}
