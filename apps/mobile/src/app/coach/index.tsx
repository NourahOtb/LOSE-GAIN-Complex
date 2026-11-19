import {
  addDays,
  ageOn,
  daysUntil,
  isoDate,
  weekdayOf,
  type Sport,
} from "@lg/shared";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState, type ReactNode } from "react";
import {
  Pressable,
  RefreshControl,
  ScrollView,
  View,
} from "react-native";

import { MemberAvatar } from "@/components/avatar";
import { BeltBar } from "@/components/belt";
import { HomeHeader } from "@/components/home-header";
import { LoadState } from "@/components/load-state";
import { AlertIcon } from "@/components/tab-icons";
import { Button, ErrorText, Label, Screen, T } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import {
  currentStripes,
  kidsInClass,
  loadCoachData,
  type CoachData,
} from "@/lib/coach";
import { clockTime, genderKey, type Kid } from "@/lib/data";
import type { ClassRow } from "@/lib/family";
import { useI18n } from "@/lib/i18n";
import type { StringKey } from "@/lib/strings";
import { supabase } from "@/lib/supabase";
import { sportColor, usePalette } from "@/lib/theme";

const DAYS = ["sat", "sun", "mon", "tue", "wed", "thu"] as const;

/** Date of the next occurrence of a weekday (today counts). */
function nextDateFor(day: string): Date {
  for (let i = 0; i < 7; i++) {
    const d = addDays(new Date(), i);
    if (weekdayOf(d) === day) return d;
  }
  return new Date();
}

export default function CoachClasses() {
  const { t, lang } = useI18n();
  const { profile } = useAuth();
  const p = usePalette();
  const sport: Sport = profile?.sport ?? "swimming";
  const accent = sportColor(p, sport);
  const locale = lang === "ar" ? "ar-KW" : "en-GB";

  const todayWd = weekdayOf(new Date());
  const [day, setDay] = useState<string>(todayWd === "fri" ? "sat" : todayWd);
  const [classId, setClassId] = useState<string | null>(null);
  const [data, setData] = useState<CoachData | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [loadFailed, setLoadFailed] = useState(false);
  const load = useCallback(async () => {
    if (!profile) return;
    try {
      setData(await loadCoachData(profile.sport ?? "swimming", profile.id));
      setLoadFailed(false);
    } catch (e) {
      console.warn("[coach] classes not loaded", e instanceof Error ? e.message : String(e));
      setLoadFailed(true);
    }
  }, [profile]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!data) {
    return (
      <Screen edges={["top"]}>
        <HomeHeader />
        <LoadState
          message={t("load.classes")}
          failed={loadFailed}
          onRetry={() => {
            setLoadFailed(false);
            load();
          }}
        />
      </Screen>
    );
  }

  const date = nextDateFor(day);
  const dateIso = isoDate(date);
  const dayClasses = data.classes.filter((c) => c.weekday === day);
  const cls: ClassRow | undefined =
    dayClasses.find((c) => c.id === classId) ?? dayClasses[0];
  const roster = cls ? kidsInClass(data, cls, dateIso) : [];
  const isCancelled = cls
    ? data.cancelled.some((c) => c.class_id === cls.id && c.on_date === dateIso)
    : false;
  const timeLabel = (c: ClassRow) => clockTime(c.start_time, lang ?? "en");
  const placeLabel = (c: ClassRow) => t(`place.${c.location}` as StringKey);
  const fmt = (iso: string) =>
    new Date(iso + "T00:00:00").toLocaleDateString(locale, {
      day: "numeric",
      month: "short",
    });

  const cancel = async () => {
    if (!cls) return;
    setBusy(true);
    setError("");
    const { error: err } = await supabase.rpc("cancel_class", {
      p_class: cls.id,
      p_date: dateIso,
      p_reason: null,
      p_compensation: "makeup",
    });
    setBusy(false);
    setConfirming(false);
    if (err) return setError(t("err.generic"));
    await load();
  };

  // stripe nudge (jiu-jitsu): 30+ days since last stripe (or since the belt)
  const lastStripeDate = (k: Kid) => {
    const s = currentStripes(data, k);
    return s.length ? s[s.length - 1].awarded_on : (k.belt_since ?? null);
  };
  const ready =
    sport === "jiujitsu"
      ? roster.filter(
          ({ kid }) =>
            kid.belt &&
            currentStripes(data, kid).length < 4 &&
            lastStripeDate(kid) &&
            -daysUntil(lastStripeDate(kid)!, new Date()) >= 30,
        )
      : [];

  // swimming: group by level, one lane each
  const levels = [
    ...new Set(roster.map(({ kid }) => kid.swim_level ?? 0)),
  ].sort((a, b) => a - b);

  return (
    <Screen edges={["top"]}>
      <HomeHeader />
      <ScrollView
        contentContainerStyle={{ paddingBottom: 32, gap: 14 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load();
              setRefreshing(false);
            }}
          />
        }
      >
        <View style={{ paddingHorizontal: 20 }}>
          <Label color={accent}>{t(`sport.${sport}`)}</Label>
          <T w="semibold" size={24}>
            {day === todayWd
              ? t("coach.today", {
                  day: date.toLocaleDateString(locale, { weekday: "long" }),
                })
              : date.toLocaleDateString(locale, {
                  weekday: "long",
                  day: "numeric",
                  month: "short",
                })}
          </T>
        </View>

        {/* day picker */}
        <View style={{ flexDirection: "row", gap: 6, paddingHorizontal: 20 }}>
          {DAYS.map((d) => {
            const on = d === day;
            return (
              <Pressable
                key={d}
                onPress={() => {
                  setDay(d);
                  setClassId(null);
                  setConfirming(false);
                }}
                accessibilityRole="tab"
                accessibilityState={{ selected: on }}
                style={{
                  flex: 1,
                  minHeight: 40,
                  borderRadius: 6,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: on ? p.ink : p.surface,
                  borderWidth: 1.5,
                  borderColor: on ? p.ink : p.line,
                }}
              >
                <T
                  w="semibold"
                  size={13}
                  color={on ? p.onInk : d === todayWd ? accent : p.ink}
                  style={{ textAlign: "center" }}
                >
                  {t(`day.${d}`)}
                </T>
              </Pressable>
            );
          })}
        </View>

        {/* class chips */}
        {dayClasses.length === 0 ? (
          <T color={p.inkSoft} style={{ paddingHorizontal: 20 }}>
            {t("coach.noClasses")}
          </T>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: 8, paddingHorizontal: 20 }}
          >
            {dayClasses.map((c) => {
              const on = c.id === cls?.id;
              return (
                <Pressable
                  key={c.id}
                  onPress={() => {
                    setClassId(c.id);
                    setConfirming(false);
                  }}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: on }}
                  style={{
                    paddingHorizontal: 16,
                    minHeight: 40,
                    justifyContent: "center",
                    borderRadius: 20,
                    backgroundColor: on ? p.ink : p.surface,
                    borderWidth: 1.5,
                    borderColor: on ? p.ink : p.line,
                  }}
                >
                  <T w="cond" size={15} color={on ? p.onInk : p.ink}>
                    {timeLabel(c)} · {c.label ? t(`class.${c.label}` as StringKey) : placeLabel(c)}
                    {c.is_free ? ` · ${t("class.free")}` : ""}
                  </T>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {cls ? (
          <View style={{ paddingHorizontal: 20, gap: 12 }}>
            <T size={13} color={p.inkSoft}>
              {roster.length === 1 ? t("coach.kidsCountOne") : t("coach.kidsCount", { n: roster.length })}
            </T>

            {isCancelled ? (
              <View
                style={{
                  backgroundColor: p.dangerBg,
                  padding: 12,
                  borderRadius: 4,
                }}
              >
                <T w="semibold" color={p.danger}>
                  {t("coach.cancelled")}
                </T>
              </View>
            ) : null}

            {ready.length > 0 && !isCancelled ? (
              <View
                style={{
                  backgroundColor: p.hintBg,
                  padding: 12,
                  borderRadius: 4,
                }}
              >
                <T w="semibold" size={14} color={p.hintInk}>
                  {t("coach.readyStripe", { n: ready.length })}
                </T>
              </View>
            ) : null}

            {roster.length === 0 ? (
              <T color={p.inkSoft}>{t("coach.empty")}</T>
            ) : null}

            {sport === "swimming"
              ? levels.map((lvl, i) => (
                  <View
                    key={lvl}
                    style={{
                      borderTopWidth: 5,
                      borderTopColor: p.ink,
                      marginTop: 8,
                    }}
                  >
                    <View
                      style={{
                        position: "absolute",
                        end: 0,
                        top: -14,
                        width: 5,
                        height: 22,
                        backgroundColor: p.ink,
                      }}
                    />
                    <Label style={{ marginTop: 10, marginBottom: 2 }}>
                      {lvl
                        ? t("coach.lane", { lane: i + 1, level: lvl })
                        : t("coach.noLevel")}
                    </Label>
                    {roster
                      .filter(({ kid }) => (kid.swim_level ?? 0) === lvl)
                      .map(({ kid }) => (
                        <KidRow
                          key={kid.id}
                          kid={kid}
                          sub={
                            kid.swim_level_since
                              ? t("coach.atLevel", {
                                  date: fmt(kid.swim_level_since),
                                })
                              : undefined
                          }
                          action={
                            !kid.swim_level ||
                            (kid.swim_level_since &&
                              -daysUntil(kid.swim_level_since, new Date()) >=
                                45)
                              ? t("coach.moveUp")
                              : undefined
                          }
                          onAction={() =>
                            router.push({
                              pathname: "/kid/[id]",
                              params: { id: kid.id },
                            })
                          }
                        />
                      ))}
                  </View>
                ))
              : roster.length > 0 && (
                  <View style={{ borderTopWidth: 2, borderTopColor: p.ink }}>
                    {roster.map(({ kid }) => {
                      const stripes = currentStripes(data, kid);
                      const last = stripes.length
                        ? stripes[stripes.length - 1].awarded_on
                        : null;
                      const isReady = ready.some((r) => r.kid.id === kid.id);
                      return (
                        <KidRow
                          key={kid.id}
                          kid={kid}
                          sub={
                            last
                              ? t("coach.lastStripe", { date: fmt(last) })
                              : t("coach.noStripe")
                          }
                          subColor={isReady ? p.bjj : undefined}
                          right={
                            kid.belt ? (
                              <BeltBar
                                belt={kid.belt}
                                stripes={stripes.length}
                                height={14}
                                width={78}
                              />
                            ) : null
                          }
                          action={
                            kid.belt
                              ? stripes.length >= 4
                                ? t("coach.beltBtn")
                                : t("coach.stripeBtn")
                              : undefined
                          }
                          onAction={() =>
                            router.push({
                              pathname: "/kid/[id]",
                              params: { id: kid.id, add: "stripe" },
                            })
                          }
                        />
                      );
                    })}
                  </View>
                )}

            {/* cancel this class */}
            {!isCancelled && roster.length >= 0 ? (
              confirming ? (
                <View
                  style={{
                    borderWidth: 1.5,
                    borderColor: p.danger,
                    borderRadius: 6,
                    padding: 14,
                    gap: 12,
                    marginTop: 8,
                  }}
                >
                  <T w="semibold">
                    {t("coach.cancelConfirm", {
                      sport: t(`sport.${sport}`),
                      time: timeLabel(cls),
                      date: date.toLocaleDateString(locale, {
                        weekday: "long",
                        day: "numeric",
                        month: "short",
                      }),
                    })}
                  </T>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <Button
                      variant="ghost"
                      title={t("common.cancel")}
                      onPress={() => setConfirming(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t("coach.cancelYes")}
                      onPress={cancel}
                      loading={busy}
                      style={{
                        flex: 1.4,
                        backgroundColor: p.danger,
                        borderColor: p.danger,
                      }}
                    />
                  </View>
                </View>
              ) : (
                <Pressable
                  onPress={() => setConfirming(true)}
                  accessibilityRole="button"
                  style={{
                    alignSelf: "flex-start",
                    marginTop: 8,
                    borderWidth: 1.5,
                    borderColor: p.danger,
                    borderRadius: 6,
                    paddingHorizontal: 14,
                    minHeight: 40,
                    justifyContent: "center",
                  }}
                >
                  <T w="semibold" size={14} color={p.danger}>
                    {t("coach.cancel")}
                  </T>
                </Pressable>
              )
            ) : null}
            <ErrorText>{error}</ErrorText>
          </View>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function KidRow({
  kid,
  sub,
  subColor,
  right,
  action,
  onAction,
}: {
  kid: Kid;
  sub?: string;
  subColor?: string;
  right?: ReactNode;
  action?: string;
  onAction?: () => void;
}) {
  const p = usePalette();
  const { t } = useI18n();
  const g = genderKey(kid);
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: p.line,
      }}
    >
      <Pressable
        onPress={() =>
          router.push({ pathname: "/kid/[id]", params: { id: kid.id } })
        }
        accessibilityRole="button"
        style={({ pressed }) => ({
          flex: 1,
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <MemberAvatar kid={kid} size={40} />
        <View style={{ flex: 1 }}>
          <T w="semibold" size={15}>
            {kid.full_name}
          </T>
          <T size={12} color={subColor ?? p.inkSoft}>
            {t("kids.years", { n: ageOn(kid.birth_date) })}
            {g ? ` · ${t(g)}` : ""}
            {sub ? ` · ${sub}` : ""}
          </T>
        </View>
        {kid.health_conditions.length > 0 ? (
          <View
            accessibilityLabel={kid.health_conditions.join(", ")}
            style={{
              width: 26,
              height: 26,
              borderRadius: 4,
              backgroundColor: p.dangerBg,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <AlertIcon color={p.danger} size={15} />
          </View>
        ) : null}
        {right}
      </Pressable>
      {action ? (
        <Pressable
          onPress={onAction}
          accessibilityRole="button"
          hitSlop={6}
          style={{
            borderWidth: 1.5,
            borderColor: p.ink,
            borderRadius: 4,
            paddingHorizontal: 8,
            paddingVertical: 5,
          }}
        >
          <T w="cond" size={13}>
            {action}
          </T>
        </Pressable>
      ) : null}
    </View>
  );
}
