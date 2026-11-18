import { ageOn } from '@lg/shared';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, View } from 'react-native';

import { MemberAvatar, PhotoField } from '@/components/avatar';
import { BeltBar } from '@/components/belt';
import { HomeHeader } from '@/components/home-header';
import { AlertIcon } from '@/components/tab-icons';
import { Button, ErrorText, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { beltName, genderKey, type Kid } from '@/lib/data';
import { removePhoto, savePhoto, usePhotoUrls } from '@/lib/photos';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

type KidRow = Kid & { stripes: { count: number }[] };

export default function KidsScreen() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const [kids, setKids] = useState<KidRow[] | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [photoFor, setPhotoFor] = useState<KidRow | null>(null);
  const [photoVersion, setPhotoVersion] = useState(0);
  const single = profile?.account_type === 'single';
  const hasMe = (kids ?? []).some((k) => k.is_self);

  const load = useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from('kids')
      .select('*, stripes(count)')
      .eq('parent_id', profile.id)
      .order('created_at');
    setKids((data as KidRow[]) ?? []);
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  return (
    <Screen edges={['top']}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 32, gap: 16 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} />}>
        <T w="semibold" size={24}>
          {single ? t('me.title') : t('kids.familyTitle')}
        </T>

        {kids === null ? (
          <ActivityIndicator color={p.ink} />
        ) : kids.length === 0 ? (
          <T color={p.inkSoft}>{single ? t('me.empty') : t('kids.empty')}</T>
        ) : (
          <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
            {kids.map((k) => {
              const stripes = k.stripes?.[0]?.count ?? 0;
              const hasHealth = k.health_conditions.length > 0;
              return (
                <View key={k.id} style={{ paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: p.line, gap: 8 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Pressable onPress={() => setPhotoFor(k)} accessibilityRole="button" accessibilityLabel={k.photo_url ? t('photo.change') : t('photo.add')}>
                      <MemberAvatar kid={k} size={52} version={photoVersion} />
                    </Pressable>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <T w="semibold" size={18}>
                          {k.full_name}
                        </T>
                        {k.is_self && !single ? (
                          <View style={{ borderWidth: 1, borderColor: p.ink, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                            <T w="semibold" size={11}>
                              {t('kids.you')}
                            </T>
                          </View>
                        ) : null}
                      </View>
                      <T size={13} color={p.inkSoft}>
                        {t('kids.years', { n: ageOn(k.birth_date) })}
                        {genderKey(k) ? ` · ${t(genderKey(k)!)}` : ''} · {t('kids.member', { n: k.member_no })}
                      </T>
                      <Button variant="link" title={k.photo_url ? t('photo.change') : t('photo.add')} onPress={() => setPhotoFor(k)} style={{ alignSelf: 'flex-start' }} />
                    </View>
                    {hasHealth ? (
                      <View
                        accessibilityLabel={k.health_conditions.join(', ')}
                        style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: p.dangerBg, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 }}>
                        <AlertIcon color={p.danger} size={14} />
                        <T w="semibold" size={12} color={p.danger}>
                          {k.health_conditions.map((h) => t(`h.${h}` as never)).join(', ')}
                        </T>
                      </View>
                    ) : null}
                  </View>

                  {k.swim_level ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: p.swim }} />
                      <Label color={p.swim}>{t('kids.level', { n: k.swim_level })}</Label>
                    </View>
                  ) : null}
                  {k.belt ? (
                    <View style={{ gap: 4 }}>
                      <BeltBar belt={k.belt} stripes={stripes} height={16} width={190} />
                      <T size={12} color={p.inkSoft}>
                        {beltName(k.belt, lang ?? 'en')} · {stripes}/4
                      </T>
                    </View>
                  ) : null}
                  {!k.swim_level && !k.belt ? (
                    <T size={13} color={p.inkSoft}>
                      {t('kids.noLevel')}
                    </T>
                  ) : null}
                </View>
              );
            })}
          </View>
        )}

        {single ? (
          kids && !hasMe ? <Button title={t('me.complete')} onPress={() => router.push({ pathname: '/add-kid', params: { self: '1' } })} /> : null
        ) : (
          <View style={{ gap: 10 }}>
            <Button title={`+  ${t('kids.add')}`} onPress={() => router.push('/add-kid')} />
            {kids && !hasMe ? (
              <Button variant="ghost" title={`+  ${t('kids.addMe')}`} onPress={() => router.push({ pathname: '/add-kid', params: { self: '1' } })} />
            ) : null}
          </View>
        )}
      </ScrollView>
      {photoFor && profile ? (
        <PhotoSheet
          kid={photoFor}
          accountId={profile.id}
          onClose={async (changed) => {
            setPhotoFor(null);
            if (changed) {
              await load();
              setPhotoVersion((v) => v + 1);
            }
          }}
        />
      ) : null}
    </Screen>
  );
}

/** Change or remove a member's photo. */
function PhotoSheet({ kid, accountId, onClose }: { kid: KidRow; accountId: string; onClose: (changed: boolean) => void }) {
  const { t } = useI18n();
  const p = usePalette();
  const [uri, setUri] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const current = usePhotoUrls([kid.photo_url]);

  const save = async () => {
    setError('');
    setBusy(true);
    const ok = uri ? await savePhoto(accountId, kid.id, uri) : kid.photo_url ? await removePhoto(kid.id, kid.photo_url) : true;
    setBusy(false);
    if (!ok) return setError(t('photo.failed'));
    onClose(true);
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={() => onClose(false)}>
      <Pressable onPress={() => onClose(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', padding: 20 }}>
        <Pressable onPress={() => {}} style={{ backgroundColor: p.bg, borderRadius: 8, padding: 18, gap: 14, maxWidth: 440, width: '100%', alignSelf: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <T w="semibold" size={20}>
              {kid.full_name}
            </T>
            <Button variant="link" title="✕" onPress={() => onClose(false)} />
          </View>
          {uri ? (
            <PhotoField name={kid.full_name} uri={uri} onChange={setUri} />
          ) : (
            <View style={{ gap: 10 }}>
              <PhotoField name={kid.full_name} uri={null} currentUrl={kid.photo_url ? current[kid.photo_url] : null} onChange={setUri} />
              {kid.photo_url ? <Button variant="link" title={t('photo.remove')} onPress={save} /> : null}
            </View>
          )}
          <ErrorText>{error}</ErrorText>
          {uri ? <Button title={t('photo.save')} onPress={save} loading={busy} /> : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
