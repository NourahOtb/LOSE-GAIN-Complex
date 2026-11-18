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

## Task 14: More admin dashboard areas
The owner picks from the list in todo.md (Task 14). Each chosen area becomes its own small task (14a, 14b, ...).

## Risks
| Risk | Mitigation |
|---|---|
| AI makes a wrong change | It can't change anything itself; every change needs the guardian's **Confirm** and goes through the existing server rules. |
| AI cost | Short conversations, a daily message limit per guardian, and a spend limit set in the Anthropic console. |
| Chat privacy | Rules enforced in the database, not only on screens; oversight is disclosed in the terms. |
