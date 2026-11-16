import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { Logo } from '@/components/logo';
import { Screen, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/strings';
import { font, usePalette } from '@/lib/theme';

/** First screen: pick Arabic or English. Shown in both languages at once. */
export default function LanguageScreen() {
  const { setLang } = useI18n();
  const p = usePalette();

  const choose = async (l: Lang) => {
    await setLang(l);
    router.replace('/');
  };

  return (
    <Screen style={{ paddingHorizontal: 24, justifyContent: 'space-between', paddingVertical: 24 }}>
      <View style={{ paddingTop: 24 }}>
        <Logo size={26} />
      </View>

      <View style={{ gap: 10 }}>
        {/* the pool lane under the question */}
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
          <View style={{ flex: 1, height: 5, backgroundColor: p.ink }} />
          <View style={{ width: 5, height: 24, backgroundColor: p.ink, marginLeft: 4 }} />
        </View>
        <T w="semibold" size={26} style={{ textAlign: 'left' }}>
          Choose your language
        </T>
        <T size={26} style={{ fontFamily: font.arSemibold, textAlign: 'left', marginBottom: 20 }}>
          اختر لغتك
        </T>

        <LangButton label="العربية" sub="Arabic" fontFamily={font.arSemibold} onPress={() => choose('ar')} />
        <LangButton label="English" sub="الإنجليزية" fontFamily={font.semibold} onPress={() => choose('en')} />
      </View>

      <T size={12} color={p.inkSoft} style={{ textAlign: 'left' }}>
        Swimming · Jiu-jitsu · Mansouriya
      </T>
    </Screen>
  );
}

function LangButton({ label, sub, fontFamily, onPress }: { label: string; sub: string; fontFamily: string; onPress: () => void }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${label}, ${sub}`}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderWidth: 1.5,
        borderColor: p.ink,
        borderRadius: 6,
        paddingHorizontal: 18,
        minHeight: 64,
        backgroundColor: pressed ? p.ink : p.surface,
      })}>
      {({ pressed }) => (
        <>
          <T size={22} color={pressed ? p.onInk : p.ink} style={{ fontFamily }}>
            {label}
          </T>
          <T size={13} color={pressed ? p.onInk : p.inkSoft}>
            {sub}
          </T>
        </>
      )}
    </Pressable>
  );
}
