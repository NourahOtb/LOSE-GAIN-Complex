import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

import { supabase, type Profile } from './supabase';

type Auth = {
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  /** the account details could not be loaded (network or server problem): screens show it with Try again */
  profileError: boolean;
  /** right after logging in: use the session the log-in returned (no second session lookup) */
  signedIn: (s: Session) => Promise<void>;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [profileError, setProfileError] = useState(false);
  // several loads can run at once (log-in, auth events, app start). Only the newest one may set the profile,
  // so an older, slower answer (for example the previous account's) can never overwrite it.
  const seq = useRef(0);

  const loadProfile = useCallback(async (s: Session | null) => {
    const mine = ++seq.current;
    if (!s) {
      setProfile(null);
      setProfileError(false);
      return;
    }
    // keep a profile that already belongs to this user while reloading; drop another user's at once
    setProfile((cur) => (cur && cur.id === s.user.id ? cur : null));
    setProfileError(false);
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', s.user.id).maybeSingle();
      if (mine !== seq.current) return;
      if (error || !data) {
        console.warn('[auth] profile not loaded', error?.message ?? 'no row');
        setProfileError(true);
        return;
      }
      setProfile(data as Profile);
    } catch (e) {
      if (mine !== seq.current) return;
      console.warn('[auth] profile load failed', e instanceof Error ? e.message : String(e));
      setProfileError(true);
    }
  }, []);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(async ({ data }) => {
        setSession(data.session);
        await loadProfile(data.session);
      })
      .finally(() => setLoading(false));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      // token refreshes keep the same user: no reload needed. Defer: don't call Supabase inside the auth callback.
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') setTimeout(() => loadProfile(s), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const value: Auth = {
    session,
    profile,
    loading,
    profileError,
    signedIn: async (s) => {
      setSession(s);
      await loadProfile(s);
    },
    refreshProfile: async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await loadProfile(data.session);
    },
    signOut: async () => {
      await supabase.auth.signOut();
      seq.current++;
      setProfile(null);
      setProfileError(false);
    },
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const v = useContext(Ctx);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}
