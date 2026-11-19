import { Barlow_300Light, Barlow_400Regular, Barlow_500Medium, Barlow_600SemiBold, Barlow_700Bold } from '@expo-google-fonts/barlow';
import { BarlowCondensed_500Medium, BarlowCondensed_700Bold } from '@expo-google-fonts/barlow-condensed';
import { ReadexPro_300Light, ReadexPro_400Regular, ReadexPro_600SemiBold, ReadexPro_700Bold } from '@expo-google-fonts/readex-pro';
import { useFonts } from 'expo-font';
import { Stack, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Pressable, Text, View } from 'react-native';

import { AppearanceProvider, useAppearance } from '@/lib/appearance';
import { AuthProvider } from '@/lib/auth';
import { LanguageProvider } from '@/lib/i18n';
import { NotificationsProvider } from '@/lib/notifications';
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
  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <AppearanceProvider>
      <LanguageProvider>
        <AuthProvider>
          <NotificationsProvider>
            <Shell />
          </NotificationsProvider>
        </AuthProvider>
      </LanguageProvider>
    </AppearanceProvider>
  );
}

function Shell() {
  const p = usePalette();
  const { scheme } = useAppearance();
  return (
    <>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: p.bg } }} />
    </>
  );
}

/**
 * If a screen crashes, show what happened instead of a blank white page, with a way out.
 * Plain colours and no app hooks: this must work even when the app's own providers failed.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const reload = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') window.location.assign('/');
    else retry();
  };
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 14, backgroundColor: '#FFFFFF' }}>
      <Text style={{ fontSize: 20, fontWeight: '700', color: '#111111', textAlign: 'center' }}>Something went wrong · حدث خطأ</Text>
      <Text style={{ fontSize: 13, color: '#C8102E', textAlign: 'center' }} selectable>
        {error.message}
      </Text>
      <Pressable onPress={reload} accessibilityRole="button" style={{ backgroundColor: '#111111', borderRadius: 6, paddingVertical: 14, paddingHorizontal: 28 }}>
        <Text style={{ color: '#FFFFFF', fontWeight: '600', fontSize: 16 }}>Reload · إعادة التحميل</Text>
      </Pressable>
    </View>
  );
}
