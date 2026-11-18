# Tasks

See [plan.md](plan.md). One task at a time; Claude asks before starting the next one.

## Phase 1: Wednesday demo (2026-11-18) ✅

- [x] 1. Projects: Expo app, Next.js admin, shared package
- [x] 2. Supabase project + tables + security rules + demo data
- [x] 3. App: language screen, sign up / log in, role-based home
- [x] 4. App: add kid + health checklist
- [x] 5. Shared pricing calculator with tests
- [x] 6. App: registration flow + price summary, parent home
- [x] 7. App: coach view (classes, kids, health badges, level + note)
- [x] 8. Admin: login, registrations, mark paid, expiring soon, kids
- [x] 9. Admin: cancel class → parent notification inbox
- [x] 10. Full demo run-through, fixes, website online
- [x] 10b. Online payment with UPayments (sandbox) + friendly result screens

## Phase 2

### 11. Member sign-up + kid photo and boy/girl ✅
**11a. Sign-up** ✅ done 2026-11-18
- [x] Database: account type + relationship on profiles, "self" members (migration 0007), adult swimming 4 PM classes
- [x] Sign-up: "Create a member account" + "Who is this account for?" (My family / Just me)
- [x] My family → relationship dropdown; "Guardian" wording (EN + AR)
- [x] Just me → own health checklist, emergency contact, adult swimming only, "Me" tab
- [x] "Add myself as a member" for family accounts
- [x] Coaches + admin see "Guardian: name · relationship" / "Adult member"
- [x] Tested in English and Arabic (website); price rule: adults get no family / multi-month discounts (tests added)

**11b. Add a kid: photo + boy/girl** ✅ done 2026-11-18
- [x] Database: `gender` on members + private photo storage with security rules (migration 0008)
- [x] Add kid: Boy / Girl (required; Male / Female for adults) + Take a photo / Choose from library (optional)
- [x] Photo + boy/girl shown on the Family tab, coach class list and kid lists, kid page, admin Members page
- [x] Change or remove a photo later from the Family tab
- [x] Demo kids filled in (Sara and Noor: girl; Yousef and Faisal: boy)
- [x] Tested EN + AR on the website; privacy checked (other families and logged-out visitors can't see photos, coaches can)

### 15. Light / dark choice + Settings screen ✅ done 2026-11-18
- [x] Saved theme choice (Light / Dark / Same as my phone) used by every screen
- [x] Sun / moon switch on log-in and sign-up
- [x] Settings screen: Appearance, Language, Log out; gear icon on the top bar (About comes with Task 16)
- [x] Tested light + dark in English and Arabic; remembered after reload and after logging out

### 16. New log-in line + About the complex page ✅ done 2026-11-18
- [x] "A family sports center for swimming and jiu-jitsu" + Mansouriya, Kuwait (EN + AR)
- [x] About page: sports, jiu-jitsu classes, hours, open pool, location + Directions (Google Maps link); no Call button
- [x] Links from log-in and Settings; tested EN + AR, light + dark
- [ ] Waiting for more information from the owner (edit `apps/mobile/src/lib/about.ts`)

### 17. Full timetable + open pool ✅ done 2026-11-18
- [x] Classes in the database: Warriors 1 and 2, Adults + Titans 6–7:30 PM (Gi / No-Gi), Women 7:30 PM, Saturday open mat (free), men's swimming 4 PM; old 4 PM Titans removed (migration 0009)
- [x] A time per jiu-jitsu day on every subscription; existing members moved to their new class times
- [x] Prices in the calculator (kids, men + Titans, women, 1 / 2 / 4 weeks, open pool), with tests (56 passing); discounts kids only
- [x] Registration adapts to who's joining: kids, Titans, men, women (6 PM or 7:30 PM), open pool; asks male/female if missing
- [x] Open pool membership (40 KD / 4 weeks) + 1-week freeze (member asks, reception approves)
- [x] Admin: close the open pool (day or session) → notification + 1 extra day; freeze requests with Approve / Reject
- [x] Admin: new Classes page to edit time, length, coach, place (owner and manager)
- [x] Coach view, admin Today and About page use the new classes; PRD updated
- [x] Tested on the website: Warriors times, men's prices, open pool, freeze, closure, class edit

### 17b. Security fix: prices calculated on the server ✅ done 2026-11-18
- [x] `register` server function saves registrations with its own price (same rules as the app; a test keeps the two copies identical)
- [x] Members can no longer save a registration or price directly (migration 0010)
- [x] Tested: fake 1 KD price refused, real price charged, other families' members refused, wrong start day refused

### 17c. No clashing classes ✅ done 2026-11-18
- [x] Deleted Sara's clashing registration (swimming Sat/Mon/Wed 4 PM, registered after her jiu-jitsu at the same time)
- [x] Database rule refuses two classes for the same member on the same day and time with overlapping dates (migration 0013)
- [x] `register` explains the clash ("Sara already has a class on Sat at 4 PM"); the assistant gets the same answer
- [x] Register screen warns straight away when swimming and jiu-jitsu clash inside one registration
- [x] Tested: clash refused, 5 PM allowed, after the end date allowed

### 12. Guardian ↔ coach chat ✅ done 2026-11-18
- [x] Database: conversations + messages + security rules (migration 0011); live updates on
- [x] Guardian app: Chat tab → member → coach → chat screen (live)
- [x] Coach app: Chat tab with unread badge; "Message guardian" on a kid's page
- [x] Unread number on the Chat tab (instead of an inbox entry for every message, so the inbox isn't flooded)
- [x] Admin: read-only Chats page (owner + manager), "no reply after 12 h" in red
- [x] Tested with two accounts side by side; privacy checked (other guardians, other coaches and reception can't read)
- [ ] Later: phone push for new messages, automatic 12-hour alert message to the manager

### 13. AI assistant for guardians ✅ done 2026-11-18
- [x] **You:** Anthropic account, credit, API key, saved as the Supabase secret `ANTHROPIC_API_KEY`
- [x] Server function `assistant` with read tools (family, timetable, price list, exact price check)
- [x] "Prepare a registration / payment" → Confirm card in the app → the same safe `register` server check and payment flow
- [x] Hand-off to reception → "Assistant requests" on admin Today, reply → guardian's inbox
- [x] App: "Ask the assistant" on Home and in Chat (EN + AR), daily limit 40 messages
- [x] Tested for real in English and Arabic: questions (it knows the current time), renewal card + Confirm, hand-off + reply; plain-text answers; Arabic cards

### 14. More admin dashboard areas (owner picked 10) ⏳ one at a time
- [ ] 14a. Door check-in (tablet): tap to mark present, sessions go down, red warnings
- [ ] 14b. Edit members + register at the desk
- [ ] 14c. Desk payment link (copy / WhatsApp, also in the app)
- [ ] 14d. Approvals: pause, switch, refund requests
- [ ] 14e. Closure days: close the complex, end dates move, families notified
- [ ] 14f. Prices + discounts editor (prices saved in the database)
- [ ] 14g. Staff accounts + roles
- [ ] 14h. Reports + Excel export
- [ ] 14i. Money reports
- [ ] 14j. Waitlist with class capacity

