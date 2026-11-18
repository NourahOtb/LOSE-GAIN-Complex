import { ageOn, normalizeKuwaitPhone, parseDob } from '@lg/shared';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { PhotoField } from '@/components/avatar';
import { Segmented } from '@/components/pickers';
import { Button, ErrorText, Field, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { HEALTH_KEYS, type HealthKey } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { savePhoto } from '@/lib/photos';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

export default function AddKidScreen() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  // self=1: the account holder adds themself as an adult member; first=1: straight after sign-up
  const params = useLocalSearchParams<{ self?: string; first?: string }>();
  const isSelf = params.self === '1';
  const isFirst = params.first === '1';
  // first and last name (for "me": taken from the account name, can be corrected)
  const ownName = (profile?.full_name ?? '').trim();
  const [first, setFirst] = useState(isSelf ? ownName.split(' ')[0] : '');
  const [last, setLast] = useState(isSelf ? ownName.split(' ').slice(1).join(' ') : '');
  const name = `${first.trim()} ${last.trim()}`.trim();
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [emergency, setEmergency] = useState('');
  const [health, setHealth] = useState<HealthKey[]>([]);
  const [none, setNone] = useState(false);
  const [other, setOther] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const toggle = (h: HealthKey) => {
    setNone(false);
    setHealth((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  };

  // after saving: first-time members go to Register; otherwise back (or to the Family tab when opened directly)
  const leave = () => {
    if (isFirst) router.replace('/parent/register');
    else if (router.canGoBack()) router.back();
    else router.replace('/parent/kids');
  };

  const save = async () => {
    setError('');
    if (!first.trim() || !last.trim() || !dob.trim() || !emergency.trim()) return setError(t('err.required'));
    if (!gender) return setError(isSelf ? t('err.genderMe') : t('err.gender'));
    const birth = parseDob(dob);
    if (!birth) return setError(t('err.birth'));
    const age = ageOn(birth);
    if (isSelf && age < 16) return setError(t('err.ageAdult'));
    if (!isSelf && (age < 4 || age > 15)) return setError(t('err.age'));
    const phone = normalizeKuwaitPhone(emergency);
    if (!phone) return setError(t('err.phone'));
    if (!none && health.length === 0) return setError(t('err.health'));
    if (!profile) return;

    setBusy(true);
    const { data: created, error: err } = await supabase.from('kids').insert({
      parent_id: profile.id,
      first_name: first.trim(),
      last_name: last.trim(),
      full_name: name,
      birth_date: birth,
      emergency_phone: phone,
      health_conditions: none ? [] : health,
      health_other: other.trim() || null,
      health_confirmed: true,
      is_self: isSelf,
      gender,
    }).select('id').single();
    if (err || !created) {
      setBusy(false);
      return setError(err?.code === '23505' ? t('err.selfExists') : t('err.generic'));
    }
    // the member is saved; the photo is a bonus. If it fails, say so but don't lose the member.
    if (photo && !(await savePhoto(profile.id, created.id, photo))) {
      setBusy(false);
      setSaved(true);
      return setError(t('photo.savedNoPhoto'));
    }
    setBusy(false);
    leave();
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T w="semibold" size={24}>
              {isSelf ? t('me.new') : t('kid.new')}
            </T>
            <Button variant="link" title="✕" onPress={() => (isFirst || !router.canGoBack() ? router.replace('/') : router.back())} />
          </View>
          {isSelf ? <T color={p.inkSoft}>{t('me.intro')}</T> : null}

          <PhotoField name={name} uri={photo} onChange={setPhoto} />

          <Field label={t('kid.firstName')} value={first} onChangeText={setFirst} autoComplete="name-given" textContentType="givenName" />
          <Field label={t('kid.lastName')} value={last} onChangeText={setLast} autoComplete="name-family" textContentType="familyName" />
          <View style={{ gap: 6 }}>
            <T w="semibold" size={14}>
              {isSelf ? t('me.gender') : t('kid.gender')}
            </T>
            <Segmented
              options={[
                { value: 'male', label: isSelf ? t('g.male') : t('g.boy') },
                { value: 'female', label: isSelf ? t('g.female') : t('g.girl') },
              ]}
              value={gender}
              onChange={setGender}
            />
          </View>
          <Field label={t('kid.birth')} hint={t('kid.birthHint')} value={dob} onChangeText={setDob} placeholder={isSelf ? '15/06/1990' : '10/03/2019'} keyboardType="numbers-and-punctuation" />
          <Field
            label={t('kid.emergency')}
            hint={t('kid.emergencyHint')}
            value={emergency}
            onChangeText={setEmergency}
            keyboardType="phone-pad"
            inputMode="tel"
            placeholder="9XXX XXXX"
          />

          <View style={{ gap: 10, marginTop: 6 }}>
            <View style={{ borderTopWidth: 2, borderTopColor: p.ink, paddingTop: 12, gap: 4 }}>
              <Label>{t('kid.health')}</Label>
              <T>{isSelf ? t('me.healthQ') : t('kid.healthQ')}</T>
            </View>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {HEALTH_KEYS.map((h) => (
                <Chip key={h} label={t(`h.${h}`)} on={health.includes(h)} danger onPress={() => toggle(h)} />
              ))}
            </View>
            <Chip
              label={t('kid.healthNone')}
              on={none}
              onPress={() => {
                setNone((v) => !v);
                setHealth([]);
              }}
            />
            {(health.length > 0 || !none) && (
              <Field label={t('kid.healthOther')} value={other} onChangeText={setOther} multiline />
            )}
          </View>

          <ErrorText>{error}</ErrorText>
          {saved ? (
            <Button title={t('common.back')} onPress={leave} />
          ) : (
            <Button title={isSelf ? t('me.save') : t('kid.save')} onPress={save} loading={busy} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

function Chip({ label, on, onPress, danger }: { label: string; on: boolean; onPress: () => void; danger?: boolean }) {
  const p = usePalette();
  const onBg = danger ? p.danger : p.ink;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: on }}
      style={({ pressed }) => ({
        borderWidth: 1.5,
        borderColor: on ? onBg : p.line,
        backgroundColor: on ? onBg : p.surface,
        borderRadius: 6,
        paddingHorizontal: 14,
        minHeight: 44,
        justifyContent: 'center',
        opacity: pressed ? 0.8 : 1,
        alignSelf: 'flex-start',
      })}>
      <T w="semibold" size={14} color={on ? (danger ? '#FFFFFF' : p.onInk) : p.ink}>
        {label}
      </T>
    </Pressable>
  );
}
