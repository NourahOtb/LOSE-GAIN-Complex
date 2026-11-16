import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform } from 'react-native';

import { font } from './theme';
import { strings, type Lang, type StringKey } from './strings';

const KEY = 'lg.language';

type I18n = {
  lang: Lang | null; // null = not chosen yet (show the language screen)
  ready: boolean;
  isRTL: boolean;
  setLang: (l: Lang) => Promise<void>;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
  f: typeof font; // fonts for the current language
};

const Ctx = createContext<I18n | null>(null);

const arFonts: typeof font = {
  ...font,
  light: font.arLight,
  regular: font.ar,
  medium: font.ar,
  semibold: font.arSemibold,
  bold: font.arBold,
  cond: font.arBold,
  condMedium: font.arSemibold,
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => setLangState(v === 'ar' || v === 'en' ? v : null))
      .catch(() => setLangState(null))
      .finally(() => setReady(true));
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined' && lang) {
      document.documentElement.lang = lang;
      document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
    }
  }, [lang]);

  const setLang = useCallback(async (l: Lang) => {
    setLangState(l);
    try {
      await AsyncStorage.setItem(KEY, l);
    } catch {
      // storage unavailable (private browsing): the choice still applies for this visit
    }
  }, []);

  const value = useMemo<I18n>(() => {
    const active: Lang = lang ?? 'en';
    return {
      lang,
      ready,
      isRTL: active === 'ar',
      setLang,
      f: active === 'ar' ? arFonts : font,
      t: (key, vars) => {
        let s: string = strings[active][key] ?? strings.en[key];
        if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace(`{${k}}`, String(v));
        return s;
      },
    };
  }, [lang, ready, setLang]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useI18n outside LanguageProvider');
  return v;
}
