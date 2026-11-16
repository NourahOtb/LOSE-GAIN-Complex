import { Text, View } from 'react-native';

import { font, usePalette } from '@/lib/theme';

/** LOSE | GAIN lockup with widely spaced COMPLEX, drawn in type so it stays sharp in light and dark. */
export function Logo({ size = 17, complex = true, color }: { size?: number; complex?: boolean; color?: string }) {
  const p = usePalette();
  const c = color ?? p.ink;
  return (
    // the logo is a mark, never mirrored in Arabic
    <View style={{ alignItems: 'center', alignSelf: 'flex-start', direction: 'ltr' }} accessibilityRole="image" accessibilityLabel="LOSE | GAIN Complex">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.42 }}>
        <Text style={{ fontFamily: font.light, fontSize: size, color: c, letterSpacing: size * 0.02 }}>LOSE</Text>
        <View style={{ width: 1, height: size * 1.15, backgroundColor: c }} />
        <Text style={{ fontFamily: font.bold, fontSize: size, color: c, letterSpacing: size * 0.02 }}>GAIN</Text>
      </View>
      {complex ? (
        <Text style={{ fontFamily: font.regular, fontSize: size * 0.42, color: c, letterSpacing: size * 0.44, marginTop: 2, marginLeft: size * 0.44 }}>
          COMPLEX
        </Text>
      ) : null}
    </View>
  );
}
