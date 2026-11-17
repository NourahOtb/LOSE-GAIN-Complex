import { Tabs } from 'expo-router';
import type { ComponentType } from 'react';
import { Platform } from 'react-native';

import { useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { usePalette } from '@/lib/theme';

export type TabDef = { name: string; label: StringKey; Icon: ComponentType<{ color: string; size?: number }>; badge?: number };

/** Bottom tab bar in the Lane Lines style: hairline top rule, condensed caps labels. */
export function RoleTabs({ tabs }: { tabs: TabDef[] }) {
  const p = usePalette();
  const { t, f, isRTL } = useI18n();
  // On the web the page's dir="rtl" already mirrors the bar; on phones we mirror it ourselves.
  const ordered = isRTL && Platform.OS !== 'web' ? [...tabs].reverse() : tabs;
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: p.ink,
        tabBarInactiveTintColor: p.inkSoft,
        tabBarStyle: { backgroundColor: p.bg, borderTopColor: p.line, height: 84, paddingTop: 8 },
        tabBarLabelStyle: { fontFamily: f.cond, fontSize: 12, letterSpacing: isRTL ? 0 : 1.2, textTransform: 'uppercase' },
        sceneStyle: { backgroundColor: p.bg },
      }}>
      {ordered.map(({ name, label, Icon, badge }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(label),
            tabBarIcon: ({ color }) => <Icon color={String(color)} />,
            tabBarBadge: badge ? badge : undefined,
            tabBarBadgeStyle: { backgroundColor: p.danger, color: '#FFFFFF', fontFamily: f.semibold, fontSize: 11 },
          }}
        />
      ))}
    </Tabs>
  );
}
