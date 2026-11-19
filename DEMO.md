# LOSE | GAIN Complex: Wednesday demo script

## Links

| What | Address | Who logs in |
|---|---|---|
| **Parent & coach app** (website version of the phone app) | https://lg-complex-app.vercel.app | Parents, coaches |
| **Admin dashboard** | https://lg-complex-admin.vercel.app | Staff |

Demo accounts and the shared password are in `docs/demo-accounts.local.md` on your Mac. That file is **not** on GitHub.

All demo accounts use the **same shared password** (in that file). Demo data was reset on 19 Nov 2026; "today" in the stories below is Thursday 19 Nov.

**Staff** (admin dashboard; coaches use the app)

| Role | Email | Name | What they do in the demo |
|---|---|---|---|
| Owner (super admin) | `admin@lgcomplex.test` | Owner | Everything: prices, staff, money, reports |
| Manager | `manager@lgcomplex.test` | Nourah Alotaibi | Approvals, staff (coaches, reception), money |
| Receptionist | `reception@lgcomplex.test` | Liz | Desk: payments, new families, approvals, waitlist |
| Receptionist | `reception2@lgcomplex.test` | Arra | Same (app in Arabic); gave the exception discount |
| Accountant | `accountant@lgcomplex.test` | Naser | Money, refunds |
| Swimming coach | `coach.swim1@lgcomplex.test` | Abbas Qali | Kids pool 4 PM + men's swimming |
| Swimming coach | `coach.swim2@lgcomplex.test` | Abdullah Ashkanani | Olympic pool 5 PM kids |
| Jiu-jitsu coach | `coach.bjj1@lgcomplex.test` | Yousef Aldosari | Warriors 1 and Warriors 2 (kids) |
| Jiu-jitsu coach | `coach.bjj2@lgcomplex.test` | Ahmad Alqathmani | Adults + Titans, Saturday open mat |
| Jiu-jitsu coach (women) | `coach.bjj3@lgcomplex.test` | Zainab Dashti | Women's class 7:30 PM |

**Families** (app). Email = the name shown + `@lgcomplex.test`.

| Email | Who | Scenario |
|---|---|---|
| `abdullah.mutawa` | Dad | **Open pool** for himself + 2 sons in jiu-jitsu (Omar, Warriors 2, 2 stripes · Yousef, Warriors 1) · 7% family discount |
| `hessa.ajmi` | Mother | Her son Fahad + **nephew** Saud (aunt) + **cousin** Lulwa, swimming · 10% family discount · Lulwa moved up to level 2 |
| `bader.otaibi` | Father | One kid, Nasser · **missed his last 2 classes** (check on them) · injury pause **rejected** · renewed after an expired month |
| `fatma.qallaf` | Mother (Arabic) | 3 kids on a **3-month package** (25% off) · paid at the desk |
| `moudhi.rashed` | **Grandmother** (Arabic) | Grandson Abdulaziz (**Titan**, jiu-jitsu, yellow belt, 3 stripes) + granddaughter Dalal (swimming) |
| `mishari.sultan` | **Uncle** | Nephew Turki (Titan) · old knee injury · missed 2 classes |
| `jassim.bloushi` | Just me | Adult **men's swimming** |
| `reem.saleh` | Just me | **Women's** jiu-jitsu, Tue/Thu 7:30 PM |
| `khaled.shatti` | Father | Abdulrahman **waiting for payment**, payment link sent 3 hours ago |
| `asma.mansour` | Mother (Arabic) | Sara, jiu-jitsu · **expires this week** (22 Nov) · chat with the coach about her belt |
| `talal.bader` | Father | Hamad · **expired 8 Nov, not renewed** |
| `ghadeer.qattan` | Mother | Maryam **paused** 15–21 Nov (self-service) · chat message **unanswered for 15 hours** |
| `waleed.sayegh` | Father | Yaqoub · **injury pause waiting for approval** (broken wrist) |
| `shaikha.mulla` | Mother (Arabic) | Ghala · **cancelled**, refund of 67.500 KD **due** (accountant) |
| `ali.duwaish` | Father | Fahad · **change days request waiting** |
| `abeer.hashash` | Mother | Lana on the **waitlist**: kids pool Sat/Mon/Wed 4 PM is **full (6 of 6)** |
| `yousef.roumi` | Just me | **Open pool**, **freeze request** waiting |
| `lamya.ali` | Mother | Zaid · **asthma + peanut allergy** (red on coach screens) |
| `faris.ghanim` | **Older brother** | Registered his sister Ruqaya (swimming) |
| `huda.saad` | Mother | Maha + Saad · **exception discount 20%** at the desk ("Family of a staff member") |
| `abdulwahab.hamad` | Father (Arabic) | 4 kids (12% off) · Mubarak does **both sports** · Noor **paid twice** (refund alert) · open AI assistant question |
| `mohammad.azemi` | Father (Arabic) | Just signed up, **no kids yet** |

**Tip:** use two windows side by side, the **phone app** (narrow browser window, or your phone) and the **admin dashboard** (laptop), so the audience sees changes move between them. Log out before switching accounts in the app (top-right **Log out**).

---

## The story (about 8 minutes)

### 1. The problem (30 seconds)
"Today everything runs on Excel and WhatsApp: renewals, cancellations, levels. Health information isn't stored anywhere."

### 2. A new parent joins (2 minutes), in the app
1. Open the app → **العربية / English** screen. Tap **العربية** to show Arabic right-to-left, then switch back with **English** (top right).
2. **Create a member account** → "Who is this account for?" → **My family** → name, Kuwait mobile, email, password. *(Or show **Just me**: an adult fills in their own details and goes straight to adult swimming.)*
3. **Kids → + Add a kid**: first and last name, **you are their…** (mother, aunt, cousin…), birth date on the **calendar** (year → month → day), optional emergency phone (then **whose number is it?**), **health checklist** (now with eye condition and glasses) (point out it's required, and coaches see it in red).
4. **Register**:
   - pick the kid → **Jiu-jitsu** → tap **Sat, Mon, Wed**
   - point out that **any days** work, with the recommended swimming groups marked
   - **5:00 PM** → **4 weeks** → **First class** (only the chosen days are offered)
   - the price appears live from the real price sheet (**90.000 KD**)
5. **Confirm registration** → "Please pay at reception". Home shows **Waiting for payment**.

### 2b. Or pay online (1 minute): UPayments sandbox, no real money
1. Choose **Online (KNET / card)** when registering, or tap **Pay online** on a waiting registration on the home screen.
2. The UPayments test page opens with the exact amount. Choose **KNET** and use the UPayments sandbox test card: number `8888880000000001`, expiry `09/30`, PIN any 4 digits → **Submit** → **Confirm**.
3. You come back to **"Payment received. The subscription is active."** The parent's inbox gets "Payment received · Paid online", and the admin **Registrations** page shows it as **Active · Online**.

### 3. Reception (1 minute), in the admin dashboard as the receptionist
1. **Today** shows the numbers, today's classes and how full they are, **Waiting for payment**, and **Expiring this week**.
2. Press **Paid · KNET** on the new registration → it becomes active. The parent gets **"Payment received"** in their app inbox.
3. Show **Kids & families**: health in red, swim levels, belts with stripes.

### 3b. Pause and approvals (1 minute, optional)
1. In the app as Abdullah (`abdullah.mutawa`): Home → **Pause or change** under Omar → **Pause up to 1 week** → pick a day and 3 days → **Pause now**. The end date moves by 3 days.
2. Same screen → **Change days or time** → write a note → **Send request**.
3. In the dashboard: Today shows **"3 requests waiting"** (yours + Yaqoub's injury pause + Fahad's change of days) → **Approvals** → **Approve** (optionally with a message). Abdullah gets it in the inbox.
4. Open Omar's member page → **Change days** on the registration → pick the new days → **Save days**.
5. After rehearsing, ask Claude to "undo the approvals test" so Omar is back to normal.

### 3c. A holiday (30 seconds, optional)
In the dashboard → **Closures** → pick a date and a reason (e.g. "National Day") → **Close the complex**. It says how many registrations were extended. In the app, that day is crossed out and Home says the complex is closed. Then **Open after all** to undo it.

### 3d. A family walks in without the app (1 minute, optional)
As reception: **Members & families → + New family** → guardian name, mobile, email, then the kids in the same form (first and last name, birth date, boy/girl, health; **+ Add another kid**; tick "The guardian also trains here" if they do) → **Create account + N members**. Show the temporary password and the **WhatsApp** button (ready message with the app link), then **Register →** next to a kid. After rehearsing, ask Claude to delete the practice family.

### 4. The coach (2 minutes), in the app as Coach Yousef (`coach.bjj1`)
1. **Classes → Wed → 5:00 PM · Warriors 2**: the new kid is in the class.
2. Point out the **health marks** and **"2 kids may be ready for a stripe"**.
3. Tap the new kid → **Give white belt** → **Add stripe 1** → pick the date → **Add stripe**.
4. Optional: on **Omar**, show the stripe history with dates and coach names, and write a **coach note**.
5. Optional: log in as **Coach Abbas** (`coach.swim1`) to show swimming as **lanes by level** with **Move up?**.

### 5. A class is cancelled (1.5 minutes)
1. **Admin → Today → Cancel class** on a class (or **Cancel this class** in the coach app) → choose **A make-up class** → confirm. The dashboard says how many families were notified.
2. In the app as that class's parent:
   - **Home:** the day is **crossed out in red**, with an alert at the bottom
   - the **Inbox** tab shows a red number
   - **Inbox:** "Class cancelled… You can book a make-up class." Also show it in Arabic.

### 6. Parent home and what's next (1 minute)
- As Asma (`asma.mansour`): the **pace clock** shows the next class, **this week as pool lanes**, classes left, and the renewal alert.
- **Already working:** online payment with UPayments (sandbox), shown in step 2b.
- **After launch** (from the PRD): push notifications to the phone's lock screen, chat with coaches, the App Store and Google Play, SMS login, the AI assistant and the store.

---

## Reset after rehearsing

If you rehearse the story first, tell Claude "reset the demo data" before the presentation. That deletes the practice accounts, kids, registrations, stripes, cancellations and messages, and puts the families back as in the table above (for example Abdulrahman back to "waiting for payment").

## If something goes wrong on stage
- **Page looks stuck:** reload the browser page.
- **Logged into the wrong account:** **Log out** (top right of the app) or **Log out** (bottom left of the dashboard).
- **No internet at the venue:** run both locally from your Mac (`npm run dev:mobile` and `npm run dev:admin`) and use a phone hotspot.

## Updating the websites after changes
Both websites are connected to the GitHub repository: **every push to `main` rebuilds and publishes them automatically** (about 1 minute).
- App: Vercel project `lg-complex-app`, folder `apps/mobile`, build `npx expo export -p web` → `dist`
- Admin: Vercel project `lg-complex-admin`, folder `apps/admin` (Next.js)

`./scripts/deploy.sh` is a manual fallback that builds on your Mac and uploads directly.

## Changing prices
Sign in to the dashboard as the owner → **Prices** → change the numbers → **Save prices**. New registrations (app, desk, assistant) use them at once; registrations already made keep their price. The history at the bottom shows every change.

The built-in fallback prices live in `packages/shared/src/pricing.ts`. If you change that file, run `./scripts/sync-pricing.sh` and redeploy the `register` and `assistant` server functions (ask Claude). A test fails if the copies differ.
