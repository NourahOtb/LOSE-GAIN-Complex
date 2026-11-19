# LOSE | GAIN Complex

The digital platform for **LOSE | GAIN Complex**, a swimming and Brazilian jiu-jitsu center in Mansouriya, Kuwait. It replaces the Excel sheet and WhatsApp chats the receptionist used to run registrations, renewals, pauses, levels and health notes.

It has three parts that share one backend:

| Part | Who uses it | Code | Live |
|---|---|---|---|
| **App** (iPhone, Android and web) | Parents, adult members, coaches | `apps/mobile` | https://lg-complex-app.vercel.app |
| **Admin dashboard** (web, desktop + tablet) | Owner, manager, reception, accountant | `apps/admin` | https://lg-complex-admin.vercel.app |
| **Backend** (database, auth, server functions) | Both of the above | `supabase/` | Supabase project `zpvohapojhbmchmblrix` |

What the product does and why: [PRD.md](PRD.md). Plain-language product summary: [PRODUCT.md](PRODUCT.md).

---

## Quick start

**You need:** Node.js 22 and npm. For the phone: the **Expo Go** app on your phone (same Wi-Fi as your computer).

```bash
npm install
```

Create the two environment files (the values are in the Supabase dashboard → Project Settings → API; use the **publishable** key, never the secret one):

```bash
cp apps/mobile/.env.example apps/mobile/.env
```

```bash
cp apps/admin/.env.example apps/admin/.env.local
```

Run the app (press `w` for the browser, or scan the QR code with Expo Go):

```bash
npm run dev:mobile
```

Run the admin dashboard on http://localhost:3000:

```bash
npm run dev:admin
```

Both apps talk to the **live** Supabase project; there is no local database. Demo log-ins (one shared password) are in `docs/demo-accounts.local.md`, a file kept only on the owner's Mac and never committed. [DEMO.md](DEMO.md) lists every demo account and what it shows.

## Commands

Run from the repository root.

| Command | What it does |
|---|---|
| `npm run dev:mobile` | Start the app with Expo (web, iOS, Android, Expo Go) |
| `npm run dev:admin` | Start the admin dashboard (Next.js) |
| `npm test` | Run the unit tests (prices, schedule, dates, phone numbers) |
| `npm run typecheck` | Type-check the shared package and both apps |
| `npm run lint -w mobile` | Lint the app |
| `npm run lint -w admin` | Lint the dashboard |
| `npm run build -w admin` | Production build of the dashboard |

## How the code is organized

```
apps/
  mobile/                 Expo app (Expo Router). One codebase for iPhone, Android and the web app.
    src/app/              Screens. The file path is the route: parent/register.tsx → /parent/register
      parent/             Families: home, family, register, chat, inbox
      coach/              Coaches: classes, kids, chat, private classes
      kid/[id].tsx        One member's page (coach view)
      manage/[id].tsx     Pause or change a registration
    src/components/       Shared UI pieces (pickers, date field, avatar, belt, header…)
    src/lib/              Data loading, auth, theme, i18n and all texts (strings.ts, English + Arabic)
  admin/                  Next.js dashboard
    src/app/(dashboard)/  One folder per page: approvals, check-in, closures, money, reports, staff…
    src/app/actions.ts    Server actions (every one checks the staff role first)
    src/components/       Forms and widgets used by the pages
    src/lib/              Data loading, reports, money, labels shared by forms
packages/
  shared/                 Logic used by both apps: prices and discounts, schedule, dates, phone numbers.
                          The only package with unit tests.
supabase/
  migrations/             Database changes, numbered and applied in order (0001 … 0027)
  functions/              Server functions (Deno): register, upayments, accounts, assistant
  tests/                  security-check.sql: checks the access rules per role
  seed.sql                The first demo data (the current demo data is described in DEMO.md)
scripts/
  deploy.sh               Manual build and upload of both websites to Vercel
  sync-pricing.sh         Copies the price rules into the server functions (see below)
docs/                     Specs, price sheets, security review, submission material
tasks/                    Plan and to-do list, updated after every step
```

## How it works

### Data and permissions
- The database is **Supabase Postgres**. Every table has **row-level security**: the database itself decides who can read or change each row. The apps only ever use the **publishable** key and the logged-in user's session.
- **Roles** (column `profiles.role`): `parent`, `coach`, `receptionist`, `accountant`, `manager`, `super_admin` (the owner). Permission helpers live in SQL, for example `is_staff()`, `can_approve()`, `can_refund()`. A switched-off account has no role at all.
- Actions that need more than one table, or the secret key, run in **security-definer SQL functions** or **server functions**, which check the caller's role first.
- To change the database, add a new numbered file in `supabase/migrations/` and apply it to the project. Never edit an old migration: they are the history.

### Server functions (`supabase/functions/`)
| Function | Purpose |
|---|---|
| `register` | Checks a registration (age, days, capacity, overlap), prices it, saves it |
| `upayments` | Online payment with KNET through UPayments (test mode until live keys are added) |
| `accounts` | Staff accounts, new families at the desk, temporary passwords |
| `assistant` | The AI assistant for parents (Claude), with consent and daily limits |

Their secrets are set in Supabase (Edge Functions → Secrets), never in the code: `ANTHROPIC_API_KEY`, `UPAYMENTS_BASE_URL`, `UPAYMENTS_TOKEN`. `SUPABASE_URL`, `SUPABASE_ANON_KEY` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase automatically.

### Prices
All price rules are in `packages/shared/src/pricing.ts`. The owner's current numbers are saved in the database (`pricing` table, edited on the dashboard's Prices page) and override the defaults.

The server functions can't import the shared package, so they use a **copy**. After changing `pricing.ts`, run `scripts/sync-pricing.sh`, then redeploy the `register` and `assistant` functions. `npm test` fails if the `register` copy differs (the `assistant` copy is not checked yet).

### Languages
Every text the app shows is in `apps/mobile/src/lib/strings.ts`, in English and Arabic, with right-to-left layout for Arabic. Add new texts there in **both** languages. The dashboard is English only.

## Deploying

- **Websites:** pushing to `main` on GitHub deploys both automatically through Vercel (about 2 minutes). `scripts/deploy.sh` does the same by hand.
- **Database:** apply new migrations to the Supabase project.
- **Server functions:** deploy the changed function to Supabase.
- **App stores:** not published yet (planned with EAS Build).

## Conventions

- Comments explain **why**, in plain words, not what the line does.
- Business rules live in one place: price and schedule logic in `packages/shared`, access rules in SQL.
- Never put secret keys in either app or in git. `.env` files and `*.local.md` files are ignored by git.
- After each feature: test it in the browser, update [PRD.md](PRD.md), [DEMO.md](DEMO.md) and [tasks/todo.md](tasks/todo.md), then commit.

## Known gaps

From the code review on 19 Nov 2026, worth doing next:
- Some lists (relationships, health options) are repeated in several files instead of one shared place.
- The Register and coach Classes screens are long and would read better split into smaller parts.
- Database types are written by hand; Supabase can generate them.
- Only the shared logic has tests; the server functions and screens have none.
- No automatic checks (lint, types, tests) run on GitHub when code is pushed.

## More documentation

| File | What's in it |
|---|---|
| [PRD.md](PRD.md) | Full product requirements: users, business rules, every feature |
| [PRODUCT.md](PRODUCT.md) | Short product summary and current status |
| [CAPABILITY-MAP.md](CAPABILITY-MAP.md) | The modules and how they fit together |
| [DEMO.md](DEMO.md) | Demo accounts, demo families and the presentation script |
| [docs/specs/](docs/specs/) | Technical specs per module |
| [docs/pricing/](docs/pricing/) | The owner's price sheets |
| [docs/security-review-2026-11-19.md](docs/security-review-2026-11-19.md) | Security review and fixes |
| [tasks/plan.md](tasks/plan.md), [tasks/todo.md](tasks/todo.md) | Build plan and progress |
