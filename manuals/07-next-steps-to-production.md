# Next Steps (from “it runs” → “the public can use it”)

This is the blunt, correct path to launching a secure customer app that owners can manage.

## A) Choose the “best version” (what you should use)

Use this rule:
- The **UI is not security** (it’s just screens).
- The **server is security** (it decides what is allowed).

So the “best version” is:
- **Next.js + NextAuth (Apple/Google) + Prisma + roles enforced in server routes**

That is what your project is set up for.

## B) You need 5 things before the public can use it

1) A real domain + HTTPS
2) Real database in production (Postgres) + backups
3) Working sign-in (Apple + Google) with correct redirect URLs
4) A staff/manager admin area (menu, prep times, order queue, loyalty, reviews)
5) Policies + operations (privacy policy, basic monitoring, support process)

## C) Step-by-step: what to do next (in order)

### Step 1 — Get sign-in working locally

1) Copy env:
   - `cp apps/web/.env.example apps/web/.env`
2) Fill in:
   - `NEXTAUTH_SECRET`
    - Google + Apple credentials
3) Create DB tables + seed menu:
   - `npm -w apps/web run dev:setup`
4) Start:
   - `npm run dev`
5) Test:
   - Visit `/signin` and sign in

### Step 2 — Decide how you assign staff/manager roles (critical)

By default new users are `customer`.

Safe options:
- Option A (best for small shop): owner email is hard-coded as first manager (then manager can promote staff)
- Option B: one-time setup code creates the first manager, then disables itself

We should implement one of these next so you can actually run the business side.

If you use Option B:
- Set `INITIAL_MANAGER_SETUP_CODE` in `apps/web/.env`
- Sign in as the intended owner account
- Visit `/setup` once and enter the code

### Step 3 — Build manager menu management (so the shop can operate)

Manager must be able to manage:
- products (name, price, available)
- per-item prep time (`prepSeconds`)
- loyalty eligibility (`loyaltyEligible`)

If managers can’t manage menu + prep times, pickup estimates will never stay accurate.

### Step 4 — Build customer ordering + staff order queue

Minimum:
- customer: menu → cart → place order (pay in store)
- staff: see queue, update status (`received → accepted → ready → collected`)

### Step 5 — Build loyalty flow (your rule: buy 5 get 1 free)

Minimum:
- customer: loyalty card page with QR code
- staff: scan QR after collection, add stamps
- server: increments stamps and writes a stamp log entry (audit trail)

### Step 6 — Add reviews/feedback + manager moderation

Minimum:
- customer: submit feedback (optionally tied to an order)
- manager: view, hide/unhide, reply or internal note, audit who moderated and why

See `manuals/06-reviews-and-management.md`.

## D) Deployment choices (pick one)

To launch publicly you’ll choose a host and database:

Common “easy” options:
- App hosting: Vercel (simple for Next.js)
- Database: managed Postgres (Neon / Supabase / Render / Railway)

Use Postgres for production (and ideally a separate Postgres DB for dev/testing).

## E) “Done” checklist (launch readiness)

- OAuth configured with production callback URLs
- Database backups enabled
- Admin/staff routes require roles on the server
- Rate limiting on sensitive endpoints (auth, loyalty, feedback)
- Basic logging and an audit trail for manager actions
- Privacy policy + terms + contact email
