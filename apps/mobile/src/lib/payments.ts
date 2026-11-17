import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { supabase } from './supabase';

const APP_SITE = 'https://lg-complex-app.vercel.app';

/**
 * Ask our server for a UPayments link for this registration and open it.
 * The server checks ownership and takes the price from the database.
 * Returns an error code, or null when the payment page was opened.
 */
export async function startOnlinePayment(subscriptionId: string, lang: 'ar' | 'en'): Promise<string | null> {
  const returnBase = Platform.OS === 'web' && typeof window !== 'undefined' ? window.location.origin : APP_SITE;
  const { data, error } = await supabase.functions.invoke('upayments/create', {
    body: { subscription_id: subscriptionId, lang, return_base: returnBase },
  });
  const link = (data as { link?: string } | null)?.link;
  if (error || !link) return 'payment_link_failed';

  if (Platform.OS === 'web') {
    window.location.assign(link); // comes back to /payment-result
  } else {
    // phone: UPayments page in an in-app browser; the server webhook activates the subscription
    await WebBrowser.openBrowserAsync(link);
  }
  return null;
}

/** After returning from UPayments: ask our server to verify the payment with UPayments. */
export async function confirmPayment(trackId: string): Promise<'paid' | 'not_paid' | 'unknown'> {
  const { data, error } = await supabase.functions.invoke('upayments/confirm', { body: { track_id: trackId } });
  if (error) return 'unknown';
  const status = (data as { status?: string } | null)?.status;
  return status === 'paid' ? 'paid' : status === 'not_paid' ? 'not_paid' : 'unknown';
}
