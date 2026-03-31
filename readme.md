# Craving House Coffee App

Monorepo for Craving House.

## Apps

- `apps/web`: Next.js 14 web app (NextAuth + Prisma)

## Prereqs

- Node.js (20+ recommended)
- A database supported by Prisma (see `apps/web/prisma/schema.prisma`)

## Setup

1. Install deps:
   - `npm install`
2. Configure env:
   - `cp apps/web/.env.example apps/web/.env` and fill in values
3. Initialize DB (dev):
   - `npm run dev:setup -w apps/web`

## Stripe Checkout Setup

1. Add env vars in your deployment platform for `apps/web`:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
2. In Stripe Dashboard, create a webhook endpoint:
   - URL: `https://YOUR_DOMAIN/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `checkout.session.expired`
3. Copy the endpoint signing secret (`whsec_...`) into `STRIPE_WEBHOOK_SECRET`.
4. Redeploy the app.
5. Verify:
   - `GET /api/payments/stripe/enabled` returns `{ "enabled": true }`
   - `GET /api/health` shows Stripe env as configured.

Test mode:
- Use Stripe test secret key (`sk_test_...`) and test webhook secret.
- Use test card `4242 4242 4242 4242` with any future date/CVC/ZIP.

## Run

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## Security note

Do not commit secrets (API keys, private keys, `.env` files). If secrets were ever committed, rotate them and purge them from git history.
