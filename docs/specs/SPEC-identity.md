# Spec: `identity` (accounts, logins, roles, language)

**Status:** APPROVED by owner on 2026-11-16
**Module:** `identity` (see [CAPABILITY-MAP.md](../../CAPABILITY-MAP.md)), first in the build order
**Depends on:** nothing

Because this is the first module, this spec also sets the **project-wide setup** (folders, commands, code style, testing, boundaries) that every later module follows.

---

## 1. Objective

Everyone who uses the system has **one account** with **one role**, and only sees and changes what that role allows. In the **app**, everyone picks **Arabic or English** first, and the whole interface follows that choice, including right-to-left layout for Arabic. The **admin dashboard is English only**.

Every account has **two ways to log in**, so if one method has a problem (for example, the SMS provider is down or changes), the other still works:
1. **Email + password**
2. **Mobile number + SMS code** (a one-time 6-digit code sent to a Kuwait `+965` number)

### Roles

| Role | Where they log in | How the account is created |
|---|---|---|
| `parent` | App / app website | Signs up alone. An adult swimmer is also a `parent` (they're a "member" on their own account). |
| `coach` | App / app website (coach screens) | Created by super admin or manager. Coach receives an invite. |
| `super_admin` | Admin dashboard | The first one is created during setup. More are added by a super admin. |
| `manager` | Admin dashboard | Created by super admin |
| `receptionist` | Admin dashboard | Created by super admin |
| `accountant` | Admin dashboard | Created by super admin |

Staff and coaches **cannot sign up on their own**. A parent account can never turn itself into staff.

### User stories

1. **Language first:** on the very first screen (before login), I choose **العربية** or **English**. The app remembers my choice. I can change it later in settings.
2. **Parent sign-up:** I create an account with my name, mobile number, email and password, and I confirm my mobile number with an SMS code. Then I'm taken to my (empty) family page.
3. **Login:** I choose **"Email & password"** or **"Mobile number"** (SMS code). Both open the same account. I land on the right home screen for my role: parent home, coach home, or the admin dashboard.
3b. **Switching methods:** if SMS codes aren't arriving, I can still log in with email + password, and the reverse. The super admin can turn either method off temporarily from the dashboard settings without an app update. At least one method must always stay on.
3c. **Second parent:** as a parent, I can invite my spouse by mobile number or email. They get their own login and see and manage the same kids. *(The family sharing rules themselves are built in the `enrollment` module. This module only provides the invite and the account.)*
4. **Wrong place:** if a parent tries to log in to the admin dashboard, they see "This account doesn't have access" and nothing else.
5. **Forgot password:** I get a reset link by email.
6. **Invite staff:** as super admin, I enter a person's name, email and role. They get an email to set a password. I can change their role or **deactivate** them (for example, when a coach leaves). Deactivated users can't log in, but their history stays.
7. **Delete my account:** as a parent, I can delete my account from the app's settings. **Apple requires this.** Payment records are kept for the accountant, without personal details.
8. **Stay logged in:** the app keeps me logged in until I log out.

## 2. Tech stack

| Part | Choice |
|---|---|
| Language | TypeScript everywhere |
| App (iOS, Android, web) | Expo (latest stable SDK at setup), Expo Router, `expo-localization` |
| Admin dashboard | Next.js (latest stable, App Router), Tailwind CSS |
| Backend | Supabase: Postgres database, Auth (email + password **and** phone + SMS code), Row Level Security |
| SMS codes | An SMS provider connected to Supabase Auth (Twilio by default, or a Kuwait provider if cheaper). **Paid per SMS.** |
| Translations | `i18next` + `react-i18next`, Arabic/English text files (app only; admin dashboard is English) |
| Package manager | npm workspaces (one install for the whole repo) |
| Data before Supabase | JSON files in `packages/shared/sample-data/` |

## 3. Commands

Run from the project folder:

```
npm install                      # install everything
npm run dev:mobile               # start the app (scan QR with Expo Go)
npm run dev:admin                # start admin dashboard at http://localhost:3000
npm run test                     # run all tests
npm run lint                     # check code style
npm run typecheck                # check TypeScript types
npx supabase start               # local database (needs Docker), used later in this module
npx supabase db reset            # rebuild local database from migrations + seed data
```

## 4. Project structure

```
apps/
  mobile/            Expo app: parent + coach screens, also exported as the website
    app/             screens (Expo Router: one file = one screen)
    src/             components, hooks
  admin/             Next.js admin dashboard
    app/             pages
    src/             components
packages/
  shared/            used by both apps
    src/i18n/        ar.json, en.json, i18n setup
    src/types/       data types (Profile, Role, ...)
    src/auth/        role rules: who can do what
    sample-data/     JSON practice data
supabase/
  migrations/        database changes, in order
  seed.sql           demo accounts for local testing
  tests/             database security tests
docs/
  specs/             one spec per module
  pricing/           price sheets
CAPABILITY-MAP.md
```

## 5. Code style

- Files: `kebab-case.ts`. React components: `PascalCase`. Database tables and columns: `snake_case`.
- **No hard-coded text** in screens. All text comes from `ar.json` / `en.json`.
- Layout uses `start` / `end`, never `left` / `right`, so Arabic mirrors correctly.
- Permission checks go through **one** shared function, not scattered `if role === ...`.

```ts
// packages/shared/src/auth/permissions.ts
export type Role =
  | 'parent' | 'coach'
  | 'super_admin' | 'manager' | 'receptionist' | 'accountant';

export const STAFF_ROLES: readonly Role[] =
  ['super_admin', 'manager', 'receptionist', 'accountant'];

export function canUseAdminDashboard(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}
```

```tsx
// a screen: text from translations, start/end spacing
<Text style={{ marginStart: 16 }}>{t('auth.welcome')}</Text>
```

## 6. Data (this module only)

`profiles` table, one row per account, linked to Supabase Auth:

| Column | Notes |
|---|---|
| `id` | same id as the login account |
| `full_name` | |
| `phone` | Kuwait mobile, `+965` + 8 digits. Unique. Used for SMS login. |
| `email` | Unique. Used for email login and password reset. |
| `role` | one of the 6 roles. **Only a super admin can change it.** |
| `preferred_language` | `ar` or `en` |
| `is_active` | `false` = deactivated, can't log in |
| `created_at`, `updated_at` | |

**Security rules (enforced in the database, not just hidden in screens):**
- A user can read and edit **their own** profile, except `role` and `is_active`.
- Staff can read all profiles. Only `super_admin` can change roles or deactivate accounts.
- A new sign-up always gets `role = parent`, whatever the app sends.

## 7. Testing strategy

| What | Tool | Where |
|---|---|---|
| Permission rules, phone number check | Vitest | `packages/shared/**/*.test.ts` |
| Database security (a parent can't make themselves staff, can't read other parents) | pgTAP via `supabase test db` | `supabase/tests/` |
| App screens (language switch, login form) | Jest + React Native Testing Library | `apps/mobile/**/*.test.tsx` |
| Admin login and role gate | Vitest + Testing Library | `apps/admin/**/*.test.tsx` |
| By hand | Expo Go on your phone, in Arabic and English | — |

Every security rule in section 6 gets a test that tries to break it.

## 8. Boundaries

- **Always:** run tests and typecheck before each commit. Write every new text in both Arabic and English. Enforce permissions in the database.
- **Ask the owner first:** adding a new role, changing who can see health or payment data, adding a paid service, changing the login method.
- **Never:** commit passwords, API keys or `.env` files. Put the Supabase secret ("service role") key in the app. Use real customer data in sample JSON or tests.

## 9. Success criteria

- [ ] First screen offers العربية / English. Choosing Arabic flips the whole app to right-to-left, and the choice survives closing the app.
- [ ] A parent can sign up, log in, log out, reset their password and delete their account, in both languages, on iPhone (Expo Go) and the website version.
- [ ] The same account can log in **both** with email + password **and** with mobile + SMS code. If the super admin turns one method off, its button disappears and the other still works.
- [ ] A parent can invite a second parent, who gets their own login.
- [ ] The admin dashboard is fully in English.
- [ ] Each of the 6 roles lands on its correct home screen. Parents and coaches are refused by the admin dashboard.
- [ ] A super admin can invite a coach and a receptionist, change a role, and deactivate someone, who then can't log in.
- [ ] Database tests prove that a parent can't change their own role, read another parent's profile, or reactivate themselves.
- [ ] `npm run test`, `npm run lint` and `npm run typecheck` all pass.

## 10. Decisions (owner, 2026-11-16)

1. **Login:** two methods on every account, **email + password** and **mobile + SMS code**, so one can back up the other.
2. **Two parents:** yes, each with their own login, sharing the same kids.
3. **Admin dashboard language:** English only.

## 11. Open questions

1. **SMS provider:** Twilio works with Supabase out of the box (about US$0.05–0.10 per SMS to Kuwait; a few KD a month at your size). A local Kuwaiti SMS provider may be cheaper but needs extra setup. Recommendation: Twilio to start. You'll need to create the account yourself, and I'll guide you.
2. **Sender name:** Kuwait may require a registered sender name for SMS (for example "LOSEGAIN"). We'll check with the provider.
