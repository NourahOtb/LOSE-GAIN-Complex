import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const APP_SITE = 'https://lg-complex-app.vercel.app';

/** What our server learned from UPayments. */
export type PayStatus = 'paid' | 'not_paid' | 'pending' | 'none' | 'unknown';

/** Problems before the payment page even opens. */
export type StartError = 'provider_unavailable' | 'payment_link_failed' | 'not_waiting_for_payment';

export type StartResult =
  | { kind: 'redirected' } // website: the page is moving to UPayments
  | { kind: 'returned'; status: PayStatus } // phone: the payment browser was closed; we checked the result
  | { kind: 'error'; error: StartError };

async function call<T>(name: string, body: object): Promise<T | null> {
  const { data, error } = await supabase.functions.invoke(`upayments/${name}`, { body });
  if (error) {
    // the function answers errors as JSON; surface its code when present
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') return (await ctx.json()) as T;
    } catch {
      // fall through
    }
    return null;
  }
  return data as T;
}

/**
 * Ask our server for a UPayments link for this registration and open it.
 * The server checks ownership and takes the price from the database.
 */
export async function startOnlinePayment(subscriptionId: string, lang: 'ar' | 'en'): Promise<StartResult> {
  const returnBase = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : APP_SITE;
  const res = await call<{ link?: string; error?: StartError }>('create', { subscription_id: subscriptionId, lang, return_base: returnBase });
  if (!res?.link) return { kind: 'error', error: res?.error ?? 'payment_link_failed' };

  if (Platform.OS === 'web') {
    window.location.assign(res.link); // UPayments sends the parent back to /payment-result
    return { kind: 'redirected' };
  }
  // phone: in-app browser; when the parent closes it (Done / back), check what happened
  await WebBrowser.openBrowserAsync(res.link, { dismissButtonStyle: 'close' });
  return { kind: 'returned', status: await checkPayment(subscriptionId) };
}

/** After returning from UPayments with a track_id: verify with UPayments through our server. */
export async function confirmPayment(trackId: string): Promise<PayStatus> {
  const res = await call<{ status?: PayStatus }>('confirm', { track_id: trackId });
  return res?.status ?? 'unknown';
}

/** Check the latest online payment attempt of a registration (works even if the parent never came back). */
export async function checkPayment(subscriptionId: string): Promise<PayStatus> {
  const res = await call<{ status?: PayStatus }>('status', { subscription_id: subscriptionId });
  return res?.status ?? 'unknown';
}
