import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { Platform, useColorScheme } from 'react-native';

// Light / dark choice, remembered on this phone or browser (also after logging out).
// "system" = same as the phone's own setting (the default until the member chooses).
export type AppearanceChoice = 'light' | 'dark' | 'system';

const KEY = 'lg.appearance';

type Appearance = {
  choice: AppearanceChoice;
  scheme: 'light' | 'dark'; // what is shown right now
  setChoice: (c: AppearanceChoice) => void;
};

const Ctx = createContext<Appearance | null>(null);

export function AppearanceProvider({ children }: { children: ReactNode }) {
  const phone = useColorScheme();
  const [choice, setChoiceState] = useState<AppearanceChoice>('system');

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((v) => {
        if (v === 'light' || v === 'dark' || v === 'system') setChoiceState(v);
      })
      .catch(() => {});
  }, []);

  const scheme: 'light' | 'dark' = choice === 'system' ? (phone === 'dark' ? 'dark' : 'light') : choice;

  // website: let the browser draw form controls and scrollbars in the same mode
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.documentElement.style.colorScheme = scheme;
  }, [scheme]);

  const setChoice = useCallback((c: AppearanceChoice) => {
    setChoiceState(c);
    AsyncStorage.setItem(KEY, c).catch(() => {
      // storage unavailable (private browsing): the choice still applies for this visit
    });
  }, []);

  const value = useMemo(() => ({ choice, scheme, setChoice }), [choice, scheme, setChoice]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAppearance() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAppearance outside AppearanceProvider');
  return v;
}
