# Run it and see it (visual walkthrough)

## 1) Create your `.env`

From the project root:
- `cp apps/web/.env.example apps/web/.env`

Minimum required for local dev (fastest path):
- Set `DATABASE_URL` to a Postgres connection string (Railway dev DB is fine)
- Set `NEXTAUTH_SECRET` to a long random string
- Set `QR_SECRET` to a long random string

If you don’t want to configure Google OAuth yet, enable the dev sign-in (local only):
- Set `DEV_AUTH_ENABLED="true"`
- Set `NEXT_PUBLIC_DEV_AUTH_ENABLED="true"`
- Set `DEV_AUTH_CODE="your-own-strong-code"`

## 2) Create database tables (migration)

- Fast local setup (recommended for preview):
  - `npm -w apps/web run dev:setup`
  - This creates tables and seeds a starter menu.

Advanced (if you want tracked migrations):
- `npm -w apps/web run prisma:migrate`

## 3) Start the app

- `npm run dev`

Then open this in your browser:
- `http://localhost:3000`

## Troubleshooting: “Operation not permitted” (EPERM)

If you see an error like:
- `listen EPERM: operation not permitted 127.0.0.1:3000`

It means your environment is blocking local servers from binding to ports.

Workarounds:
- Run the same commands in a normal Terminal environment that allows local servers, or
- Use a hosted preview (Render) and open the public URL.

## Copy/paste (VS Code Terminal)

Run this from the repo root:

```bash
cp apps/web/.env.example apps/web/.env

# Edit apps/web/.env and set:
# - DATABASE_URL (Railway dev DB)
# - NEXTAUTH_SECRET
# - QR_SECRET

npm install
npm -w apps/web run dev:setup
npm run dev
```

## 4) What to click (customer flow)

1) `/menu` → add items
2) `/cart` → adjust quantities
3) `/checkout` → enter pickup name → place order
4) `/orders` → open the order → see the status timeline

## 5) What to click (staff flow)

1) Sign in (dev sign-in or Google)
2) `/staff/orders` → see queue → click status buttons
3) `/staff/loyalty-scan` → paste a customer token → add stamps

## 6) Customer loyalty token (for staff scan)

1) Sign in as a customer
2) Open `/loyalty`
3) Use “Refresh QR” then “Copy token”
4) Paste that token in `/staff/loyalty-scan`
