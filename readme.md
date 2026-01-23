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

## Run

- Dev: `npm run dev`
- Build: `npm run build`
- Start: `npm run start`
- Lint: `npm run lint`

## Security note

Do not commit secrets (API keys, private keys, `.env` files). If secrets were ever committed, rotate them and purge them from git history.
