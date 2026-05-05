# Client Handover Checklist

Use this before any demo, sale, or production ownership transfer.

## 1) Release Health Gate

Run from repository root:

```bash
npm run lint
npm run test
npm run build
npm run e2e -w apps/web
npm run quality:bundle -w apps/web
```

Expected result: all commands pass.

## 2) Environment and Secrets

1. Use `apps/web/.env` as the source of required keys when configuring production env vars.
2. Generate new production secrets (do not reuse development values):
3. `NEXTAUTH_SECRET`
4. `MFA_ENCRYPTION_KEY`
5. `INITIAL_MANAGER_SETUP_CODE`
6. `HEALTHCHECK_TOKEN`
7. `UPTIME_CHECK_TOKEN`
8. `QR_SECRET`
9. Verify `NEXTAUTH_URL` exactly matches the public HTTPS domain.
10. Confirm `DEV_AUTH_ENABLED=false` and `NEXT_PUBLIC_DEV_AUTH_ENABLED=false`.

## 3) External Integrations

1. Stripe:
2. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
3. Configure webhook endpoint: `https://<domain>/api/webhooks/stripe`.
4. Ensure webhook events include Checkout completion/payment updates.
5. Optional: set `STRIPE_WEBHOOK_IP_ALLOWLIST`.

6. Database:
7. Confirm `DATABASE_URL` points to production Postgres.
8. Run schema deploy on production:

```bash
npm run prisma:deploy -w apps/web
```

9. Push notifications:
10. Configure `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

11. Email/alerts:
12. Configure `SMTP_*` and `OPERATIONS_ALERT_EMAIL`.
13. Optionally set `OPERATIONS_ALERT_WEBHOOK_URL`.

## 4) Access and Operations Handover

1. Deliver these to the client via secure channel:
2. Production URL
3. Manager account bootstrap process (`/setup`)
4. Monitoring/health endpoints and tokens
5. Stripe dashboard access ownership
6. Database ownership/access policy
7. Domain/DNS/SSL ownership

8. Confirm least privilege:
9. No shared personal accounts
10. Remove temporary team access after handover
11. Rotate any secrets that were ever shared in plain text

## 5) Known Risk Register

1. `npm audit` currently reports moderate transitive advisories in the `next`/`next-auth` chain.
2. No safe non-breaking `npm audit fix` is available automatically.
3. Mitigation: keep dependencies patched regularly and review advisories each release cycle.
