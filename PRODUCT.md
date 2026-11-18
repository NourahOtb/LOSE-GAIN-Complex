# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Expo (React Native + Expo Router) for the parent/coach app, shipped to iOS, Android and the web with **one shared look** (not per-OS native styling). Next.js + Tailwind for the staff admin dashboard. Supabase backend. Monorepo: `apps/mobile`, `apps/admin`, `packages/shared`.

## Users

- **Parents** in Kuwait (often busy, on their phone, sometimes in the parent viewing area while their kid is in class) managing one to five kids' swimming and jiu-jitsu classes: what's next, how many sessions are left, when to renew, what the coach said.
- **Coaches** between and during classes, on their phone poolside or on the mats: who's in this class, what level, any health issue, update a level, leave a note.
- **Staff** (super admin/owners, manager, receptionist, accountant) at the front desk on a desktop, and at the door on a tablet during the busy 4pm and 5pm rush: registrations, payments, expiring subscriptions, cancelling a class.

## Product Purpose

Replace the receptionist's Excel file and WhatsApp threads with one system for LOSE | GAIN Complex (swimming + Brazilian jiu-jitsu, Mansouriya, Kuwait). Success: every kid's level, health information, schedule and renewal date in one place; parents serve themselves; staff stop chasing renewals and answering "is class cancelled?" messages.

## Positioning

A single complex with two sports under one roof, rolling enrollment (start any day), and mixed-sport schedules a parent builds per kid, priced by total days per week. Coaches are fixed per day group (Sun/Tue/Thu or Sat/Mon/Wed) in swimming. The app reflects this specific way of running classes, not a generic gym booking tool.

## Operating Context

- Open Saturday to Thursday; classes at 4pm and 5pm (seasonal changes). Friday closed.
- Swimming: Olympic pool upstairs, kids' pool downstairs; several levels per class slot, 1–2 coaches per level. Jiu-jitsu: two mats, parent viewing areas. Kids 5–11, Titans 11–15, adult men's swimming.
- Payment online (UPayments) or at the desk (KNET machine / payment link). Prices in KD with 3 decimals.
- Current tools being replaced: Excel and WhatsApp.

## Capabilities and Constraints

- Full scope in [PRD.md](PRD.md). **Built for the Wednesday 2026-11-18 demo** ([tasks/plan.md](tasks/plan.md)): parent sign-up, add kid with health checklist, registration with real price calculation, parent home, coach view (kids, health badges, level + note, belts and stripes), admin (registrations, mark paid, expiring soon, cancel class → parent inbox), and **online payment with UPayments (sandbox)** with a friendly result screen for every outcome (paid, cancelled, failed, still waiting, service down) and a way back to the app from each.
- **Next (phase 2, in progress):** guardian wording + relationship to the kid, parent ↔ coach chat, the AI assistant for parents, and more admin dashboard areas (door check-in, member page, payment links, approvals and closure days are done: guardians pause up to a week themselves and send other requests, which reception approves; closing the complex adds the missed classes to the end of each registration). Progress in [tasks/todo.md](tasks/todo.md).
- App in Arabic and English with full right-to-left layout; admin dashboard English only.
- Light or dark mode is the member's choice (sun / moon switch on log-in and sign-up; Settings → Appearance: Light, Dark, Same as my phone). Default: same as the phone.

## Brand Commitments

- Name: **LOSE | GAIN Complex**. Logo: thin "LOSE", vertical rule, bold "GAIN", widely spaced "COMPLEX" (`PHOTO-2026-11-12-15-29-39.jpg`).
- Black and white base; one accent color per sport, used for badges and calendar only (confirmed by owner).
- Must NOT feel: childish (cartoon colors, bubbly shapes), cold/corporate (bank or spreadsheet), aggressive/gym-bro (dark, shouty fight-club), or busy (too many colors, cards, badges). Parents of 5-year-olds and owners of a premium complex are the audience.

## Evidence on Hand

- Logo image (above). Real price sheets in `docs/pricing/`.
- No photos of the facility, pools or classes yet; no Instagram assets provided. Do not invent testimonials, member counts or facility claims. Pool sizes and number of swimming levels are not confirmed.

## Product Principles

1. **One glance answers "what's next?"** for a parent or coach, without digging.
2. **Health first:** a kid's health condition is never more than one look away for coaches and staff.
3. **Self-service within clear limits:** the app does the routine; staff handle the exceptions.
4. **Both languages are first-class:** Arabic layouts are designed, not mirrored as an afterthought.
5. **Calm under the rush:** the 4pm door and the poolside need large, fast, unambiguous controls.

## Accessibility & Inclusion

- Arabic (RTL) and English (LTR) across the app.
- Large tap targets for poolside and tablet use; readable in bright light and in dark mode.
