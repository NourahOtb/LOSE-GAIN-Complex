# Capability Map: LOSE | GAIN Complex

**Status:** APPROVED by owner on 2026-11-16
**Date:** 2026-11-15

This is the "table of contents" for the whole system. Each row is one **module**: a part of the system that can be built and tested on its own. Each module will get its own short spec (`docs/specs/SPEC-<module>.md`), written in the build order below.

## The three things people see (surfaces)

| Surface | Who uses it | Built with |
|---|---|---|
| **Mobile app** (App Store + Google Play) **and** the same app as a **website** | Parents, coaches (different screens after login) | Expo (React Native) + Expo Router, web export |
| **Admin dashboard** (website) | Super admin, manager, receptionist, accountant | Next.js |
| **Backend** (shared by both) | Everything above | Supabase: database, logins, chat in real time, server functions |

## Modules

| Module id | What it does | Depends on |
|---|---|---|
| `identity` | Accounts and login for parents, coaches and the 4 staff roles. Language choice (Arabic / English, right-to-left layout for Arabic) on the first screen. Who is allowed to see and change what. | — |
| `catalog` | Sports, age groups (kids 5–11, Titans 11–15, adults), levels, pools and mats, class times (4pm / 5pm, Sat–Thu, seasonal), day groups (Sun/Tue/Thu, Sat/Mon/Wed), coaches per class, trial days, private classes. Coaches and staff add, remove and cancel classes. | identity |
| `pricing` | Price tables (1 / 2 / 4 weeks, days per week, adult swimming), mixed sports = total days, family discount (kids only) + multi-month discount added together. **Every rule editable by super admin.** | catalog |
| `enrollment` | Kid profiles (health conditions, level, coach notes, parent notes). Step-by-step registration (trial first or straight to a package, one sport or mixed). Subscriptions, remaining sessions, expiry. Reschedule / pause / cancel within admin-set limits. Renewal (same package or a new one). Refund requests (admin decides). | catalog, pricing |
| `payments` | Pay online through your payment gateway **or** at reception (staff mark it paid). Payment history and money reports for the accountant. | enrollment |
| `notifications` | Push notifications to phones plus an in-app inbox: class cancelled, level changed, renewal due, request approved, new chat reply, anything that needs attention. | identity, enrollment |
| `messaging` | Parent ↔ coach chat. | identity, notifications |
| `ai-assistant` *(moved into version 1, 2026-11-18)* | Parents-only chat assistant (Claude). Answers questions and makes changes (register, pause, cancel, reschedule, renew) **only after the parent taps Confirm**. Passes anything it can't handle to the receptionist. | enrollment, payments, messaging |
| `store` *(version 2, not now)* | Goggles, caps, towels, apparel. | payments |

## Build order

```
identity → catalog → pricing → enrollment → payments, notifications → messaging
                                                     → ai-assistant      (version 2 later: store)
```

Each step adds screens in **all three surfaces** at once. For example, "catalog" means the coach sees classes in the app, staff edit them in the dashboard, and parents see the timetable.

## Assumptions (correct any that are wrong)

1. **One code folder for everything** (a "monorepo"): `apps/mobile` (Expo app + website), `apps/admin` (Next.js), `packages/shared` (shared pricing rules, data types, Arabic/English text).
2. **Sample JSON data first.** Screens are built on fake data so you can try them on your phone with Expo Go, then switched to Supabase.
3. **Google Play too**, not only the App Store, since many parents in Kuwait use Android. This costs nothing extra to build.
4. **App Store needs an Apple Developer account** (US$99 a year) and **Google Play needs a developer account** (US$25 once), both in the company's name. Apple's review takes a few days.
5. **The AI assistant will run on the server**, never on the phone, so the secret AI key stays safe. It will only be able to do what the parent could do with buttons. Version 1 keeps all actions (pause, renew, ...) as reusable server functions so it can plug in later.
6. **Kids' health information is private.** Only that kid's parents, coaches and staff can see it, never other parents.
7. **Time zone is Kuwait** (UTC+3). **Currency is KD with 3 decimals** (for example 96.750 KD), which matters when discounts are applied.

## Rough 3-week timeline

| Week | Goal |
|---|---|
| 1 | `identity`, `catalog`, `pricing`: login, both languages, classes and prices working in the app and dashboard |
| 2 | `enrollment`, `payments`, `notifications`: parents can register, pay and get notified, and staff manage everything |
| 3 | `messaging`, testing, then App Store / Google Play submission |
| After launch | Version 2: `store` (`ai-assistant` moved into version 1) |

## Answered (2026-11-16)

- **Trial classes** are free, on **Thursdays or Saturdays** (the parent picks one).
- **Pause:** up to **1 week** self-service. Longer pauses are for injuries only and need receptionist or coach approval.
- **Payment gateway:** **UPayments**.
- **Adult classes:** men's swimming only for now. Women's classes may come later, so the system must allow adding new adult classes without code changes.
- **Brand colors:** black and white only.

## Still open (asked while writing each module spec)

- Pool sizes, exact swimming levels (4 or 5?), maximum kids per class or level
- Cancel and reschedule limits (for example, how many hours' notice)
