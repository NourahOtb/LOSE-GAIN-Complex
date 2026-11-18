import { Pressable, View } from 'react-native';

import { MoonIcon, SunIcon } from '@/components/tab-icons';
import { useAppearance } from '@/lib/appearance';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** Small sun / moon switch for the log-in and sign-up screens. */
export function ThemeSwitch() {
  const { scheme, setChoice } = useAppearance();
  const { t } = useI18n();
  const p = usePalette();
  const opts = [
    { value: 'light' as const, label: t('appearance.light'), Icon: SunIcon },
    { value: 'dark' as const, label: t('appearance.dark'), Icon: MoonIcon },
  ];
  return (
    <View accessibilityRole="radiogroup" style={{ flexDirection: 'row', borderWidth: 1.5, borderColor: p.ink, borderRadius: 6, overflow: 'hidden' }}>
      {opts.map(({ value, label, Icon }) => {
        const on = scheme === value;
        return (
          <Pressable
            key={value}
            onPress={() => setChoice(value)}
            accessibilityRole="radio"
            accessibilityLabel={label}
            accessibilityState={{ checked: on }}
            hitSlop={4}
            style={{ width: 40, height: 34, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? p.ink : 'transparent' }}>
            <Icon color={on ? p.onInk : p.ink} size={18} />
          </Pressable>
        );
      })}
    </View>
  );
}
