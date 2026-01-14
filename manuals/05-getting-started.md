# Getting Started (MacBook + VS Code, simple)

This project is designed so you can build on a MacBook using VS Code, while the finished product works great on phones (mobile web / PWA).

## 0) What you’re building (in one sentence)

A **mobile-friendly web app (PWA)** where customers order ahead and earn loyalty, and staff/managers securely manage menu + orders + loyalty + reviews.

Why this is the right start:
- It works on iPhone/Android immediately in the browser.
- You can later add a native iOS app for Dynamic Island (Phase 2) without rebuilding your backend.

## 1) Install the basics (once)

### 1.1 Node.js (required)
Install **Node.js 20 LTS**.

How to confirm:
- In Terminal: `node -v` should show something like `v20.x`
- `npm -v` should print a version

If your Mac is “oldish”, Node 20 is still the safest modern baseline.

### 1.2 VS Code (recommended)
You already have it. In VS Code, open the folder:
- `Craving House Coffee App`

### 1.3 Git (recommended)
Not required to run, but required to track changes safely.

Confirm:
- `git --version`

## 2) Understand the folder structure (clean and professional)

At the root:
- `manuals/` — all written plans/specs (treat this like your project binder)
- `apps/web/` — the real application (Next.js)
- `frontend/` — tiny static landing page (optional)

Inside `apps/web/`:
- `src/app/` — pages + API routes (Next.js “App Router”)
- `src/server/` — server-only code (auth, DB helpers)
- `src/lib/` — shared business logic (loyalty calculations, prep time calculation)
- `prisma/schema.prisma` — the database tables (the “truth” of your data model)
- `.env` — secrets + local settings (never commit this)

## 3) Your “three-layer” mental model (simple and correct)

1) **UI layer** (what users see)
   - pages like home, menu, cart, loyalty card, staff dashboard
2) **Server/API layer** (secure logic)
   - order creation, updating status, stamping loyalty, admin tasks
3) **Database layer** (truth + audit trail)
   - users, products, orders, stamps, reviews, etc.

Most “security” is done by keeping sensitive actions in layer 2 and checking roles.

## 4) First run (local development)

From the project root in Terminal:

1) Create your local env file:
   - `cp apps/web/.env.example apps/web/.env`
2) Open `apps/web/.env` and fill in values (especially `DATABASE_URL`).
3) Create the database tables + seed starter menu:
   - `npm -w apps/web run dev:setup`
4) Start the dev server:
   - `npm run dev`
5) Open:
   - `http://localhost:3000`

## 5) Environment variables (what they mean, plainly)

Open `apps/web/.env.example` and you’ll see:

- `DATABASE_URL`
  - Your Postgres connection string (Railway for production; Railway dev DB also works)
- `NEXTAUTH_URL`
  - The local URL of your site in dev
- `NEXTAUTH_SECRET`
  - Encrypts/signs sessions; keep private
- `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
  - For “Continue with Google” login
- `QR_SECRET`
  - Signs customer QR tokens so they can’t be forged

If you don’t fill Google OAuth creds yet, sign-in won’t work. That’s expected.

## 6) Roles (security in one word: “separation”)

We use roles to stop customers accessing staff tools:
- `customer` — order + loyalty + reviews
- `staff` — order queue + add stamps (scan)
- `manager` — staff tools + manage menu, prep times, loyalty eligibility, reporting

Rule: any staff/manager action must check role on the server.

## 7) Loyalty (your rule: buy 5 coffees, get 1 free)

Important: loyalty is *not* based on spend anymore; it’s **per eligible coffee**.

How it’s meant to work:
- Manager marks which products earn stamps (`loyaltyEligible`)
- Staff scans customer QR after collection
- Staff submits `eligibleItemCount` (usually number of coffees collected)
- Server increments the customer’s stamp count and writes an audit record

## 8) Pickup time estimates (your rule: per-item prep times)

Manager sets `prepSeconds` per product.

Then the system can estimate:
- `estimatedReadyAt = now + baseSeconds + sum(qty × prepSeconds)`

This keeps it simple and manager-controlled.

## 9) Mobile use (what customers actually do)

For customers:
- They visit your URL on their phone.
- They can “Add to Home Screen” (PWA) for an app-like feel.

For staff:
- Use a tablet/phone in-store for the order queue + scan tool.

For Dynamic Island:
- Not possible in web/PWA (requires a native iOS app later).

## 10) What “done right” looks like (professional baseline)

- Clean structure (already set)
- Typed code (TypeScript)
- Auth via Google (already wired)
- Roles enforced on server routes (started)
- Database migrations tracked (Prisma)
- Logs/audit trails for sensitive actions (we’ll add)
- Minimal, consistent UI components (we’ll design next)

## 11) Next features to build (in correct order)

1) Menu + categories + product editor (manager)
2) Order flow (customer) + order queue (staff)
3) Prep-time ETA calculation + store rules
4) Loyalty card UI + customer QR generation + staff scanner page
5) Rewards redemption flow (staff/manager controlled)
6) Reviews + moderation (manager)
