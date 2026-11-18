import { useState } from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';

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

/** Dropdown: a field that opens a list to pick one option. */
export function Select<V extends string>({
  label,
  placeholder,
  options,
  value,
  onChange,
}: {
  label: string;
  placeholder: string;
  options: { value: V; label: string }[];
  value: V | null;
  onChange: (v: V) => void;
}) {
  const p = usePalette();
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value);
  return (
    <View style={{ gap: 6 }}>
      <T w="semibold" size={14}>
        {label}
      </T>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${current?.label ?? placeholder}`}
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
        <T size={16} color={current ? p.ink : p.inkSoft}>
          {current?.label ?? placeholder}
        </T>
        <T size={14} color={p.inkSoft}>
          ▾
        </T>
      </Pressable>
      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable onPress={() => setOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 24 }}>
          <Pressable onPress={() => {}} style={{ backgroundColor: p.bg, borderRadius: 8, maxHeight: '80%', maxWidth: 420, width: '100%', alignSelf: 'center', overflow: 'hidden' }}>
            <View style={{ padding: 16, borderBottomWidth: 2, borderBottomColor: p.ink }}>
              <T w="semibold" size={17}>
                {label}
              </T>
            </View>
            <ScrollView>
              {options.map((o) => {
                const on = o.value === value;
                return (
                  <Pressable
                    key={o.value}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: on }}
                    onPress={() => {
                      onChange(o.value);
                      setOpen(false);
                    }}
                    style={({ pressed }) => ({
                      minHeight: 50,
                      paddingHorizontal: 16,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottomWidth: 1,
                      borderBottomColor: p.line,
                      backgroundColor: pressed ? p.tile : 'transparent',
                    })}>
                    <T w={on ? 'semibold' : 'regular'} size={16}>
                      {o.label}
                    </T>
                    {on ? <T w="semibold">✓</T> : null}
                  </Pressable>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

/** Big tappable cards with a title and a short line, one selected. */
export function ChoiceCards<V extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: V; title: string; sub: string }[];
  value: V | null;
  onChange: (v: V) => void;
}) {
  const p = usePalette();
  return (
    <View style={{ flexDirection: 'row', gap: 10 }}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            style={({ pressed }) => ({
              flex: 1,
              minHeight: 84,
              borderWidth: 1.5,
              borderColor: on ? p.ink : p.line,
              backgroundColor: on ? p.ink : pressed ? p.tile : p.surface,
              borderRadius: 6,
              padding: 14,
              gap: 4,
              justifyContent: 'center',
            })}>
            <T w="semibold" size={17} color={on ? p.onInk : p.ink}>
              {o.title}
            </T>
            <T size={13} color={on ? p.onInk : p.inkSoft}>
              {o.sub}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}
