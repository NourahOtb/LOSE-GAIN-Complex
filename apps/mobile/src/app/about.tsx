import { router } from 'expo-router';
import { Linking, ScrollView, View } from 'react-native';

import { PinIcon } from '@/components/tab-icons';
import { Button, Label, Screen, T } from '@/components/ui';
import { ABOUT, MAPS_URL } from '@/lib/about';
import { useI18n } from '@/lib/i18n';
import { usePalette } from '@/lib/theme';

/** About the complex: sports, classes, hours, open pool, location. Open to everyone (no log-in needed). */
export default function AboutScreen() {
  const { t, lang } = useI18n();
  const p = usePalette();
  const c = ABOUT[lang ?? 'en'];
  const back = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 48, maxWidth: 640, width: '100%', alignSelf: 'center' }}>
        <Button variant="link" title={t('common.back')} onPress={back} style={{ alignSelf: 'flex-start' }} />

        <View style={{ gap: 6 }}>
          {/* the brand name stays left-to-right in Arabic too */}
          <T w="semibold" size={28} style={{ writingDirection: 'ltr' }}>
            {c.name}
          </T>
          <T size={16}>{c.tagline}</T>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8 }}>
            <View style={{ flex: 1, height: 5, backgroundColor: p.ink }} />
            <View style={{ width: 5, height: 22, backgroundColor: p.ink, marginStart: 4 }} />
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 10 }}>
          {[
            { s: c.swimming, color: p.swim },
            { s: c.jiujitsu, color: p.bjj },
          ].map(({ s, color }) => (
            <View key={s.name} style={{ flex: 1, borderTopWidth: 3, borderTopColor: color, backgroundColor: p.tile, padding: 12, gap: 6 }}>
              <T w="semibold" size={17} color={color}>
                {s.name}
              </T>
              <T size={13} w="semibold">
                {s.place}
              </T>
              {s.lines.map((l) => (
                <T key={l} size={13} color={p.inkSoft} style={{ lineHeight: 18 }}>
                  {l}
                </T>
              ))}
            </View>
          ))}
        </View>

        {c.sections.map((sec) => (
          <View key={sec.title} style={{ gap: 8 }}>
            <Label>{sec.title}</Label>
            <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: 8, backgroundColor: p.surface }}>
              {sec.lines.map((l, i) => (
                <T key={l} size={15} style={{ paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: i ? 1 : 0, borderTopColor: p.line, lineHeight: 21 }}>
                  {l}
                </T>
              ))}
            </View>
            {sec.note ? (
              <T size={13} color={p.inkSoft} style={{ lineHeight: 18 }}>
                {sec.note}
              </T>
            ) : null}
          </View>
        ))}

        <View style={{ gap: 8 }}>
          <Label>{t('about.location')}</Label>
          <View style={{ borderWidth: 1, borderColor: p.line, borderRadius: 8, backgroundColor: p.surface, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <PinIcon color={p.swim} size={22} />
            <T size={16} w="semibold" style={{ flex: 1 }}>
              {c.location}
            </T>
          </View>
          <Button title={t('about.directions')} onPress={() => Linking.openURL(MAPS_URL)} />
        </View>
      </ScrollView>
    </Screen>
  );
}
