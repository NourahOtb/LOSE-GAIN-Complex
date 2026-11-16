import { Barlow_300Light, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { ReadexPro_300Light, ReadexPro_400Regular, ReadexPro_600SemiBold, ReadexPro_700Bold } from '@expo-google-fonts/readex-pro';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Barlow_300Light,
    Barlow_400Regular,
    Barlow_500Medium,
    Barlow_600SemiBold,
    Barlow_700Bold,
    BarlowCondensed_500Medium,
    BarlowCondensed_700Bold,
    ReadexPro_300Light,
    ReadexPro_400Regular,
    ReadexPro_600SemiBold,
    ReadexPro_700Bold,
  });
  const p = usePalette();
  const scheme = useColorScheme();

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <LanguageProvider>
      <AuthProvider>
        <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />
      </AuthProvider>
    </LanguageProvider>
  );
}
