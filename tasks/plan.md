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
**Added after the plan:** online payment with UPayments (sandbox), with friendly result screens.
**Out (roadmap):** SMS login, live UPayments keys, lock-screen push, chat, waitlist, make-ups, check-in, reports, audit log, Excel import, WhatsApp, teen logins, private classes, App Store.

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

---

# Phase 2 plan (started 2026-11-18)

Four requests from the owner. We do **one task at a time**, and Claude **asks before starting the next one**. Every task ends with: test it in the app, update PRD.md / CAPABILITY-MAP.md / DEMO.md / PRODUCT.md where needed, tick it in [todo.md](todo.md), commit and push (the websites update by themselves).

## Task 11: Member sign-up (family or just me) + kid photo and boy/girl

### 11a. Sign-up
- Title: **"Create a member account" / "إنشاء حساب عضوية"**.
- First question: **"Who is this account for?" / "لمن هذا الحساب؟"**
  - **My family**: I'm registering my kids / **عائلتي**: أسجّل أبنائي
  - **Just me**: I'm joining myself / **أنا فقط**: أسجّل نفسي
- **My family** → required dropdown **"Your relationship to the kids"**: Father, Mother, Grandfather, Grandmother, Brother, Sister, Uncle, Aunt, Other (legal guardian). In the app this person is the **guardian / ولي الأمر**. They can later tap **"Add myself as a member"**.
- **Just me** → no relationship, no "Add a kid". Right after sign-up they fill in their **own** health checklist, emergency contact and boy/girl → register themselves for **adult classes only**. Home shows their own next class and sessions left. In the app they're the **member / العضو**.
- Database (migration `0007`): `account_type` (family / single) and `relationship` on `profiles`; members are stored like kids with an `is_self` flag so classes, pricing, coach view and admin all keep working.
- Coaches and admin see "Guardian: Noura · Mother" (or "Adult member").

### 11b. Add a kid: photo + boy/girl
- **Photo** (optional but recommended, as in the PRD): **Take a photo** or **Choose from library** (on phones the camera opens; on the website the phone's camera/file picker). Round preview, can change or remove later.
- Photos are stored in a **private** Supabase Storage folder: only that family, coaches and staff can see them (same rule as health information).
- **Boy / Girl** (required): two big buttons **Boy / ولد** and **Girl / بنت**.
- The photo shows on the kid's card, the coach's class list and kid page, and the admin Kids page; boy/girl shows next to the name.
- Demo kids get boy/girl filled in.

## Task 12: Guardian ↔ coach chat (Supabase)
- Database (migration `0008`): `conversations` (one per guardian + coach + kid) and `messages` (sender, text, time, read). Security rules: only the guardian and that coach can read and write; manager and super admin can **read** (oversight, as the PRD says).
- **Supabase Realtime** so new messages appear instantly without reloading.
- Guardian app: a **Chat** tab → pick the kid → their coach(es) from the kid's classes → chat screen.
- Coach app: a **Chat** tab with all guardians who wrote, unread count badge, reply.
- A new message also creates an inbox notification, and the tab shows a red number.
- Admin: **Chats** page (read-only) with "no reply after 12 hours" in red.

## Task 13: AI assistant for guardians (Claude)
- A new Supabase Edge Function `assistant` runs on the server and calls **Claude** (Anthropic) with the official SDK. The AI key stays on the server, never in the app.
- Guardian app: an **Assistant** tab, chat style, Arabic or English (answers in the guardian's language).
- **What it can read (tools):** the guardian's own kids, subscriptions, sessions left, next classes, cancellations, price sheet and discounts, class timetable. It only ever sees this guardian's family (checked on the server).
- **What it can do:** prepare a change (register, renew, pay online) as a **summary card with the price**. Nothing happens until the guardian taps **Confirm**; then the app runs the same safe server functions the buttons use.
- **Hand-off:** anything it can't handle (complaints, refunds, unusual cases) becomes a message to reception, shown in the admin dashboard.
- Model: Claude Opus 5.5 (`claude-opus-5-5`).
- **Needs from the owner:** an Anthropic account with a little credit and an API key (see todo.md, Task 13).

## Task 14: More admin dashboard areas (owner picked 10 on 2026-11-18)
Built one at a time, in this order; Claude asks before each and asks any missing details first.

| # | Area | How |
|---|---|---|
| 14a | **Door check-in** (tablet) | Today's class lists with big tap targets; tap = present (attendance table), sessions left go down; red warning for expired / unpaid, staff can still let them in |
| 14b | **Edit members + desk registration** | Staff edit a member's details, photo, health, boy/girl; register a member at the desk through the same `register` price check |
| 14c | **Desk payment link** | Staff create a UPayments link for a waiting registration; copy / WhatsApp share, and it also appears in the guardian's app |
| 14d | **Approvals** ✅ | Guardians pause up to 1 week themselves (once per registration); injury pause, change of days and cancelling are requests that reception approves on the Approvals page; reception changes days on the member page; refunds recorded only by owner / accountant (amount + KNET / bank / cash) |
| 14e | **Closure days** ✅ | Close the complex for a day (holidays); every affected registration moves its end date; families notified |
| 14f | **Prices + discounts editor** ✅ | Prices move from code into the database; owner edits tables and discounts; app, `register` and assistant all read the same saved prices |
| 14g | **Staff accounts + roles** ✅ | Owner manages all staff, managers coaches and reception; temporary password shown once, then the person chooses their own; switch off keeps history; reception creates new families at the desk with a WhatsApp login message |
| 14h | **Reports + Excel export** | Members (active, new, not renewed), attendance per class / member, month-over-month; download as Excel |
| 14i | **Money reports** | Revenue by day / month, sport, online vs desk, discounts given (owner + accountant) |
| 14j | **Waitlist** | Class capacity enforced; full class → join waitlist; staff approve when a place opens; family notified |

## Task 15: Light / dark mode choice + Settings screen (mockup approved 2026-11-18)
- Log-in and sign-up: a sun / moon switch at the top, next to the language button.
- New **Settings** screen (gear icon on the home top bar): **Appearance** (Light, Dark, Same as my phone), **Language**, **About the complex**, **Log out**. The language and Log out links leave the top bar.
- The choice is remembered on that phone or browser (also after logging out). New users start on "Same as my phone".
- Code: `theme.ts` reads the saved choice instead of the phone setting; a small theme provider like the language one.

## Task 16: New log-in line + "About the complex" page
- Under the name: **"A family sports center for swimming and jiu-jitsu"** / **"مركز رياضي عائلي للسباحة والجوجيتسو"**, plus a pin with **Mansouriya, Kuwait / المنصورية، الكويت**.
- **About the complex** page (link on log-in + in Settings): swimming card, jiu-jitsu card, ages, opening hours (complex 10:30 AM–9 PM, Saturday to Thursday, Friday closed), class times, open pool times, location with a **Directions** button → https://maps.app.goo.gl/N2awgJRRfiVL3mWy6. No Call button for now.
- Written so more information from the owner can be added later. Only facts the owner gave; no invented claims or photos.

## Task 17: Full timetable (kids Warriors, Titans, adult men and women jiu-jitsu, adult swimming) + open pool
Sources: `docs/pricing/kids-jiujitsu-warriors-schedule-and-prices.jpg`, `docs/pricing/adult-jiujitsu-schedule-and-prices.jpg`, `docs/pricing/titan-male-adult-jiujitsu.jpg`, owner's answers 2026-11-18.

**Jiu-jitsu classes**
| Class | Ages | Times |
|---|---|---|
| Warriors 1 | 5–7 | 4 PM Sat, Mon, Wed · 5 PM Sun, Tue, Thu |
| Warriors 2 | 8–10 (from 11 → Titans) | 4 PM Sun, Tue, Thu · 5 PM Sat, Mon, Wed |
| Adults + Titans (mixed, men and women welcome) | Titans 11–15, adults 16+ | 6:00–7:30 PM Sun–Thu · Gi Thu → Mon, No-Gi Tue and Wed |
| Women | adult women | 7:30–8:30 PM Sun, Tue, Thu |
| Saturday open mat | adults | 6 PM, **free**, not a paid class day |

- The old 4 PM Titans classes are removed.
- Women can mix: any day Sun–Thu at 6 PM, and/or Sun, Tue, Thu at 7:30 PM.
- Class times, length and coaches are **editable in the admin dashboard** (more classes later).

**Swimming:** adult men's swimming 4 PM Sun, Tue, Thu (2 days 75 KD, 3 days 90 KD). Kids swimming stays as today (4 PM / 5 PM, Sun-Tue-Thu or Sat-Mon-Wed groups, same kids' prices); the Warriors sheet is jiu-jitsu only.

**Prices (KD)**
- Kids (unchanged, matches the sheet): 4 weeks 2→65, 3→90, 4→105, 5→120, 6→130 · 2 weeks 3→60, 4→70, 5→80 · 1 week 3→30, 4→35, 5→40.
- Men and Titans, 4 weeks: 2→75, 3→100, 4→110, 5→125 (6→140 kept on the price list for when a Saturday class returns; not selectable now).
- Women, 4 weeks: 2→75, 3→90, 4→105, 5→120 (6→130 kept, not selectable).
- Adults 2 weeks: 3→70, 4→80, 5→90 · 1 week: 3→35, 4→40, 5→45 (Titans: 4 weeks only for now).
- Family and 3/6/12-month discounts: **kids only**.

**Open pool membership (adults, men and women together)**
- 40 KD for 4 weeks from the start date, come any time 10:30 AM–3 PM and 7:30–9 PM, Saturday to Thursday, unlimited visits.
- **Freeze:** once per membership, for 1 week. The member **asks in the app**, reception **approves in the dashboard**, then the end date moves 1 week later.
- **Cancelled by the complex** (admin picks a day or a time window) → members get a notification **and a 1-day extension for each cancelled day** (even if only the morning or evening time was cancelled).

The pricing calculator (with tests), registration, coach view, admin and the About page all learn the new classes. PRD: women's classes move into scope.

## Risks
| Risk | Mitigation |
|---|---|
| AI makes a wrong change | It can't change anything itself; every change needs the guardian's **Confirm** and goes through the existing server rules. |
| AI cost | Short conversations, a daily message limit per guardian, and a spend limit set in the Anthropic console. |
| Chat privacy | Rules enforced in the database, not only on screens; oversight is disclosed in the terms. |
