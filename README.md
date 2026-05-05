# Craving House Coffee App

Production-ready monorepo for the Craving House mobile-first web application.

## Overview

This project powers customer ordering and loyalty, plus staff and manager
operational portals.

## Stack

- Next.js 16
- React 18
- TypeScript
- NextAuth
- Prisma
- Stripe Checkout + Webhooks

## Repository Layout

- `apps/web` - Main web application (app routes, API handlers, UI, server modules)
- `static` - Static assets
- `scripts` - Workspace-level utility scripts

## Prerequisites

- Node.js `24.14.1` LTS
- npm
- A Prisma-compatible database

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment file:

```bash
touch apps/web/.env
```

3. Configure required variables in `apps/web/.env`.
4. Initialize schema and seed data:

```bash
npm run dev:setup -w apps/web
```

## Run

```bash
npm run dev
```

## Quality Checks

```bash
npm run lint
npm run test
npm run build
```

## Deployment Notes

- Set production env vars in your host (including auth, database, and Stripe keys).
- Ensure `NEXTAUTH_URL` uses your public HTTPS domain.
- Configure Stripe webhook endpoint to `/api/webhooks/stripe`.
- Use `CLIENT_HANDOVER.md` for final release and ownership-transfer checks.

## Security Baseline

- Keep development auth toggles disabled in production.
- Never commit secrets or `.env` files.
- Use a dedicated `MFA_ENCRYPTION_KEY` distinct from `NEXTAUTH_SECRET`.
