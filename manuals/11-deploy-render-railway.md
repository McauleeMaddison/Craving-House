# Deploy (Render + Railway Postgres)

You chose:
- Database: **Railway Postgres**
- Hosting: **Render** (Web Service)

This is the clean, correct way to launch.

## 0) Before you start (do these once)

1) In `apps/web/.env` make sure these are **OFF** for production:
   - `DEV_AUTH_ENABLED="false"`
   - `NEXT_PUBLIC_DEV_AUTH_ENABLED="false"`

2) Make sure you have real values for:
   - `NEXTAUTH_SECRET`
   - `QR_SECRET`
   - `INITIAL_MANAGER_SETUP_CODE`

## 1) Create the Railway database (Postgres)

1) In Railway: create a new project → add **PostgreSQL**
2) Copy the **DATABASE_URL** provided by Railway
3) Keep it safe (it is a password)

## 2) Create the Render web service

1) Push your code to GitHub (Render deploys from a repo)
2) In Render: New → **Web Service** → connect the repo
3) Settings:
   - Runtime: Node
   - Build command:
     - `npm install && npm -w apps/web run prisma:generate && npm run build`
   - Start command:
     - `npm run start`

Why:
- `npm run build` builds the Next.js app in `apps/web` via the root workspace script
- `prisma:generate` ensures Prisma client exists on Render

## 3) Set environment variables in Render

In Render → Environment, set:

- `DATABASE_URL` = (from Railway)
- `NEXTAUTH_URL` = `https://YOUR-RENDER-URL` (or your custom domain)
- `NEXTAUTH_SECRET` = long random string
- `QR_SECRET` = long random string
- `INITIAL_MANAGER_SETUP_CODE` = long random string (one-time)
- `DEV_AUTH_ENABLED` = `false`
- `NEXT_PUBLIC_DEV_AUTH_ENABLED` = `false`

For sign-in providers:
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `APPLE_CLIENT_ID`
- `APPLE_CLIENT_SECRET`

## 4) Run database migrations in production

After the first deploy succeeds, run migrations against Railway:

Option A (recommended): run locally against Railway
- Set your local `apps/web/.env` to Railway `DATABASE_URL`
- Run: `npm -w apps/web run prisma:deploy`

Option B: run on Render (if you add it to build)
- Update Build command to:
  - `npm install && npm -w apps/web run prisma:generate && npm -w apps/web run prisma:deploy && npm run build`

For small apps this is fine. For larger apps, do migrations separately to avoid concurrency issues.

## 5) Configure Apple + Google OAuth (required)

This is the part that breaks most launches if done wrong.

### Google
In Google Cloud OAuth settings:
- Add an authorized redirect URI:
  - `https://YOUR-DOMAIN/api/auth/callback/google`

### Apple
In Apple Developer:
- Configure your Service ID and redirect:
  - `https://YOUR-DOMAIN/api/auth/callback/apple`

Also ensure `NEXTAUTH_URL` matches your domain exactly (https, no trailing slash).

## 6) First manager setup (one time)

1) Deploy
2) Sign in with the owner account
3) Visit `/setup` and paste `INITIAL_MANAGER_SETUP_CODE`
4) After that, `/setup` should refuse changes because a manager now exists

## 7) Public smoke test (do this before announcing)

- Customer can sign in and place an order
- Staff can sign in and see `/staff/orders`
- Staff can change an order status
- Customer can open `/loyalty` and generate a QR token
- Staff can stamp loyalty via `/staff/loyalty-scan`
- `DEV_AUTH_ENABLED` is OFF

