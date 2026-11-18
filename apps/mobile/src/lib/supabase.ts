import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  throw new Error('Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example)');
}

// Static web export renders on the server once, where there is no storage.
const isServer = Platform.OS === 'web' && typeof window === 'undefined';

export const supabase = createClient(url, key, {
  auth: {
    storage: isServer ? undefined : AsyncStorage,
    autoRefreshToken: !isServer,
    persistSession: !isServer,
    detectSessionInUrl: false,
  },
});

export type Role = 'parent' | 'coach' | 'super_admin' | 'manager' | 'receptionist' | 'accountant';

export type Profile = {
  id: string;
  full_name: string;
  phone: string | null;
  role: Role;
  sport: 'swimming' | 'jiujitsu' | null;
  preferred_language: 'ar' | 'en';
  is_active: boolean;
  account_type: 'family' | 'single';
  relationship: Relationship | null;
  /** logged in with a temporary password from reception: must choose their own */
  must_change_password: boolean;
};

export const RELATIONSHIPS = ['father', 'mother', 'grandfather', 'grandmother', 'brother', 'sister', 'uncle', 'aunt', 'guardian'] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];
