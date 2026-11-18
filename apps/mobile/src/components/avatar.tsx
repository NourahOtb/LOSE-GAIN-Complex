import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { Button, ErrorText, T } from '@/components/ui';
import { useI18n } from '@/lib/i18n';
import { pickPhoto, usePhotoUrls } from '@/lib/photos';
import { usePalette } from '@/lib/theme';

/** Round member photo, or their initials on the pool tint when there's no photo. */
export function Avatar({ name, url, size = 44 }: { name: string; url?: string | null; size?: number }) {
  const p = usePalette();
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', backgroundColor: p.tile, alignItems: 'center', justifyContent: 'center' }}>
      {url ? (
        <Image source={{ uri: url }} style={{ width: size, height: size }} contentFit="cover" transition={150} />
      ) : (
        <T w="semibold" size={size * 0.36} color={p.swim}>
          {initials}
        </T>
      )}
    </View>
  );
}

/** Photo preview + "Take a photo" / "Choose from library" (+ "Remove"). */
export function PhotoField({
  name,
  uri,
  currentUrl,
  onChange,
}: {
  name: string;
  uri: string | null;
  /** the photo already saved, shown until a new one is picked */
  currentUrl?: string | null;
  onChange: (uri: string | null) => void;
}) {
  const { t } = useI18n();
  const p = usePalette();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);

  const pick = async (source: 'camera' | 'library') => {
    setError('');
    setBusy(source);
    try {
      const r = await pickPhoto(source);
      if (r.kind === 'ok') onChange(r.uri);
      if (r.kind === 'denied') setError(t('photo.denied'));
    } catch {
      setError(t('photo.failed'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Pressable onPress={() => pick('library')} accessibilityRole="button" accessibilityLabel={t('photo.choose')}>
          <Avatar name={name || '?'} url={uri ?? currentUrl} size={84} />
        </Pressable>
        <View style={{ flex: 1, gap: 4 }}>
          <T w="semibold" size={14}>
            {t('photo.title')}
          </T>
          <T size={12} color={p.inkSoft}>
            {t('photo.hint')}
          </T>
        </View>
      </View>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button variant="ghost" title={t('photo.take')} onPress={() => pick('camera')} loading={busy === 'camera'} style={{ flex: 1 }} />
        <Button variant="ghost" title={t('photo.choose')} onPress={() => pick('library')} loading={busy === 'library'} style={{ flex: 1 }} />
      </View>
      {uri ? <Button variant="link" title={t('photo.remove')} onPress={() => onChange(null)} /> : null}
      <ErrorText>{error}</ErrorText>
    </View>
  );
}

/** A member's photo (private link fetched for them), falling back to initials. */
export function MemberAvatar({ kid, size = 44, version = 0 }: { kid: { full_name: string; photo_url: string | null }; size?: number; version?: number }) {
  const urls = usePhotoUrls([kid.photo_url], version);
  return <Avatar name={kid.full_name} url={kid.photo_url ? urls[kid.photo_url] : null} size={size} />;
}
