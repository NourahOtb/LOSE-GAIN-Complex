# Security review: 19 November 2026

Full review before real families use the app: database rules, server functions, dashboard and app code, secrets, packages, website headers. Every serious finding was confirmed with a real test against the database (rolled back), fixed, then tested again.

## Already strong
- Parents can only reach their own family (26 attacks tried as a parent, all blocked). Logged-out visitors see nothing.
- Payments are confirmed server-to-server with UPayments, for the exact amount in the database.
- No secret keys in the code or its history; the demo password file is not on GitHub.

## Fixed (migration 0024 + server functions + both websites)
| # | Problem | Fix |
|---|---|---|
| 1 | Coaches and any staff could change or delete classes directly | Classes change only through the owner/manager functions |
| 2 | Reception or the accountant could create a registration at any price | Registrations are created only by the `register` server function. Reception can give an **exception discount %** with a required reason (saved with who gave it; shown on Money and in its Excel) |
| 3 | Missing live payment keys silently switched payments to test mode | Test/live is a visible setting (`app_settings.payments_mode`, now `sandbox`); the dashboard shows "TEST mode"; live mode refuses to work without the real keys |
| 4 | A switched-off staff member kept access until their log-in expired | Role checks treat a switched-off account as no role; switched-off people can't send chat messages |
| 5 | The "choose your own password" step could be skipped | The temporary password's hash is kept; the flag only clears after a real change |
| 6 | Coaches saw parents' phones and payment details | Coaches get schedules (`coach_roster`) and guardian names (`guardian_of`) only |
| 7 | The accountant could do reception jobs | Cancelling classes/pool, freeze and assistant replies, editing members and photos: owner, manager, reception only. A coach can cancel only classes of their own sport, never past dates |
| 8 | Unpaid registrations held places forever | Still unpaid 7 days after the first class day → cancelled automatically each night, family told |
| 9 | A second payment for an already paid registration was lost | Recorded as "Refund needed" on Today (also when paid after a cancellation) |
| 10 | The AI assistant sent family details without asking, no overall cost cap | One-time "Before you start → Allow" screen (server refuses without it); the whole complex is capped at 800 assistant messages a day |
| 11 | No website protection headers | Both sites: no framing by other sites, nosniff, referrer policy, camera only for photos |
| 12 | Parents could add a kid with a belt or level already set | Parents can only fill the normal kid fields; photos must be in the family's own folder |

## Still open (smaller)
- Turn on **Leaked password protection** in Supabase (Authentication → Passwords; paid plan).
- Reception's "new temporary password" for a family isn't logged and the family isn't told.
- Requests can be sent and withdrawn repeatedly; the assistant accepts earlier turns from the app as they are.
- No extra limit on repeated wrong passwords at the dashboard log-in (Supabase's own limits apply).
- Family discount still counts a sibling's unpaid registration (now limited: unpaid ones are cancelled after a week).
- UPayments currency isn't double-checked (the amount is).
- Packages: 5 "moderate" warnings in build tools and the Excel library, not reachable by users.

## Going live with payments
1. Add the live `UPAYMENTS_BASE_URL` and `UPAYMENTS_TOKEN` as Supabase function secrets.
2. Ask Claude to switch `payments_mode` to `live` (and test one small real payment).
