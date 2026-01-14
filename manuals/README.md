# Craving House (Web + Mobile) — Starter

Modern ordering + loyalty app for Craving House Coffee:
- Customers: order ahead for collection, track loyalty “stamps”, redeem rewards
- Managers/staff: manage menu, opening hours, order queue, loyalty rules, users

This repo is scaffolded as a **clean starting point** you can grow into a professional app.

## Recommended approach (simple → scalable)

1) **Start with a single web app (PWA)** that works great on phones and tablets.
2) Add a small database + server logic for orders/loyalty/admin.
3) If you still want a native app later, reuse the same backend/API.

## Stack (picked for an older MacBook and long-term maintainability)

- Web: Next.js (TypeScript)
- Database: Postgres (Railway in production; you can use a Railway dev DB too)
- ORM: Prisma
- Auth (planned): role-based access (customer/manager/staff), secure sessions

## Project layout

- `manuals/` — requirements, architecture, run guides
- `apps/web/` — Next.js app (UI + server routes)

## Next steps

1) Answer the questions in `manuals/01-requirements.md` so we can lock the MVP.
2) Install prerequisites:
   - Node.js 20 LTS
   - Git
3) Then we’ll run:
   - `npm install`
   - `npm run dev`

Quick local entry points:
- `frontend/index.html` (simple HTML/CSS/JS landing page)
- `apps/web` (the real app: Next.js)

Note: **Dynamic Island** effects require a native iOS app (Live Activities). See `manuals/04-ios-dynamic-island.md`.

Guides:
- `manuals/05-getting-started.md`
- `manuals/06-reviews-and-management.md`
- `manuals/07-next-steps-to-production.md`
- `manuals/08-run-and-see-it.md`
- `manuals/09-fonts.md`
- `manuals/10-launch-checklist.md`
- `manuals/11-deploy-render-railway.md`
- `manuals/12-oauth-and-staff-roles.md`

Admin:
- First manager setup (one-time): `/setup`
