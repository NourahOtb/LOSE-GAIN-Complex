import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';

import { supabase } from './supabase';

// Member photos: a PRIVATE storage bucket, one file per member at <account id>/<member id>.jpg.
// Only that family, coaches and staff can open them (database rules), through short-lived links.
const BUCKET = 'kid-photos';

export type PickResult = { kind: 'ok'; uri: string } | { kind: 'cancelled' } | { kind: 'denied' };

/** Take a photo or pick one, square-cropped where the phone allows, then shrunk to 600 px. */
export async function pickPhoto(source: 'camera' | 'library'): Promise<PickResult> {
  const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.8 };
  let res: ImagePicker.ImagePickerResult;
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return { kind: 'denied' };
    res = await ImagePicker.launchCameraAsync(options);
  } else {
    res = await ImagePicker.launchImageLibraryAsync(options);
  }
  if (res.canceled || !res.assets?.[0]) return { kind: 'cancelled' };
  const ref = await ImageManipulator.manipulate(res.assets[0].uri).resize({ width: 600 }).renderAsync();
  const small = await ref.saveAsync({ compress: 0.75, format: SaveFormat.JPEG });
  return { kind: 'ok', uri: small.uri };
}

/** Upload (or replace) a member's photo and save its place on the member. */
export async function savePhoto(accountId: string, kidId: string, uri: string): Promise<boolean> {
  try {
    const path = `${accountId}/${kidId}.jpg`;
    const body = await (await fetch(uri)).arrayBuffer();
    const up = await supabase.storage.from(BUCKET).upload(path, body, { contentType: 'image/jpeg', upsert: true });
    if (up.error) return false;
    const { error } = await supabase.from('kids').update({ photo_url: path }).eq('id', kidId);
    return !error;
  } catch {
    return false;
  }
}

export async function removePhoto(kidId: string, path: string): Promise<boolean> {
  await supabase.storage.from(BUCKET).remove([path]);
  const { error } = await supabase.from('kids').update({ photo_url: null }).eq('id', kidId);
  return !error;
}

/** Short-lived links for a list of stored photos ({ path: url }). `version` forces a refresh after a change. */
export function usePhotoUrls(paths: (string | null | undefined)[], version = 0): Record<string, string> {
  const key = paths.filter(Boolean).sort().join('|');
  const [urls, setUrls] = useState<Record<string, string>>({});
  useEffect(() => {
    const list = key ? key.split('|') : [];
    if (!list.length) return;
    let alive = true;
    supabase.storage
      .from(BUCKET)
      .createSignedUrls(list, 3600)
      .then(({ data }) => {
        if (!alive || !data) return;
        const map: Record<string, string> = {};
        for (const d of data) if (d.path && d.signedUrl) map[d.path] = d.signedUrl;
        setUrls(map);
      });
    return () => {
      alive = false;
    };
  }, [key, version]);
  return urls;
}
