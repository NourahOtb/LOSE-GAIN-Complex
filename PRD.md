# PRD: LOSE | GAIN Complex — Member App & Admin Dashboard

| | |
|---|---|
| **Product** | LOSE \| GAIN Complex digital platform |
| **Owner** | LOSE \| GAIN Complex management |
| **Location** | Mansouriya, Kuwait |
| **Version** | 1.2 (draft) |
| **Date** | 2026-11-18 |
| **Status** | Draft for owner review. Updated after the detailed interview. |
| **Related** | [CAPABILITY-MAP.md](CAPABILITY-MAP.md) (approved) · [docs/specs/](docs/specs/) (technical specs per module) · [docs/pricing/](docs/pricing/) (price sheets) |

---

## 1. Summary

LOSE | GAIN Complex offers **swimming** and **Brazilian jiu-jitsu** classes for kids (5–11), teens ("Titans", 11–15, jiu-jitsu) and adults (men's swimming). Today, registrations, renewals, pauses, cancellations, kids' levels and health notes are handled in **Excel and WhatsApp** by the receptionist. That's slow, error-prone and a poor experience for parents.

We are building:

1. **A mobile app** (App Store + Google Play) that also runs as a **website**, with three experiences:
   - **Parents:** register kids (and themselves), manage subscriptions, pay, chat with coaches. Plus an **AI assistant** for parents (moved into version 1 on 2026-11-18, see 7.9).
   - **Coaches:** manage classes, see and assess kids, write notes, chat with parents, run private classes.
   - **Teens (Titans):** a view-only login to see their own schedule, level and notes.
2. **An admin dashboard** (website, desktop + tablet) for management and staff to control everything, including door check-in.
3. **One shared backend** so everything is always in sync.

## 2. Problem

| Today | Impact |
|---|---|
| Receptionist logs every registration and renewal manually in Excel | Time-consuming, mistakes, no single source of truth |
| Renewals, pauses and cancellations happen over WhatsApp | Requests get lost, no history, unprofessional experience |
| Kids' levels aren't recorded centrally | Parents can't see progress; coaches rely on memory |
| Health conditions are not asked about at registration and not stored anywhere | Safety risk in the pool and on the mats; coaches don't know about asthma, allergies, injuries |
| Renewal reminders are sent manually by the receptionists, one parent at a time | Very time-consuming; reminders are late or forgotten, which means missed renewals and lost revenue |
| When a class is cancelled, parents call or message on WhatsApp to ask about it | WhatsApp becomes a mess, and the receptionists are constantly distracted from their work |

## 3. Goals & success metrics

| Goal | How we measure it (3 months after launch) |
|---|---|
| Replace Excel and WhatsApp for registrations and renewals | 100% of new registrations and renewals go through the app or dashboard |
| Fewer missed renewals | Every expiring subscription gets automatic reminders; renewal rate is tracked month over month |
| Every kid's level and health info in one place | 100% of active kids have a level and a completed health checklist |
| Less receptionist workload | No separate Excel file; no manual renewal reminders; no WhatsApp questions about cancelled classes |
| Parents can serve themselves | Most pauses, reschedules and renewals are done in the app without staff |
| Parents informed of changes | Every class cancellation reaches affected parents (push, or WhatsApp for website-only parents) |
| Coaches respond to parents | Messages unanswered for 12 hours are flagged to the manager; this number goes down over time |

## 4. Users

| User | Needs | Uses |
|---|---|---|
| **Parent** | Register kids quickly, see schedule, level and remaining sessions, pay, pause or renew, talk to coaches | App / app website |
| **Second parent** (spouse) | Same as parent, same kids, own login | App / app website |
| **Adult member** (adult classes) | Same as a guardian, for themselves | App / app website ("Just me" member account, or a family account that adds "myself as a member") |
| **Teen** (Titans, 11–15) | See own schedule, level and coach notes | App / app website, **view only** |
| **Coach** | Know who's in each class, kids' levels and health, update levels, write notes, chat with parents, manage private classes | App / app website (coach screens). A coach who is also a parent switches between **Coach** and **My family** with one login. |
| **Super admin** (owners) | Full control: prices, discount rules, staff, money, audit log, all data | Admin dashboard |
| **Manager** | Classes, coaches, substitutes, schedules, kids, approvals, chat oversight | Admin dashboard |
| **Receptionist** | Door check-in, registrations, desk payments, kid photos, requests and approvals | Admin dashboard: **desktop** for admin work, **tablet** at the door |
| **Accountant** | Payments, refunds, money reports, coach session reports | Admin dashboard |

## 5. Scope

### In version 1
- Mobile app (iOS + Android) and the same app as a responsive website
- Parent, coach and teen (view-only) experiences
- Admin dashboard with 4 staff roles, usable on desktop and tablet
- App in Arabic and English (full right-to-left layout for Arabic); admin dashboard in English
- Two login methods on every account: email + password, and mobile + SMS code
- Two parents per family, each with their own login
- Online payments (UPayments) and desk payments (KNET machine, UPayments payment link)
- Receipts in the app (PDF) and by email
- Door check-in and attendance by the receptionist
- Make-ups, waitlists, closure days with automatic extensions
- Push notifications, an in-app notification inbox, and WhatsApp messages for urgent news to website-only parents
- Parent ↔ coach chat, with manager oversight
- Private classes (request → coach arranges → paid through the complex)
- Reports with month-over-month insights, plus Excel export
- Full audit log
- One-time import of current members from Excel before launch

### Out of scope for version 1
- **Online store** (goggles, caps, towels, apparel) → version 2
- **Automatic renewal** (auto-charging cards) → not planned; renewal is always manual
- **Coach payroll** → reports only, no salary calculation
- LOSE | GAIN **Center** (the separate fitness center with monthly programs) → not part of this product

## 6. Business rules

### 6.1 Sports, ages and schedule
- **Swimming** and **jiu-jitsu**, open **Saturday to Thursday** (Friday closed).
- Kids classes: **ages 5–11**. Under 5 only by coach exception after a trial.
- **Jiu-jitsu timetable** (updated 2026-11-18, owner's sheets in `docs/pricing/`):
  - **Warriors 1 (5–7):** 4 PM Sat/Mon/Wed · 5 PM Sun/Tue/Thu
  - **Warriors 2 (8–10):** 4 PM Sun/Tue/Thu · 5 PM Sat/Mon/Wed (from 11 a kid moves to Titans)
  - **Titans (11–15) and adults:** one class, **6–7:30 PM, Sunday to Thursday**. Gi Thursday → Monday, No-Gi Tuesday and Wednesday.
  - **Women:** 7:30–8:30 PM Sun/Tue/Thu. Women may also join the 6 PM adult class on any day.
  - **Saturday open mat:** 6 PM, **free** (not a paid class day).
  - Because kids' times change by day, each subscription keeps **a time per jiu-jitsu day**.
- **Adult men's swimming:** 4pm, Sun/Tue/Thu.
- **Open pool membership** (adults, men and women together): 10:30 AM–3 PM and 7:30–9 PM, Saturday to Thursday, unlimited visits, **40 KD for 4 weeks**. **Freeze once for 1 week** (member asks in the app, reception approves; end date +7 days). Staff can **close the pool** for a day or one session: members are notified and get **1 extra day per closed date**.
- The complex is open **10:30 AM–9 PM**.
- Staff (owner, manager) **edit class times, length, coach and place** in the admin dashboard; jiu-jitsu members move with their class.
- Classes are **mixed boys and girls**.
- Class times: **4pm and 5pm**. Jiu-jitsu time depends on age group. Times change by season (for example, about 3 classes a day in summer), so staff must be able to edit them.
- Swimming: **two pools** (Olympic pool upstairs, kids' pool downstairs). Kids use either, based on level.
- Jiu-jitsu: **two mats** on the same floor. Parents can watch from viewing areas.
- One swimming class slot holds **several levels**, each with **1–2 coaches**.
- **Day choice is free:** parents can pick **any** days from Saturday to Thursday (for example Tue + Thu, Thu + Sun, or Sun + Wed).
- **Recommended day groups:** swimming coaches are fixed per group, so the app **highlights** **Sun/Tue/Thu** or **Sat/Mon/Wed** (or 2 days from one group) as recommended. It's a suggestion, not a rule.
- Enrollment is **rolling**: kids can start any day.

### 6.2 Prices (kids 5–15)

| Duration | 2 days/wk | 3 days/wk | 4 days/wk | 5 days/wk | 6 days/wk |
|---|---|---|---|---|---|
| **1 week** | — | 30 KD | 35 KD | 40 KD | — |
| **2 weeks** | — | 60 KD | 70 KD | 80 KD | — |
| **4 weeks** | 65 KD | 90 KD | 105 KD | 120 KD *(jiu-jitsu only)* | 130 KD *(jiu-jitsu only)* |

**Adults (men's swimming), 1 month:** 2 days/week = 75 KD · 3 days/week = 90 KD.

**Adult jiu-jitsu** (Sunday to Thursday; family and multi-month discounts are **kids only**):

| | 2 days | 3 days | 4 days | 5 days | 6 days* |
|---|---|---|---|---|---|
| **Men, 4 weeks** | 75 | 100 | 110 | 125 | 140 |
| **Women, 4 weeks** | 75 | 90 | 105 | 120 | 130 |
| **Men / women, 2 weeks** | — | 70 | 80 | 90 | — |
| **Men / women, 1 week** | — | 35 | 40 | 45 | — |

\*6 days stays on the price list for when a Saturday class returns; it can't be chosen now. **Titans (11–15)** pay the **men's 4-week** prices (4 weeks only), and still count for the family discount. Swimming and jiu-jitsu are registered separately for adults and Titans.

**Open pool:** 40 KD per 4 weeks, no discounts.

- **Mixed sports:** price is based on **total class days per week** across both sports. Example: 2 days swimming + 2 days jiu-jitsu = 4 days = **105 KD** for 4 weeks.
- **Swimming and jiu-jitsu on the same day count as 2 days** (each class counts).
- **Longer subscriptions** (3, 6 and 12 months) are built from the 4-week price, with the multi-month discount applied.
- **Private classes:** each coach sets their own price. Payment goes through the complex.

### 6.3 Discounts

| Family discount (kids under one parent) | | Multi-month discount | |
|---|---|---|---|
| 2 kids | 7% | 3 months | 15% |
| 3 kids | 10% | 6 months | 25% |
| 4 kids | 12% | 12 months | 30% |
| 5 kids | 15% | | |

- Discounts **add up** (for example, 2 kids for 3 months = 7% + 15% = 22% off).
- The family discount counts **kids only**, not adult members.
- **Kids joining at different times:** the first kid pays full price. When a second kid joins, the discount applies to the new kid right away, and to everyone in the family from their **next renewal**.
- **Super admin can change the prices and discount percentages** in the dashboard (**Prices**, built 2026-11-18, see 7.5f). Whether discounts add up and who counts as family stay as set in code for now.
- Amounts are shown in **KD with 3 decimals** (for example, 96.750 KD).

### 6.4 Trials
- **Free.** Held on **Thursdays or Saturdays** within normal classes. The admin sets which days and slots.
- A parent can **either** book a trial first **or** buy a package directly.
- After the trial or first class, the **coach sets the kid's level**.

### 6.5 Sessions, attendance and make-ups
- **Attendance** is taken by the **receptionist at the door**, tapping names on today's class list.
- **Missed class without notice:** the parent can book a **limited number of make-ups** per subscription. The admin sets the number (default: 2 per 4 weeks).
- **Unused sessions expire** on the subscription end date. They don't carry over.
- **When the complex cancels a class** (coach sick, maintenance), staff choose for that cancellation: give a **make-up credit**, **extend the end date**, or **nothing**. Parents are notified either way.
- **Closure days** (National Day, Eid, Ramadan changes): the owner, a manager or reception closes a date or a range. Affected subscriptions **extend automatically** by the classes they miss, and parents are notified. *(Built 2026-11-18, see 7.5e.)*

### 6.6 Capacity and waitlist
- Each class and level has a **maximum number of kids**, set by the admin.
- When it's full, the parent can **join a waitlist** (first come, first served) and is notified when a spot opens.
- The **receptionist or coach** can approve a kid **over the limit**.

### 6.7 Changes by parents (self-service within limits)
- **Cancel a class = reschedule it:** a parent cancelling a single class (self-service, within the notice rule set by the admin, *notice period TBD*) keeps the session and books it on another day. The session is not lost.
- **Pause:** up to **1 week** self-service (starts at once, **once per registration**, the end date moves by the paused days). Longer pauses are for **injuries only** and need **reception approval** (owner / manager / receptionist; coaches can see the reason). *(Updated 2026-11-18: reception approves, not coaches.)*
- **Cancel a membership:** different from cancelling a class. The parent sends a request, and a **receptionist handles it**. **Refunds are decided by the admin** case by case.
- **Switching** sport, day group or time **mid-subscription**: not allowed by default, because the package stays as is until it ends. A parent can **request an exception**, which the **receptionist approves**.
- **Renew:** always manual (no automatic charging). The parent picks the same package or a new one.

### 6.8 Moving up (age and level)
- When a kid reaches a new age group (for example, turns 11 and becomes a Titan) or is ready for a new level, the **system flags it** and **staff confirm** the move. The parent is notified, including any schedule change.

### 6.9 Payments and receipts
- **Online** through **UPayments**. **At reception:** **KNET machine** or a **UPayments payment link** sent to the parent. Staff record the method.
- **No clashing classes:** a member can't be booked into two classes on the same day at the same time while the dates overlap (for example swimming and jiu-jitsu both Saturday 4 PM). The database refuses it for every path (app, assistant, staff); the app and the assistant explain which day and time clash. *(Added 2026-11-18.)*
- **Prices are calculated on the server.** The app shows a price preview, but the registration and its price are saved only by the `register` server function, which checks the member belongs to the account, works out class times and the family discount itself, and uses the same price rules as the app. Members can't write registrations directly. *(Added 2026-11-18.)*
- A subscription becomes active once it's paid. Online, it only becomes active after our server asks UPayments itself and sees the payment captured **for the right amount**.
- **Every online outcome ends back in the app with a friendly screen:** paid, cancelled ("no money was taken" + Try again / Pay at reception), failed, still waiting (checks again by itself), or payment service down (Check again). If the parent leaves the payment page any other way, the home screen checks by itself. Payment links expire after 15 minutes. *(Built 2026-11-18 on the UPayments sandbox.)*
- **Expired or unpaid kid at the door:** the check-in screen shows a **red warning**, but the receptionist can still let them in and collect payment on the spot.
- Every payment produces a **receipt**: PDF in the app, plus an email.

### 6.10 Registration requirements
- **Health checklist (required for every kid and adult member):** asthma, allergies, epilepsy, heart condition, recent injury or surgery, medications, other (text), or "none". Anything ticked shows a **red health badge** to coaches and reception.
- **Required agreements:** terms & rules (including the pause and refund policy) and a liability waiver.
- **Required emergency contact:** a second phone number.
- **Kid photo:** optional but recommended. Guardians **take a photo or choose one from the library** when adding a kid, and can change or remove it later from the Family tab. The receptionist can upload one or take it on the spot (admin upload: later). Photos are stored **privately**: only that family, coaches and staff can open them. *(Built 2026-11-18.)*
- **Boy or girl (required):** asked for every new kid (**Boy / Girl**) and adult member (**Male / Female**), and shown next to the name, because names can be confusing.

### 6.11 Renewal reminders (automatic)
- **7 days**, **3 days** and **1 day** before expiry, **on the expiry day**, and **2 days after**.

### 6.12 Chat rules *(built 2026-11-18)*
- Guardians open a chat from the **Chat** tab: pick the member, then one of that member's coaches (taken from their classes). Coaches see every guardian who wrote, and can also start from a kid's page (**Message guardian**). Messages appear **live**, with a red unread number on the Chat tab and ✓✓ when read.
- The admin **Chats** page (owner and manager only, read only) lists every chat and marks in red any guardian waiting **12+ hours** for a coach reply. Receptionists and other coaches can't read chats.
- *Not yet:* phone push for new messages (comes with push notifications), and an automatic alert message to the manager after 12 hours (the Chats page shows it for now).
- Parents can message coaches **anytime**. There's no reply-time promise.
- If a parent's message has **no reply after 12 hours**, the **manager is notified**.
- **Managers and super admins can read** parent ↔ coach chats. Parents are told this in the terms.

### 6.13 Coaches
- Coaches' class changes (add, remove, cancel) go **live immediately**, and affected parents are notified.
- Coaches see **all kids in their sport**, including health information.
- **Absence:** the manager can set a **substitute for specific dates**, or **permanently reassign** a coach's classes and open chats. Parents are notified of the change.
- **Private classes:** the parent **sends a request**, and the coach (or reception) **arranges the time** and adds it. The coach sets the price, and the complex is paid.

## 7. Features

### 7.1 Everyone
- First screen of the app: choose **العربية / English** (can be changed later in settings). The admin dashboard is English.
- Sign up, log in, forgot password, log out. Sign-up is **"Create a member account"** and first asks **"Who is this account for?"**:
  - **My family** ("I'm registering my kids"): asks the **relationship to the kids** (father, mother, grandfather, grandmother, brother, sister, uncle, aunt, other / legal guardian). In the app this person is the **guardian (ولي الأمر)**. They can also **add themselves as a member**.
  - **Just me** ("I'm joining myself"): the adult fills in their own health checklist and emergency contact right after sign-up and registers for **adult classes only**. A "Just me" account can't add kids.
  - Coaches and staff see "Guardian: name · relationship" or "Adult member". *(Built 2026-11-18.)*
- **Two ways to log in** to the same account: **email + password** or **mobile number + SMS code**. If one has a problem, the other still works. The super admin can switch either off temporarily.
- A parent can **invite a second parent** (spouse), who gets their own login to the same kids.
- A parent can create a **view-only login for a teen** (Titans).
- A coach who is also a parent switches between **Coach** and **My family** views.
- Parents can delete their account in the app (required by Apple).
- **Light or dark mode is the member's choice** (changed 2026-11-18): a sun / moon switch on the log-in and sign-up screens, and **Settings → Appearance: Light, Dark, or Same as my phone**. The choice is remembered on that phone or browser, also after logging out. New users start on "Same as my phone".
- **Settings** (gear icon at the top of every signed-in screen): Appearance, Language, About the complex, Log out.
- **Log-in screen line:** "A family sports center for swimming and jiu-jitsu" with **Mansouriya, Kuwait** under it.
- **About the complex** page (link on the log-in screen, no log-in needed, and in Settings): both sports, jiu-jitsu class times, opening hours (Saturday to Thursday 10:30 AM–9 PM, Friday closed), open pool times and price, and the location with a **Directions** button (Google Maps). No Call button for now. Content lives in one file (`apps/mobile/src/lib/about.ts`) so more owner information can be added easily. *(Built 2026-11-18.)*

### 7.2 Parent app

| Section | What parents can do |
|---|---|
| **Home** | One card per kid (and themselves): **today's or next class** (time, pool/mat, coach), **remaining sessions**, **make-ups left**, and alerts ("renew in 3 days", "class cancelled", "waitlist spot open"). Below it, a **family calendar** (weekly, swipe between weeks) with every kid's classes, color-coded by sport. |
| **Register** | Step-by-step flow, **one cart for several kids**: who (add kid → health checklist → photo → emergency contact) → sport(s) → trial or package → days and time (guided to the recommended day groups; full slots offer the waitlist) → duration → **first class** (any of the chosen class days in the next 2 weeks; today only if the class hasn't started) → price summary with discounts and start/end dates → agreements → pay online, or pay at reception |
| **Kid profile** | Personal info, photo, **health checklist**, level and level history, coach notes; parent can add notes for coaches |
| **Manage** | Reschedule, book a make-up, pause (with an injury request for longer), request a switch, cancel, renew |
| **Private classes** | Request a private class with a coach, see upcoming private sessions |
| **Chat** | Message the kid's coach |
| **Notifications** | Inbox for everything important |
| **Payments** | Payment history and receipts (PDF) |
| **Settings** | Language, invite second parent, teen login, login methods, delete account |

### 7.3 Teen view (view-only)
- Own schedule, level, coach notes and notifications. No chat, no payments, no changes.

### 7.4 Coach app

| Section | What coaches can do |
|---|---|
| **Classes** | See all classes and who's in them (with health badges and attendance), add or remove classes, **cancel a scheduled class** (parents are notified right away), approve a kid over the limit |
| **Kids** | All kids in their sport, grouped by **Sun/Tue/Thu** and **Sat/Mon/Wed**. **Inactive kids** are in a separate tab. Open a profile: photo, level, health, notes |
| **Assess** | Update a kid's level, write notes the parent can see, read parent notes, approve injury pauses |
| **Chat** | Reply to parents |
| **Private classes** | See requests, arrange times, track and manage sessions, set their price |

### 7.5 Admin dashboard

| Area | Super admin | Manager | Receptionist | Accountant |
|---|:-:|:-:|:-:|:-:|
| Overview (active kids, expiring soon, today's classes, revenue) | ✓ | ✓ | ✓ (no revenue) | ✓ |
| **Door check-in** (tablet: today's class lists, tap to mark present, red warnings) | ✓ | ✓ | ✓ | — |
| Kids & families (profiles, health, photos, levels) | ✓ | ✓ | ✓ | — |
| Registrations & subscriptions (incl. waitlists, move-up suggestions) | ✓ | ✓ | ✓ | view |
| Classes, schedule, capacity, trial days, closure days, cancel classes | ✓ | ✓ | ✓ (cancel) | — |
| Coaches, substitutes & private classes | ✓ | ✓ | view | — |
| Approvals (long pauses, switches, over-limit, refunds) | ✓ | ✓ | ✓ (not refunds) | ✓ (refunds) |
| Desk payments (KNET, payment link) | ✓ | ✓ | ✓ | ✓ |
| Chat oversight (read chats, unanswered alerts) | ✓ | ✓ | — | — |
| Payments, refunds, money reports | ✓ | — | — | ✓ |
| Reports & insights (+ Excel export) | ✓ | ✓ (no money) | — | ✓ (money) |
| Coach activity report (classes taught, private sessions per month) | ✓ | ✓ | — | ✓ |
| Audit log (who changed what, filterable) | ✓ | — | — | — |
| Prices, discount rules, make-up limits, notice periods | ✓ | — | — | — |
| Staff accounts & roles, login method switches | ✓ | — | — | — |

*(Permissions per role are a proposal; the owner confirms them in each module spec.)*

### 7.5a Door check-in *(built 2026-11-18)*
- Admin **Check-in** page, made for the tablet at the door: pick the day (today by default) and the class (opens on the class happening now), then tap each member **Check in**. Big buttons, photo, age, boy/girl, guardian and phone, and health in red.
- Checking in uses **one session** from the registration that covers that class; **tap again to undo** (the session comes back).
- **Red warnings, but staff can still let them in:** "Not paid yet", "Expired", "Not this day · starts …", "No registration". The button says **Let in anyway**.
- **Walk-ins:** type a name to check in someone who isn't on the class list.
- Only the owner, managers and receptionists can check members in (enforced by the database); others see it read-only.

### 7.5b Member page and desk registration *(built 2026-11-18)*
- Click a member's name in **Members & families** to open their page: photo, age, guardian with relationship and phone, and all their registrations.
- **Edit details** (staff): name, date of birth, boy/girl, emergency phone, health checklist. **Photo**: take one with the tablet camera or choose a file (shrunk in the browser), or remove it.
- **Register at the desk**: sport, days, times, length and first day; **Check price** uses the same server price check as the app (family discount, clashes, rules), then **Register**, then **Paid · KNET** or **Link** straight away.
- Coaches can no longer edit a member's details directly (only levels, belts, stripes and notes through their own functions).
- *Not yet:* creating a brand-new family at the desk (needs the staff-accounts server function, 14g).

### 7.5c Desk payment link *(built 2026-11-18)*
- On any registration waiting for payment (Today page and the member page), reception taps **Send payment link**: the server creates a **UPayments link valid for 24 hours** for that exact amount, in the family's language.
- Then **Copy link** or **WhatsApp** (opens WhatsApp with the guardian's number and a ready message in Arabic or English). The guardian also gets an **inbox message** in the app, where **Pay online** works too.
- When it's paid, the registration turns active by itself (UPayments notifies our server) and is recorded as paid by **payment link**. "Paid · KNET" / "Paid · link" stay for marking payments by hand.
- A payment is matched to its registration even if a newer link was created later.

### 7.5d Approvals *(built 2026-11-18)*
- **In the app** (Home → **Pause or change** on any registration), the guardian can:
  - **Pause up to 1 week** by themselves: pick the first day (tomorrow or later) and 1–7 days. It applies at once, the end date moves by the same days, and no sessions are lost. Once per registration.
  - **Ask for a longer pause for an injury** (1–8 weeks, with a note about what happened).
  - **Ask to change days or time** (with a note).
  - **Ask to cancel the registration** (reason optional).
  - See their requests and their status, and withdraw one that isn't answered yet.
- **Dashboard → Approvals** (Today shows "N requests waiting"): owner, manager or receptionist **approve or reject**, with an optional message. The guardian gets the answer in the app inbox (English + Arabic).
  - Injury pause approved → the registration is paused and its end date moves.
  - Change approved → reception changes the days on the **member page** (**Change days**: same number of days, so the price stays the same; jiu-jitsu times follow the timetable; clashes are blocked).
  - Cancel approved → the registration is cancelled. If it was paid, it waits under **Refunds to record**.
- **Refunds:** only the **owner or accountant** record the refund amount (0 = no refund, never more than was paid) and how it was returned (KNET / bank transfer / cash). The money itself is returned outside the app. The guardian gets an inbox message.
- During a pause: no class shows in the app, the door check-in shows **"Paused until …"** and doesn't use a session, and class counts leave the member out.
- *Not yet:* the AI assistant can explain these options but can't send the requests itself.

### 7.5e Closure days *(built 2026-11-18)*
- **Dashboard → Closures:** the owner, a manager or reception closes the complex for **one day or a range** (up to 31 days; Fridays are skipped), with a reason families see.
- **Missed classes are added at the end:** for each member who had a class on a closed day, the end date moves to cover that many more of their own class days (swimming + jiu-jitsu on the same day = 2), skipping other closed days. If the member already has a renewal for the same days, the renewal is extended instead, so the two don't overlap. **Open pool:** 1 extra day per closed day (not twice if the pool was also closed that day).
- Registrations made **after** a closure was announced are extended the same way.
- **Open after all:** a closure that hasn't happened yet can be undone; end dates move back and families are told.
- Families get an inbox message (English + Arabic). In the app, closed days are crossed out on the week lanes, "Next class" skips them, Home shows "The complex is closed on …", and closed days can't be picked as a first day.
- The dashboard shows the next closure on Today, a red "closed today" note on Today and at the door check-in.
- *Not yet:* the AI assistant doesn't know about closure days.

### 7.5f Prices & discounts *(built 2026-11-18)*
- **Dashboard → Prices:** every price and discount in tables: kids (1 / 2 / 4 weeks × days a week), family discount (2, 3, 4, 5+ kids), multi-month discount (3 / 6 / 12 months), men's swimming, open pool, men's and women's jiu-jitsu (1 / 2 / 4 weeks; Titans pay the men's 4-week prices).
- **Only the owner** (super admin) can change them; other staff see them read-only. The database checks the role and every number (prices 0–9999.999 KD, discounts 0–100 %).
- **Live at once** for new registrations and renewals: the app's price preview, the `register` server function (which saves the real price), desk registration and the AI assistant all read the same saved prices. **Registrations already made keep their price.**
- **Change history:** who changed what, from → to, and when.
- The structure (which days and packages exist) stays in code; only the numbers are edited. If the saved list were ever broken, the built-in prices are used.

### 7.6 Reports & insights
- **Revenue:** by day and month, by sport, online vs. desk, discounts given, refunds.
- **Members:** active, new, expiring this week, not renewed (churn), per sport, level and class.
- **Attendance:** per class and per kid, kids with many absences, make-ups used.
- **Month-over-month comparisons** for all of the above (for example, "new swimmers this month vs. last month").
- **Export to Excel** for any list or report.

### 7.7 Notifications
Sent whenever something important changes or needs attention:
- Class cancelled (by a coach or staff), and what the parent gets (make-up, extension)
- Closure day added and the subscription extended
- Subscription reminders (7, 3, 1 days before, on the day, 2 days after)
- Payment received or failed, receipt ready
- Pause, switch, refund, over-limit or other request approved or rejected
- Waitlist spot opened
- Level changed, move-up to a new group, or a new coach note
- New coach or substitute assigned
- New chat message; manager alert for messages unanswered after 12 hours
- Trial booked, plus a reminder the day before

**Channels:**
- **App users:** push notification + in-app inbox.
- **Website-only parents:** in-app inbox, plus **WhatsApp** for urgent messages (same-day class cancellations, expiry).
- **Receipts:** email.

### 7.8 Data import (before launch)
- One-time import of current members from the receptionist's Excel file: parents' names and mobiles, kids, sport, level, schedule and end dates.
- Parents then **claim their family** by logging in with the same mobile number, and complete the health checklist and agreements.
- A dry run happens first, and staff check the result before going live.

### 7.9 AI assistant for parents *(moved into version 1 on 2026-11-18)*
A parents-only chat section where parents can ask anything or request changes (register, pause, cancel, reschedule, renew, check remaining sessions) in plain Arabic or English.
- **Changes happen only after the parent taps Confirm** on a summary showing what will happen and any cost.
- It can only do what the parent could do with the app's buttons, under the same limits.
- Anything it can't handle (complaints, refunds, unusual cases) goes to the receptionist's inbox in the admin dashboard, and the parent is notified when staff reply.
- Runs on the server using Claude (Anthropic), so the AI key is never in the app.
- **Built (2026-11-18):** opened from an **Ask the assistant** card on Home and at the top of the Chat tab. Server function `assistant` (Claude Opus 5.5, low effort, automatic fallback model if a request is declined) with tools that read only the member's own family, the timetable and the price list; prices come from the same `register` server check as the app. It can **prepare** a registration/renewal or an online payment as a **Confirm card**; the guardian's tap does the real action. Requests it can't handle (pause, cancel, refund, complaint…) go to **Assistant requests** on the admin Today page, and reception's reply arrives in the guardian's inbox. Limit: 40 messages per member per day. Conversation is kept on the device only.

## 8. Non-functional requirements

| Area | Requirement |
|---|---|
| **Platforms** | iOS (App Store), Android (Google Play), web (phones and computers). Admin dashboard: desktop and tablet, with **check-in designed touch-first** for the tablet. |
| **Languages** | App: Arabic and English, with full right-to-left layout in Arabic. Admin dashboard: English. |
| **Privacy** | Kids' health data and photos visible only to that family, coaches and authorized staff. Permissions enforced in the database, not only in screens. No real customer data in tests. Chat oversight disclosed in the terms. |
| **Accountability** | Every change by staff, coaches and parents is recorded in the audit log. |
| **Security** | Secret keys never inside the app. |
| **Time & money** | Kuwait time (UTC+3). KD with 3 decimals. |
| **Branding** | Black and white base from the LOSE \| GAIN logo, plus **one accent color per sport** (badges and calendar only). Light and dark mode. Visual directions are shown to the owner at the design stage. |
| **Store rules** | Apple Developer account (US$99/year) and Google Play account (US$25 once) in the company's name. In-app account deletion. |

## 9. Tech overview

| Part | Technology |
|---|---|
| App + app website | Expo (React Native), Expo Router |
| Admin dashboard | Next.js |
| Backend | Supabase (database, logins, real-time chat, server functions, scheduled jobs for reminders) |
| Payments | UPayments (online and payment links) |
| Push notifications | Expo push notifications |
| WhatsApp messages | WhatsApp Business API (through a provider such as Twilio or Meta directly) |
| SMS login codes | SMS provider connected to Supabase (Twilio to start; paid per SMS) |
| Receipts | PDF generated on the server, sent by email |
| AI assistant | Claude (Anthropic), called from the server |
| Early development | JSON sample data, then switched to Supabase |

## 10. Timeline

The detailed interview added a lot to version 1: attendance, make-ups, waitlists, closures, private classes, reports, the audit log, the Excel import, WhatsApp and teen logins. **A realistic estimate is now about 5 weeks, not 3.**

| Week | Delivers |
|---|---|
| **1** | Logins and roles (incl. teen and coach-parent), Arabic/English, classes, schedule, capacity, closure days, prices and discounts |
| **2** | Registration flow (cart, health checklist, agreements), subscriptions, waitlist, payments (UPayments, desk), receipts |
| **3** | Door check-in and attendance, make-ups, pause/switch/cancel and approvals, notifications and reminders |
| **4** | Coach app (assess, private classes, substitutes), chat with oversight, reports and Excel export, audit log |
| **5** | Excel import dry run, WhatsApp messages, testing, App Store and Google Play submission |
| **After launch** | Version 2: online store |

**To keep 3 weeks instead,** these could move to version 1.1, right after launch: reports beyond the basics, the audit log viewer, private classes, teen logins and WhatsApp. *(Owner to decide; see open question 8.)*

**Risks**
- Apple review can take several days, and first submissions are sometimes rejected and resubmitted.
- The UPayments setup depends on their merchant account approval and test keys.
- **WhatsApp Business API** needs Meta business verification and approved message templates (often 1–2 weeks), and costs per message. Start this paperwork early.
- The **Excel import** depends on how clean the current file is. A dry run is needed before launch.

## 11. Open questions

| # | Question | Default until answered |
|---|---|---|
| 1 | Pool sizes | Shown as "coming soon" |
| 2 | Number and names of swimming levels (4 or 5?) | 5 levels, renamable by admin |
| 3 | Maximum kids per class / per level | Editable by admin |
| 4 | Notice needed to reschedule or cancel | 24 hours, editable by admin |
| 5 | SMS provider and sender name | Twilio; sender name checked with the provider |
| 6 | Make-ups allowed per subscription | 2 per 4 weeks, editable by admin |
| 7 | Exact staff permissions per role (table 7.5) | As proposed |
| 8 | **Keep 3 weeks (move some features to v1.1) or take ~5 weeks for everything?** | 5 weeks |
| 9 | Trial no-show: can the parent book another free trial? | One free trial per kid per sport |
| 10 | Parent deletes their account while a subscription is active | Not allowed until it ends or is cancelled |

**Decided (2026-11-16):** both login methods on every account · two parents per family · admin dashboard in English · AI assistant in version 2 · attendance by receptionist · limited make-ups · leftovers expire · staff choose compensation for cancelled classes · waitlist with approval over limit · closures auto-extend · move-ups flagged then confirmed · mid-subscription switches by approved request · same-day swim + jiu-jitsu = 2 days · mixed-gender classes · coach changes live immediately · coaches see all kids in their sport · managers can read chats, 12-hour unanswered alert · private classes by request, coach-priced, paid to the complex · coach activity report · coach-parent view switch · required health checklist, terms, waiver, emergency contact · optional photo (reception can take it) · one cart for several kids · family discount from the 2nd kid on · manual renewal only · reminders at 7/3/1/0/+2 days · Excel import before launch · reports with monthly comparisons + Excel export · desk payment by KNET or payment link · receipts in app + email · WhatsApp for website-only parents · full filterable audit log · view-only teen login · substitutes and reassignment · reception uses desktop + tablet · sport accent colors · light/dark is the member's choice (updated 2026-11-18; was "follows the phone").
