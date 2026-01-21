# Stripe payments (pay online before collection)

This app can support **pay in store** (default) and **pay online by card** using **Stripe Checkout**.

## 1) Create Stripe keys

In Stripe Dashboard:
- Developers → API keys → copy:
  - `STRIPE_SECRET_KEY` (starts with `sk_...`)
- Developers → Webhooks → Add endpoint:
  - Endpoint URL: `https://craving-house.onrender.com/api/webhooks/stripe`
  - Events: select `checkout.session.completed` and `checkout.session.expired`
  - Copy the webhook signing secret:
    - `STRIPE_WEBHOOK_SECRET` (starts with `whsec_...`)

## 2) Set Render environment variables

Render → your web service → Environment:
- `STRIPE_SECRET_KEY` = (Stripe secret key)
- `STRIPE_WEBHOOK_SECRET` = (Stripe webhook signing secret)

You already should have:
- `NEXTAUTH_URL=https://craving-house.onrender.com`
- `NEXTAUTH_SECRET=...`

Save → rebuild → deploy.

## 3) Update the database schema

Stripe adds payment fields to the `Order` table. Run locally (and/or in Render shell) once:

```sh
npm -w apps/web run prisma:generate
npm -w apps/web run prisma:push
```

## 4) How it works in the app

- Checkout now offers:
  - **Pay in store**
  - **Pay by card** (redirects to Stripe Checkout)
- When Stripe confirms payment, the webhook marks the order as `paid`.

## Notes

- Don’t commit real Stripe secrets to Git.
- For testing, use Stripe **test mode** keys first.
