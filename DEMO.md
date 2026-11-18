# LOSE | GAIN Complex: Wednesday demo script

## Links

| What | Address | Who logs in |
|---|---|---|
| **Parent & coach app** (website version of the phone app) | https://lg-complex-app.vercel.app | Parents, coaches |
| **Admin dashboard** | https://lg-complex-admin.vercel.app | Staff |

Demo accounts and the shared password are in `docs/demo-accounts.local.md` on your Mac. That file is **not** on GitHub.

| Account | Email | What it shows |
|---|---|---|
| Parent | `noura@lgcomplex.test` | Sara (swimming, Level 3) and Yousef (jiu-jitsu, grey-white belt, asthma) |
| Parent | `dalal@lgcomplex.test` | Faisal (waiting for payment) and Noor |
| Swimming coach | `hamad@lgcomplex.test` | Kids pool / Olympic pool classes as lanes by level |
| Jiu-jitsu coach | `fahad@lgcomplex.test` | Belts and stripes |
| Receptionist | `reception@lgcomplex.test` | Admin dashboard |
| Owner | `admin@lgcomplex.test` | Admin dashboard (super admin) |

**Tip:** use two windows side by side, the **phone app** (narrow browser window, or your phone) and the **admin dashboard** (laptop), so the audience sees changes move between them. Log out before switching accounts in the app (top-right **Log out**).

---

## The story (about 8 minutes)

### 1. The problem (30 seconds)
"Today everything runs on Excel and WhatsApp: renewals, cancellations, levels. Health information isn't stored anywhere."

### 2. A new parent joins (2 minutes), in the app
1. Open the app → **العربية / English** screen. Tap **العربية** to show Arabic right-to-left, then switch back with **English** (top right).
2. **Create a member account** → "Who is this account for?" → **My family** → relationship (for example **Mother**) → name, Kuwait mobile, email, password. *(Or show **Just me**: an adult fills in their own details and goes straight to adult swimming.)*
3. **Kids → + Add a kid**: name, birth date, emergency phone, **health checklist** (point out it's required, and coaches see it in red).
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
1. In the app as Noura: Home → **Pause or change** under Sara → **Pause up to 1 week** → pick a day and 3 days → **Pause now**. The end date moves by 3 days.
2. Same screen → **Change days or time** → write a note → **Send request**.
3. In the dashboard: Today shows **"1 request waiting"** → **Approvals** → **Approve** (optionally with a message). Noura gets it in the inbox.
4. Open Sara's member page → **Change days** on the registration → pick the new days → **Save days**.
5. After rehearsing, ask Claude to "undo the approvals test" so Sara is back to normal.

### 3c. A holiday (30 seconds, optional)
In the dashboard → **Closures** → pick a date and a reason (e.g. "National Day") → **Close the complex**. It says how many registrations were extended. In the app, that day is crossed out and Home says the complex is closed. Then **Open after all** to undo it.

### 3d. A family walks in without the app (1 minute, optional)
As reception: **Members & families → + New family** → name, mobile, email → **Create account**. Show the temporary password and the **WhatsApp** button (ready message with the app link). **Next: add the kids** → add a kid → **Register →**. After rehearsing, ask Claude to delete the practice family.

### 4. The coach (2 minutes), in the app as Coach Fahad
1. **Classes → Wed → 5:00 PM · Mat 2**: the new kid is in the class.
2. Point out the **health marks** and **"2 kids may be ready for a stripe"**.
3. Tap the new kid → **Give white belt** → **Add stripe 1** → pick the date → **Add stripe**.
4. Optional: on **Yousef**, show the stripe history with dates and coach names, and write a **coach note**.
5. Optional: log in as **Coach Hamad** to show swimming as **lanes by level** with **Move up?**.

### 5. A class is cancelled (1.5 minutes)
1. **Admin → Today → Cancel class** on a class (or **Cancel this class** in the coach app) → choose **A make-up class** → confirm. The dashboard says how many families were notified.
2. In the app as that class's parent:
   - **Home:** the day is **crossed out in red**, with an alert at the bottom
   - the **Inbox** tab shows a red number
   - **Inbox:** "Class cancelled… You can book a make-up class." Also show it in Arabic.

### 6. Parent home and what's next (1 minute)
- As Noura: the **pace clock** shows the next class, **this week as pool lanes**, classes left, and the renewal alert.
- **Already working:** online payment with UPayments (sandbox), shown in step 2b.
- **After launch** (from the PRD): push notifications to the phone's lock screen, chat with coaches, the App Store and Google Play, SMS login, the AI assistant and the store.

---

## Reset after rehearsing

If you rehearse the story first, tell Claude "reset the demo data" before the presentation. That deletes the practice accounts, kids, registrations, stripes, cancellations and messages, and puts Faisal back to "waiting for payment".

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
