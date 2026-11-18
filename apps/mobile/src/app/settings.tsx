import { router } from 'expo-router';
import type { ComponentType, ReactNode } from 'react';
import { Pressable, ScrollView, View } from 'react-native';

import { CheckIcon, InfoIcon, MoonIcon, PhoneIcon, SunIcon } from '@/components/tab-icons';
import { Button, Label, Screen, T } from '@/components/ui';
import { useAppearance, type AppearanceChoice } from '@/lib/appearance';
import { useAuth } from '@/lib/auth';
import { useI18n } from '@/lib/i18n';
import type { Lang } from '@/lib/strings';
import { usePalette } from '@/lib/theme';

/** Settings: appearance, language, log out. */
export default function SettingsScreen() {
  const { t, lang, setLang } = useI18n();
  const { choice, setChoice } = useAppearance();
  const { signOut } = useAuth();
  const p = usePalette();

  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  const looks: { value: AppearanceChoice; label: string; Icon: ComponentType<{ color: string; size?: number }> }[] = [
    { value: 'light', label: t('appearance.light'), Icon: SunIcon },
    { value: 'dark', label: t('appearance.dark'), Icon: MoonIcon },
    { value: 'system', label: t('appearance.system'), Icon: PhoneIcon },
  ];
  const langs: { value: Lang; label: string }[] = [
    { value: 'en', label: 'English' },
    { value: 'ar', label: 'العربية' },
  ];

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }}>
        <Button variant="link" title={`${t('common.back')}`} onPress={back} style={{ alignSelf: 'flex-start' }} />
        <View style={{ gap: 8 }}>
          <T w="semibold" size={26}>
            {t('settings.title')}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flex: 1, height: 5, backgroundColor: p.ink }} />
            <View style={{ width: 5, height: 22, backgroundColor: p.ink, marginStart: 4 }} />
          </View>
        </View>

        <Group title={t('settings.appearance')}>
          {looks.map(({ value, label, Icon }, i) => (
            <Row key={value} label={label} on={choice === value} first={i === 0} onPress={() => setChoice(value)} icon={<Icon color={p.ink} size={20} />} />
          ))}
        </Group>

        <Group title={t('settings.language')}>
          {langs.map((l, i) => (
            <Row key={l.value} label={l.label} on={lang === l.value} first={i === 0} onPress={() => setLang(l.value)} />
          ))}
        </Group>

        <Group title={t('about.open')}>
          <Row label={t('about.open')} on={false} first onPress={() => router.push('/about')} icon={<InfoIcon color={p.ink} size={20} />} />
        </Group>

        <Pressable
          onPress={async () => {
            await signOut();
            router.replace('/');
          }}
          accessibilityRole="button"
          style={({ pressed }) => ({ minHeight: 48, justifyContent: 'center', opacity: pressed ? 0.6 : 1 })}>
          <T w="semibold" size={16} color={p.danger}>
            {t('auth.logout')}
          </T>
        </Pressable>
      </ScrollView>
    </Screen>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  const p = usePalette();
  return (
    <View style={{ gap: 8 }}>
      <Label>{title}</Label>
      <View accessibilityRole="radiogroup" style={{ borderWidth: 1, borderColor: p.line, borderRadius: 8, backgroundColor: p.surface, overflow: 'hidden' }}>
        {children}
      </View>
    </View>
  );
}

function Row({ label, on, first, onPress, icon }: { label: string; on: boolean; first: boolean; onPress: () => void; icon?: ReactNode }) {
  const p = usePalette();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({
        minHeight: 52,
        paddingHorizontal: 14,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        borderTopWidth: first ? 0 : 1,
        borderTopColor: p.line,
        backgroundColor: pressed ? p.tile : 'transparent',
      })}>
      {icon}
      <T w={on ? 'semibold' : 'regular'} size={16} style={{ flex: 1 }}>
        {label}
      </T>
      {on ? <CheckIcon color={p.ink} size={20} /> : null}
    </Pressable>
  );
}
