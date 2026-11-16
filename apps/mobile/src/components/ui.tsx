import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

type Weight = 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'cond' | 'condMedium';

/** Text that picks the right font for the language and follows the reading direction. */
export function T({ w = 'regular', size = 15, color, style, ...rest }: TextProps & { w?: Weight; size?: number; color?: string }) {
  const { f, isRTL } = useI18n();
  const p = usePalette();
  return (
    <Text
      {...rest}
      style={[
        { fontFamily: f[w], fontSize: size, color: color ?? p.ink, textAlign: isRTL ? 'right' : 'left', writingDirection: isRTL ? 'rtl' : 'ltr' },
        style,
      ]}
    />
  );
}

/** Small condensed caps label, e.g. "THIS WEEK". */
export function Label({ children, color, style }: { children: ReactNode; color?: string; style?: TextProps['style'] }) {
  const p = usePalette();
  const { isRTL } = useI18n();
  return (
    <T w="cond" size={12} color={color ?? p.inkSoft} style={[{ letterSpacing: isRTL ? 0 : 1.8, textTransform: 'uppercase' }, style]}>
      {children}
    </T>
  );
}

/** Page wrapper: safe area, background, and right-to-left layout for Arabic. */
export function Screen({ children, style, edges }: { children: ReactNode; style?: ViewStyle; edges?: ('top' | 'bottom')[] }) {
  const p = usePalette();
  const { isRTL } = useI18n();
  return (
    <SafeAreaView edges={edges ?? ['top', 'bottom']} style={{ flex: 1, backgroundColor: p.bg }}>
      <View style={[{ flex: 1, direction: isRTL ? 'rtl' : 'ltr', width: '100%', maxWidth: 520, alignSelf: 'center' }, style]}>
        {children}
      </View>
    </SafeAreaView>
  );
}

export function Button({
  title,
  onPress,
  variant = 'solid',
  loading,
  disabled,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: 'solid' | 'ghost' | 'link';
  loading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
}) {
  const p = usePalette();
  const off = disabled || loading;
  if (variant === 'link') {
    return (
      <Pressable onPress={onPress} hitSlop={10} accessibilityRole="button" style={style}>
        {({ pressed }) => (
          <T w="semibold" style={{ textDecorationLine: 'underline', opacity: pressed ? 0.6 : 1 }}>
            {title}
          </T>
        )}
      </Pressable>
    );
  }
  const solid = variant === 'solid';
  return (
    <Pressable
      onPress={onPress}
      disabled={off}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!off, busy: !!loading }}
      style={({ pressed }) => [
        styles.btn,
        {
          backgroundColor: solid ? p.ink : 'transparent',
          borderColor: p.ink,
          opacity: off ? 0.45 : pressed ? 0.8 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={solid ? p.onInk : p.ink} />
      ) : (
        <T w="semibold" size={16} color={solid ? p.onInk : p.ink} style={{ textAlign: 'center' }}>
          {title}
        </T>
      )}
    </Pressable>
  );
}

export function Field({ label, hint, ...props }: TextInputProps & { label: string; hint?: string }) {
  const p = usePalette();
  const { f, isRTL } = useI18n();
  return (
    <View style={{ gap: 6 }}>
      <T w="semibold" size={14}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={p.inkSoft}
        {...props}
        style={[
          styles.input,
          {
            borderColor: p.ink,
            color: p.ink,
            fontFamily: f.regular,
            textAlign: isRTL ? 'right' : 'left',
            backgroundColor: p.surface,
          },
        ]}
      />
      {hint ? (
        <T size={12} color={p.inkSoft}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  const p = usePalette();
  if (!children) return null;
  return (
    <View accessibilityLiveRegion="polite" style={{ backgroundColor: p.dangerBg, padding: 12, borderRadius: 4 }}>
      <T w="semibold" size={14} color={p.danger}>
        {children}
      </T>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    minHeight: 52,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  input: {
    borderWidth: 1.5,
    borderRadius: 6,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 50,
  },
});
