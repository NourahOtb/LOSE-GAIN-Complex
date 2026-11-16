import { ageOn, normalizeKuwaitPhone, parseDob } from '@lg/shared';
import { router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';

import { Button, ErrorText, Field, Label, Screen, T } from '@/components/ui';
import { useAuth } from '@/lib/auth';
import { HEALTH_KEYS, type HealthKey } from '@/lib/data';
import { useI18n } from '@/lib/i18n';
import { supabase } from '@/lib/supabase';
import { usePalette } from '@/lib/theme';

export default function AddKidScreen() {
  const { t } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [emergency, setEmergency] = useState('');
  const [health, setHealth] = useState<HealthKey[]>([]);
  const [none, setNone] = useState(false);
  const [other, setOther] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const toggle = (h: HealthKey) => {
    setNone(false);
    setHealth((cur) => (cur.includes(h) ? cur.filter((x) => x !== h) : [...cur, h]));
  };

  const save = async () => {
    setError('');
    if (!name.trim() || !dob.trim() || !emergency.trim()) return setError(t('err.required'));
    const birth = parseDob(dob);
    if (!birth) return setError(t('err.birth'));
    const age = ageOn(birth);
    if (age < 4 || age > 15) return setError(t('err.age'));
    const phone = normalizeKuwaitPhone(emergency);
    if (!phone) return setError(t('err.phone'));
    if (!none && health.length === 0) return setError(t('err.health'));
    if (!profile) return;

    setBusy(true);
    const { error: err } = await supabase.from('kids').insert({
      parent_id: profile.id,
      full_name: name.trim(),
      birth_date: birth,
      emergency_phone: phone,
      health_conditions: none ? [] : health,
      health_other: other.trim() || null,
      health_confirmed: true,
    });
    setBusy(false);
    if (err) return setError(t('err.generic'));
    router.back();
  };

  return (
    <Screen>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <T w="semibold" size={24}>
              {t('kid.new')}
            </T>
            <Button variant="link" title="✕" onPress={() => router.back()} />
          </View>

          <Field label={t('kid.name')} value={name} onChangeText={setName} autoComplete="name" />
          <Field label={t('kid.birth')} hint={t('kid.birthHint')} value={dob} onChangeText={setDob} placeholder="10/03/2019" keyboardType="numbers-and-punctuation" />
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
              <T>{t('kid.healthQ')}</T>
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
          <Button title={t('kid.save')} onPress={save} loading={busy} />
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
      <T w="semibold" size={14} color={on ? '#FFFFFF' : p.ink}>
        {label}
      </T>
    </Pressable>
  );
}
