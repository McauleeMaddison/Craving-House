# Launch checklist (public-ready)

This is what “ready for the public” means for this app.

## 1) Kill anything “dev”

- `DEV_AUTH_ENABLED` must be `false`
- `NEXT_PUBLIC_DEV_AUTH_ENABLED` must be `false`
- Use real Google sign-in

## 2) Use a production database (not SQLite)

Public launch should use **managed Postgres** with backups (Railway is fine).

You will:
- Create a Postgres database (managed provider)
- Set `DATABASE_URL` in production
- Run `prisma migrate deploy` in production

## 3) Configure OAuth properly (Google)

You must set correct production callback URLs:
- `NEXTAUTH_URL` = your real domain (https)
- Google OAuth: add redirect URL for NextAuth

If OAuth redirects are wrong, sign-in will fail for everyone.

## 4) Add the legal pages (required for real users)

Before launch, replace placeholders with your final wording:
- `/privacy`
- `/terms`
- `/contact`

## 5) Add basic abuse protection

Minimum for launch:
- Rate limit auth + loyalty + feedback endpoints
- Add server-side validation everywhere (never trust the browser)
- Keep an audit trail for manager/staff actions (loyalty stamps, role changes, menu edits)

## 6) Operational readiness

- Backups enabled (automatic)
- Basic logging enabled
- A way to support users (email/contact)
- Test on real phones (iOS Safari + Android Chrome)

## 7) PWA / “Add to Home Screen”

The app includes a manifest so users can add it to their home screen.
Verify:
- iPhone: Safari → Share → Add to Home Screen
- Android: “Install app” prompt (Chrome)

## 8) Final smoke test (do this before announcing)

- New customer can sign in and place an order
- Staff can see the queue and update status
- Loyalty QR can be generated and stamped by staff
- Manager can sign in and access `/manager`
