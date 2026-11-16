import { useColorScheme } from 'react-native';

// Lane Lines world: white tile, black lane-line ink, one accent per sport.
const light = {
  bg: '#FFFFFF',
  surface: '#FFFFFF',
  tile: '#E8F4F7', // pool tint
  ink: '#111111',
  inkSoft: '#666666',
  line: '#DDDDDD',
  onInk: '#FFFFFF',
  swim: '#1E7FA8',
  bjj: '#D2552B',
  danger: '#C8102E',
  dangerBg: '#FBEAEC',
  hintBg: '#FDF0EA',
  hintInk: '#7A2E12',
};

const dark: typeof light = {
  bg: '#0E0F10',
  surface: '#17191A',
  tile: '#12262E',
  ink: '#F2F2F0',
  inkSoft: '#A3A3A3',
  line: '#2C2F31',
  onInk: '#0E0F10',
  swim: '#4FB0D9',
  bjj: '#F0855C',
  danger: '#FF5A6E',
  dangerBg: '#3A1418',
  hintBg: '#3A2117',
  hintInk: '#F6C3AC',
};

export type Palette = typeof light;

export function usePalette(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

export const font = {
  light: 'Barlow_300Light',
  regular: 'Barlow_400Regular',
  medium: 'Barlow_500Medium',
  semibold: 'Barlow_600SemiBold',
  bold: 'Barlow_700Bold',
  cond: 'BarlowCondensed_700Bold',
  condMedium: 'BarlowCondensed_500Medium',
  // Arabic
  arLight: 'ReadexPro_300Light',
  ar: 'ReadexPro_400Regular',
  arSemibold: 'ReadexPro_600SemiBold',
  arBold: 'ReadexPro_700Bold',
};

export const sportColor = (p: Palette, sport: 'swimming' | 'jiujitsu') =>
  sport === 'swimming' ? p.swim : p.bjj;
