# Deploy Rollback And Handover Runbook

Last updated: 2026-04-09

## What The Remaining Handover Steps Mean

### Live Auth Walkthrough

A live auth walkthrough means testing sign-in on the deployed app, not just in local dev or unit tests.

Run it with real customer, staff, and manager accounts on the public URL and confirm:

- the credentials sign-in POST succeeds
- `/api/auth/session` shows the correct signed-in user and role
- customer access works for customer pages
- staff can open staff tools but not manager-only pages
- manager can open both manager and staff tools
- sign-out clears the session cleanly

Why this matters:

- it catches deployment-only problems such as cookie settings, HTTPS-only session issues, `NEXTAUTH_URL` mistakes, and proxy/runtime differences
- on 2026-04-09 this exact check exposed a real bug: credentials sign-in returned `500` because the NextAuth catch-all route context was not forwarded into the wrapped POST handler

### Live Payment Walkthrough

A live payment walkthrough means placing real test-mode orders through Stripe on the deployed app.

Run it only after `GET /api/payments/stripe/enabled` returns `{"enabled":true}` and confirm:

- guest checkout creates an order and redirects to Stripe Checkout
- signed-in checkout also works
- Stripe test card `4242 4242 4242 4242` completes payment
- success redirect returns to the app correctly
- cancel redirect returns to the app correctly
- webhook marks the order as paid
- paid orders appear in staff and manager views
- customer tracking matches the back-office order status

Why this matters:

- local code can be correct while live Stripe config is still incomplete
- this is the only step that proves the full payment path, webhook handling, and order state transitions in production-like conditions

### Mobile QA Pass

A mobile QA pass means a visual and interaction review on an iPhone-sized viewport, ideally on a real device and at minimum in browser device emulation.

Review at least:

- `/`
- `/menu`
- `/cart`
- `/checkout`
- `/signin`
- `/loyalty`
- `/orders`

Check for:

- mobile drawer opens and closes correctly
- cart is easy to reach
- no clipped text, overlapping cards, or broken spacing
- buttons are easy to tap
- empty, loading, and error states are still readable
- no awkward duplicate navigation in the drawer

Why this matters:

- responsive CSS and code inspection do not prove the UI feels correct on a real narrow screen
- this is the step that catches touch-target, overflow, spacing, and drawer behavior issues before client handover

### Rollback And Recovery Steps

Rollback and recovery steps are the operating instructions for getting the live app back to a good state when a deploy, migration, auth flow, or Stripe setup goes wrong.

Why this matters:

- a checklist without recovery steps is not enough for client handover
- the client needs a repeatable path for bad deploys, config mistakes, and webhook issues

## How Render Startup Works

The web app startup path is:

1. Render starts `npm run start` for `apps/web`.
2. [`apps/web/scripts/start.mjs`](/Users/user/Desktop/Craving House Coffee App/apps/web/scripts/start.mjs) validates production env vars.
3. [`apps/web/prisma/deploy.cjs`](/Users/user/Desktop/Craving House Coffee App/apps/web/prisma/deploy.cjs) runs `prisma migrate deploy` because Prisma migrations exist in this repo.
4. Next.js starts with `next start -H 0.0.0.0 -p $PORT`.

Important consequences:

- the app will refuse to boot if required env vars are missing or invalid
- deploy-time database migration runs before the Next.js server starts accepting traffic
- rolling code back does not automatically roll database schema back

## Required Production Env

Required by startup validation:

- `DATABASE_URL`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `QR_SECRET`
- `MFA_ENCRYPTION_KEY`

Required together for Stripe:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Useful operational env vars:

- `HEALTHCHECK_TOKEN`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `VAPID_PUBLIC_KEY`
- `VAPID_PRIVATE_KEY`
- `VAPID_SUBJECT`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `NEXT_PUBLIC_SUPPORT_EMAIL`

Production guardrails already enforced by startup:

- `NEXTAUTH_URL` must be valid HTTPS and must not include a Render internal port
- `MFA_ENCRYPTION_KEY` must be different from `NEXTAUTH_SECRET`
- Stripe env must be fully present or fully absent
- Google OAuth env must be fully present or fully absent
- `DEV_AUTH_ENABLED` and `NEXT_PUBLIC_DEV_AUTH_ENABLED` must stay disabled
- `NEXTAUTH_DEBUG` must stay disabled

## Standard Post-Deploy Verification

Run these after every successful deploy:

1. Open the Render deploy logs and confirm startup completed without env validation errors.
2. Confirm Prisma migration completed cleanly.
3. Check `GET /api/health`.
4. Check `GET /api/health?verbose=1` with either:
   - a signed-in manager session, or
   - `x-healthcheck-token: <HEALTHCHECK_TOKEN>`
5. Check `GET /api/payments/stripe/enabled`.
6. Run the live auth walkthrough with the handover customer, staff, and manager accounts.
7. If Stripe is enabled, run both the guest and signed-in payment walkthroughs with Stripe test mode.
8. Do the mobile visual pass on the public URL.

## Rollback Procedure

Use this when a new deploy breaks the site and you need the last known-good code back quickly.

1. In Render, open the web service and go to the deploy history.
2. Find the last successful deploy that predates the incident.
3. Roll back or re-deploy that known-good commit.
4. Keep env vars unchanged unless the incident was caused by a bad env change.
5. Re-run the standard post-deploy verification steps.

Important:

- this restores application code, not database schema history
- if the broken deploy also applied a schema migration, code rollback alone may not be enough

## Recovery Playbooks

### Boot Failure On Render

Symptoms:

- service never becomes healthy
- deploy logs show startup exiting before Next.js starts

Likely causes:

- missing required env var
- invalid `NEXTAUTH_URL`
- mismatched Stripe or Google env pairs
- `MFA_ENCRYPTION_KEY` reused as `NEXTAUTH_SECRET`

Recovery:

1. Read the exact startup error in the Render log.
2. Fix the env var in Render.
3. Re-deploy the same commit.
4. Confirm `GET /api/health` returns `ok: true`.

### Database Migration Failure

Symptoms:

- deploy fails during Prisma startup
- app never reaches Next.js startup

Facts for this repo:

- Prisma migrations exist, so deploy startup uses `prisma migrate deploy`
- the migration files live in [`apps/web/prisma/migrations`](/Users/user/Desktop/Craving House Coffee App/apps/web/prisma/migrations)

Recovery:

1. Read the failing migration name from the Render log.
2. Inspect the matching `migration.sql` file in the repo.
3. Fix the underlying database issue or create a corrective migration.
4. Re-deploy once the schema problem is understood.

Do not:

- assume code rollback undoes the schema change
- manually delete tables or rows without a backup and a clear recovery plan

### Credentials Sign-In Failure

Symptoms:

- email/password sign-in returns `500`
- session cookie is not created
- `/api/auth/session` stays empty after sign-in

Checks:

1. Load `GET /api/auth/csrf`.
2. Submit credentials to `POST /api/auth/callback/credentials`.
3. Confirm the response sets a session cookie.
4. Confirm `GET /api/auth/session` returns the signed-in user.

Known example:

- on 2026-04-09 this flow failed because [`apps/web/src/app/api/(auth)/auth/[...nextauth]/route.ts`](/Users/user/Desktop/Craving House Coffee App/apps/web/src/app/api/(auth)/auth/[...nextauth]/route.ts) called the wrapped NextAuth POST handler without the route context

### Stripe Checkout Or Webhook Failure

Symptoms:

- checkout creation fails
- orders stay `pending` or `unpaid`
- staff never sees the new paid order

Checks:

1. Confirm `GET /api/payments/stripe/enabled` returns `{"enabled":true}`.
2. Confirm `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are both set in Render.
3. In Stripe Dashboard, confirm the webhook endpoint points to:
   - `https://YOUR_DOMAIN/api/webhooks/stripe`
4. Confirm the endpoint listens for:
   - `checkout.session.completed`
   - `checkout.session.expired`
5. Re-run a test payment with `4242 4242 4242 4242`.
6. Confirm the order becomes `paid` and appears in staff and manager views.

### Verbose Health Diagnostics Unavailable

Symptoms:

- `/api/health?verbose=1` returns `403`

Recovery:

1. Use a signed-in manager session, or
2. send `x-healthcheck-token: <HEALTHCHECK_TOKEN>`

The verbose health endpoint is intentionally restricted and that `403` is expected without one of those two access paths.
