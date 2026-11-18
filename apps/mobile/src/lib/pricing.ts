import { DEFAULT_PRICING, pricingFrom, type PricingConfig } from '@lg/shared';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

// the owner's saved prices (Dashboard → Prices). The server checks every price again when registering.
let cached: PricingConfig | null = null;

export async function loadPricing(): Promise<PricingConfig> {
  const { data } = await supabase.from('pricing').select('config').eq('id', 1).maybeSingle();
  cached = pricingFrom(data?.config);
  return cached;
}

/** Saved prices; the built-in ones until they load (refreshed each time a screen using it opens). */
export function usePricing(): PricingConfig {
  const [cfg, setCfg] = useState<PricingConfig>(cached ?? DEFAULT_PRICING);
  useEffect(() => {
    loadPricing()
      .then(setCfg)
      .catch(() => {});
  }, []);
  return cfg;
}

/** "40" / "42.500" (Arabic digits in Arabic) for short price mentions in text. */
export function shortKD(n: number, lang: 'ar' | 'en' | null | undefined) {
  const s = Number.isInteger(n) ? String(n) : n.toFixed(3);
  return lang === 'ar' ? s.replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[Number(d)]).replace('.', '٫') : s;
}
