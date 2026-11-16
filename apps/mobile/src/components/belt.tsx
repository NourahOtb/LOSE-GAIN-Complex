import { View } from 'react-native';

import { beltColors, type Belt } from '@/lib/data';
import { usePalette } from '@/lib/theme';

/** A kid's jiu-jitsu belt: real colours, black rank bar with white tape stripes (max 4). */
export function BeltBar({ belt, stripes, height = 26, width }: { belt: Belt; stripes: number; height?: number; width?: number }) {
  const p = usePalette();
  const { main, centre } = beltColors(belt);
  const tape = Math.max(3, Math.round(height * 0.3));
  const gap = Math.max(2, Math.round(height * 0.3));
  return (
    <View
      accessibilityLabel={`${belt.replace('_', ' ')} belt, ${stripes} stripes`}
      style={{
        // a belt reads the same way in both languages
        direction: 'ltr',
        flexDirection: 'row',
        height,
        width,
        borderRadius: 3,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: p.inkSoft,
      }}>
      <View style={{ flex: 1, backgroundColor: main, justifyContent: 'center' }}>
        <View style={{ height: '32%', backgroundColor: centre }} />
      </View>
      <View style={{ width: height * 3.6, backgroundColor: '#111111', flexDirection: 'row', justifyContent: 'flex-end', gap, paddingRight: gap * 1.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <View key={i} style={{ width: tape, backgroundColor: i < stripes ? '#FFFFFF' : '#3A3A3A' }} />
        ))}
      </View>
    </View>
  );
}
