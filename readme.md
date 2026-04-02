# Craving House Coffee App

Monorepo for Craving House.

## Apps

- `apps/web`: Next.js 16 web app (NextAuth + Prisma)
  - Stripe Checkout and webhook handling included

## Prereqs

- Node.js `24.14.1` LTS recommended
- A database supported by Prisma (see `apps/web/prisma/schema.prisma`)

This repo pins Node in three places on purpose:
- `.nvmrc` for local `nvm` users
- `.node-version` for deployment platforms such as Render
- `package.json` `engines.node` as an additional guardrail

As of April 2, 2026, Node.js `25.9.0` is the latest release, but `24.14.1` is the latest LTS. This app is pinned to the LTS line for deployment stability.

## Setup

1. Install deps:
   - If you use `nvm`: `nvm install && nvm use`
   - `npm install`
2. Configure env:
   - `cp apps/web/.env.example apps/web/.env` and fill in values
   - Use a dedicated `MFA_ENCRYPTION_KEY`; do not reuse `NEXTAUTH_SECRET`
3. Initialize DB (dev):
   - `npm run dev:setup -w apps/web`

## Stripe Checkout Setup

1. Add env vars in your deployment platform for `apps/web`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - Optional: `STRIPE_WEBHOOK_IP_ALLOWLIST` as a comma-separated list if your host preserves the source IP correctly
2. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
3. Copy the endpoint signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy the app.
5. Verify:
   - `GET /api/payments/stripe/enabled` returns `{ "enabled": true }`
   - `GET /api/health?verbose=1` from a manager session shows Stripe env as configured.

Test mode:
- Use Stripe test secret key (`sk_test_...`) and test webhook secret.
- Use test card `4242 4242 4242 4242` with any future date/CVC/ZIP.

## Custom Domain Cutover

When the client moves from the current hosted URL to a custom domain such as `cravinghouse.com` or `cravinghouse.co.uk`, update these items together:

1. DNS / hosting:
   - Point the new domain at the hosting provider.
   - Enable HTTPS before switching traffic.
2. App env:
   - Set `NEXTAUTH_URL` to the final public `https://...` domain.
   - Set `VAPID_SUBJECT` to the same public `https://...` domain, or a valid `mailto:` address.
   - Keep `NEXTAUTH_SECRET` the same unless you intentionally want to invalidate existing sessions.
3. OAuth:
   - Add the new origin and callback URL to Google OAuth if Google sign-in is enabled.
4. Stripe:
   - Update the Stripe webhook endpoint to `https://YOUR_DOMAIN/api/webhooks/stripe`.
   - Keep listening for `checkout.session.completed` and `checkout.session.expired`.
5. Validation:
   - Check `GET /api/health` for `canonicalOrigin`, `nextauthUrlValid`, `nextauthUrlHttps`, and `vapidSubjectMatchesCanonical`.
   - Confirm `robots.txt` and `sitemap.xml` now advertise the custom domain.

The app now reads its canonical public URL from `NEXTAUTH_URL` in one place and reuses it for redirects, sitemap generation, security checks, Stripe return URLs, receipt links, and metadata.

## Run

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`
- Test: `npm run test`

## Health Endpoint

- `GET /api/health` is intentionally minimal and safe for public uptime checks.
- `GET /api/health?verbose=1` is restricted to a signed-in manager session or a matching `HEALTHCHECK_TOKEN` header.
- Example header: `x-healthcheck-token: YOUR_TOKEN`

## Security note

Do not commit secrets (API keys, private keys, `.env` files). If secrets were ever committed, rotate them and purge them from git history.

Production launch basics:
- Keep `DEV_AUTH_ENABLED=false` and `NEXT_PUBLIC_DEV_AUTH_ENABLED=false`
- Keep `NEXTAUTH_DEBUG=false`
- Set `MFA_ENCRYPTION_KEY` and make it different from `NEXTAUTH_SECRET`
- Use HTTPS for `NEXTAUTH_URL`
