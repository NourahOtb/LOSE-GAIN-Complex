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

### 11. Member sign-up + kid photo and boy/girl (11a done, 11b next)
**11a. Sign-up** ✅ done 2026-11-18
- [x] Database: account type + relationship on profiles, "self" members (migration 0007), adult swimming 4 PM classes
- [x] Sign-up: "Create a member account" + "Who is this account for?" (My family / Just me)
- [x] My family → relationship dropdown; "Guardian" wording (EN + AR)
- [x] Just me → own health checklist, emergency contact, adult swimming only, "Me" tab
- [x] "Add myself as a member" for family accounts
- [x] Coaches + admin see "Guardian: name · relationship" / "Adult member"
- [x] Tested in English and Arabic (website); price rule: adults get no family / multi-month discounts (tests added)

**11b. Add a kid: photo + boy/girl**
- [ ] Database: `gender` on kids + private photo storage with security rules
- [ ] Add kid: Boy / Girl (required) + Take a photo / Choose from library (optional)
- [ ] Photo + boy/girl shown on kid cards, coach class list and kid page, admin Kids page
- [ ] Demo kids filled in

- [ ] Test in English and Arabic (phone + website), update docs, commit + push

### 15. Light / dark choice + Settings screen (mockup approved)
- [ ] Saved theme choice (Light / Dark / Same as my phone) used by every screen
- [ ] Sun / moon switch on log-in and sign-up
- [ ] Settings screen: Appearance, Language, About, Log out; gear icon on the top bar
- [ ] Test light + dark in English and Arabic, commit + push

### 16. New log-in line + About the complex page
- [ ] "A family sports center for swimming and jiu-jitsu" + Mansouriya, Kuwait (EN + AR)
- [ ] About page: sports, ages, hours, open pool, location + Directions (Google Maps link)
- [ ] Links from log-in and Settings; test EN + AR, commit + push

### 17. Full timetable + open pool (all questions answered)
- [ ] Classes in the database: Warriors 1 and 2, Adults + Titans 6–7:30 PM (Gi / No-Gi), Women 7:30 PM, men's swimming 4 PM; old 4 PM Titans removed
- [ ] Prices in the calculator (kids, men + Titans, women, 1 / 2 / 4 weeks), with tests; discounts kids only
- [ ] Registration: women can mix 6 PM and 7:30 PM days; Saturday open mat shown as free
- [ ] Open pool membership (40 KD / 4 weeks) + 1-week freeze (member asks, reception approves)
- [ ] Admin: cancel open pool (a day or a time window) → notification + 1 day extension per cancelled day
- [ ] Admin: edit class times, length and coach
- [ ] Coach view, admin and About page show the new classes; PRD updated
- [ ] Test, commit + push

### 12. Guardian ↔ coach chat
- [ ] Database: conversations + messages + security rules (migration 0008)
- [ ] Guardian app: Chat tab → kid → coach → chat screen (live with Realtime)
- [ ] Coach app: Chat tab, unread badge, reply
- [ ] New message → inbox notification
- [ ] Admin: read-only Chats page, "no reply after 12 h" in red
- [ ] Test with two accounts side by side, update docs, commit + push

### 13. AI assistant for guardians
- [ ] **You:** Anthropic account, credit, API key, saved as a Supabase secret (Claude can't type keys for you)
- [ ] Edge Function `assistant` with read tools (family, subscriptions, schedule, prices)
- [ ] "Prepare a change" → Confirm card in the app → existing safe server functions
- [ ] Hand-off to reception → shown in admin
- [ ] Guardian app: Assistant tab (EN + AR), daily message limit
- [ ] Test in both languages, update docs, commit + push

### 14. More admin dashboard areas (you choose which)
- [ ] Owner picks areas from the list Claude gave
- [ ] Each picked area gets its own line here (14a, 14b, ...)
