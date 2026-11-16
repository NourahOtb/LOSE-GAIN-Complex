# Implementation Plan: Wednesday demo (2026-11-18)

**Replaces** the earlier `identity`-only plan. The full product stays in [PRD.md](../PRD.md) as the roadmap.
**Purpose:** a **demo / presentation** on Wednesday 2026-11-18.

## The demo story (what we show, in order)

1. Open the app → choose **العربية / English**.
2. A **parent signs up**, adds a kid with the **health checklist**.
3. Parent registers the kid: sport, days, duration → **price calculated from the real price table + family discount**. Payment "at reception".
4. **Admin dashboard:** the new registration appears → receptionist **marks it paid** → it's active. "Expiring soon" list.
5. **Coach** logs in (same app) → sees today's classes and kids with **red health badges** → updates the kid's **level** and writes a **note**.
6. Parent sees the new level and note.
7. **Admin cancels a class** → the parent sees "Class cancelled" in their **notification inbox**.

## In / out

**In:** everything in the story above. Email login only. Notifications = in-app inbox. Real Supabase database so all screens share live data.
**Out (roadmap):** SMS login, UPayments, lock-screen push, chat, waitlist, make-ups, check-in, reports, audit log, Excel import, WhatsApp, teen logins, private classes, App Store.

## Architecture (kept small)

- `apps/mobile`: Expo + Expo Router. Runs on phones through **Expo Go** and as a **website**.
- `apps/admin`: Next.js + Tailwind. English only.
- `packages/shared`: **pricing calculator** (tested), roles, Arabic/English text.
- **Supabase (hosted, free):** tables `profiles`, `kids`, `classes`, `subscriptions`, `notifications`, with security rules.
- **Demo accounts** seeded: 1 receptionist/admin, 2 coaches, sample kids and classes.

## Tasks

| # | Task | Day |
|---|---|---|
| 1 | Projects: Expo app, Next.js admin, shared package | Mon |
| 2 | Supabase project + tables + security rules + demo data | Mon |
| 3 | App: language screen, sign up / log in, role-based home | Mon |
| 4 | App: add kid + health checklist | Mon–Tue |
| 5 | Shared pricing calculator with tests (real price table, family discount) | Tue |
| 6 | App: registration flow + price summary, parent home (next class, remaining, expiry) | Tue |
| 7 | App: coach view (classes, kids by day group, health badges, level + note) | Tue |
| 8 | Admin: login, registrations, mark paid, expiring soon, kids list | Tue–Wed |
| 9 | Admin: cancel a class → parent notifications; app notification inbox | Wed |
| 10 | Full run-through of the demo story, fixes, put the website online (Vercel) | Wed |

**Checkpoints:** you try it at the end of Monday (sign up, add kid), Tuesday evening (register, coach view) and Wednesday morning (full story).

## Risks

| Risk | Mitigation |
|---|---|
| Not enough time | Strict order: the demo story first, polish last. Anything late is cut, not rushed. |
| Wi-Fi at the presentation | Keep the website version online (Vercel) and the phone app on Expo Go; test both on mobile data. |
| Arabic layout bugs | Check each screen in Arabic as we go. |
