# Client Handover Checklist

Last audited: 2026-04-09

## Status Legend

- `[x]` Verified on 2026-04-09 from live Render checks and/or local build/test evidence
- `[-]` Implemented or code-backed, but still needs a live authenticated/payment walkthrough
- `[ ]` Not yet verified, currently blocked, or still needs manual client-facing QA

## Current Evidence

- Live public URL detected from app config and verified: `https://craving-house.onrender.com`
- Live checks verified:
  - `GET /api/health` => `200` with `{"ok":true,...}`
  - `GET /api/health?verbose=1` => `403` when unauthenticated
  - `GET /api/payments/stripe/enabled` => `{"enabled":false}`
  - `GET /`, `/menu`, `/cart`, `/checkout`, `/signin`, `/loyalty`, `/orders`, `/staff`, `/manager` => `200`
  - `GET /contact`, `/help`, `/privacy`, `/terms` => `200`
  - `GET /api/menu` => `43` products returned
- Local verification passed:
  - `npm test --workspace apps/web`
  - `npm run lint --workspace apps/web`
  - `../../node_modules/.bin/tsc --noEmit -p apps/web/tsconfig.json`
  - `npm run build --workspace apps/web`
- Handover role accounts exist in the deployment database for customer, staff, and manager.
- Local authenticated walkthrough now passes for all three roles after fixing the credentials callback route.
- Rollback and failed-deploy recovery steps are now documented in [`docs/deploy-rollback-recovery.md`](/Users/user/Desktop/Craving House Coffee App/docs/deploy-rollback-recovery.md).

## Current Blockers To 100%

1. The live Render deployment still needs the current auth fix deployed and re-verified.
2. Stripe is not enabled on the live Render deployment right now.
3. No live payment walkthrough has been completed yet for guest or signed-in checkout.
4. No human mobile QA pass has been completed yet on iPhone-sized viewports.

## Necessary Steps To Reach 100%

1. Deploy the current auth fix to Render and re-run the live role walkthrough.
   - Confirm customer, staff, and manager credentials sign in cleanly on `https://craving-house.onrender.com`.
   - Confirm the protected role pages show the correct access state after sign-in.
2. Enable live test payments on Render.
   - Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` on Render.
   - Confirm `GET /api/payments/stripe/enabled` returns `{"enabled":true}`.
   - Confirm Stripe is intentionally in test mode before any client handover demo.
3. Run the full live flow walkthrough on `https://craving-house.onrender.com`.
   - Guest order flow with test card.
   - Signed-in customer order flow.
   - Staff queue and loyalty scan flow.
   - Manager product/settings/users/audit flow.
4. Do the final client-facing polish pass.
   - Mobile spacing/tap-target review.
   - Copy consistency review.
   - Empty/loading/error state review.
   - Final sign-off pass with no launch blockers remaining.
5. Use the rollback/recovery runbook during release sign-off.
   - Confirm the operator handover matches [`docs/deploy-rollback-recovery.md`](/Users/user/Desktop/Craving House Coffee App/docs/deploy-rollback-recovery.md).

## Checklist

### Pre-Flight

- [-] App loads on the public Render URL without console-breaking errors.
- [x] `GET /api/health` returns `ok: true`.
- [ ] Stripe is in the intended mode for testing.
- [-] Required env vars are present and app boots cleanly after deploy.
- [x] Test accounts are available for customer, staff, and manager roles.
- [x] Test card available: `4242 4242 4242 4242`.

### Smoke Test

- [ ] Home page loads correctly on mobile.
- [x] Menu page loads and products render correctly.
- [x] Cart page loads.
- [x] Checkout page loads.
- [x] Sign in page loads.
- [x] Loyalty page loads.
- [x] Orders page loads.
- [-] Staff portal is accessible to staff only.
- [-] Manager portal is accessible to manager only.

### Guest Customer Flow

- [x] Guest can browse menu.
- [-] Hidden add-on products do not appear as standalone menu items.
- [-] Guest can customise supported items.
- [-] Guest can add items to cart.
- [-] Cart totals update correctly.
- [-] Empty cart state is clear and correct.
- [-] Guest checkout requires email when not signed in.
- [ ] Guest can create an order successfully.
- [ ] Guest receives the correct order confirmation/tracking flow.
- [ ] Guest can open guest order tracking page and see status updates.

### Signed-In Customer Flow

- [-] Customer can sign in successfully.
- [-] Signed-in user sees correct dashboard state.
- [-] Menu, cart, and checkout work while signed in.
- [ ] Signed-in user can place an order successfully.
- [-] Signed-in user can view order history.
- [-] Signed-in user can open an individual order detail page.
- [-] Sign out works cleanly.
- [-] Signed-out user cannot access customer-only pages that require auth.

### Loyalty

- [-] Signed-in customer can access loyalty page.
- [-] QR card loads correctly.
- [-] Loyalty stamps display correctly.
- [ ] Loyalty progress updates correctly after eligible purchase.
- [ ] Non-eligible items do not incorrectly affect loyalty.
- [-] Staff loyalty scan flow works.
- [-] Manual stamp/redeem paths behave correctly if enabled.

### Menu and Cart Validation

- [-] Menu categories and descriptions look correct.
- [-] Unavailable items are visible or hidden as intended.
- [-] Unavailable items cannot be added to cart.
- [-] Item customisations are attached to the parent item, not sold standalone.
- [-] Cart quantity increase/decrease works.
- [-] Removing items works.
- [-] Cart persists correctly across navigation.
- [-] Cart badge/count updates correctly in mobile nav.
- [-] Cart does not show stale or invalid items after availability changes.

### Stripe Payment / Order Verification

- [ ] Guest order completes successfully in Stripe test mode.
- [ ] Signed-in order completes successfully in Stripe test mode.
- [ ] Successful payment updates order to paid.
- [ ] Stripe success redirect works.
- [ ] Stripe cancel redirect works.
- [ ] Expired / abandoned payment does not incorrectly mark order as paid.
- [ ] Webhook is received and processed correctly.
- [ ] Paid order appears in staff/manager order views.
- [ ] Customer-facing order tracking matches back-office status.
- [ ] Order totals match Stripe payment totals.

### Staff Flow

- [-] Staff can sign in.
- [-] Staff can access order queue.
- [ ] New paid orders appear in the queue.
- [-] Staff can change order status.
- [ ] Status changes are reflected for the customer.
- [-] Staff can use loyalty scan page if intended.
- [-] Staff cannot access manager-only pages.

### Manager Flow

- [-] Manager can sign in.
- [-] Manager dashboard loads.
- [-] Manager can view orders.
- [-] Manager can create/edit products.
- [-] Manager can change availability.
- [-] Manager can verify hidden modifier/add-on items are not exposed on customer menu.
- [-] Manager can manage users/roles if intended.
- [-] Manager settings page loads and saves correctly.
- [-] Audit page loads and is readable.

### Auth / Access Control

- [-] Customer cannot access staff pages.
- [-] Customer cannot access manager pages.
- [-] Staff cannot access manager-only pages.
- [-] Manager can access both manager and staff tools as intended.
- [-] Protected API routes reject unauthorized access.
- [ ] Session persists correctly after sign in.
- [ ] Session ends correctly after sign out.

### Mobile UX

- [ ] Home page looks correct on iPhone-sized viewport.
- [ ] Mobile drawer opens and closes correctly.
- [ ] Menu is not duplicated awkwardly in the mobile drawer.
- [ ] Cart is easy to find from mobile navigation.
- [ ] Buttons are tappable and not crowded.
- [ ] No clipped text, overlapping cards, or broken spacing.
- [ ] Empty states read clearly.
- [ ] Loading states do not feel broken.
- [ ] Error states are understandable and actionable.

### Content / Polish

- [ ] Copy is consistent across dashboard, menu, cart, checkout, and orders.
- [-] Currency formatting is correct everywhere.
- [ ] Prep time messaging is consistent.
- [ ] Loyalty wording is consistent.
- [ ] No placeholder text or internal/admin wording leaks into customer pages.
- [x] Privacy, terms, contact, and help pages load correctly.

### Operational Confidence

- [x] `/api/health` can be used by uptime monitoring.
- [-] `verbose=1` health diagnostics work for manager or token access.
- [ ] Render deploy logs are clean after successful deploy.
- [ ] Database migration step completes cleanly on deploy.
- [x] Rollback path is understood and documented.
- [ ] Stripe webhook endpoint is configured correctly in Stripe Dashboard.
- [x] Environment variables are documented and current.
- [x] Recovery steps for failed deploy are documented.

### Release Sign-Off

- [ ] Guest order flow approved.
- [ ] Signed-in customer flow approved.
- [ ] Staff flow approved.
- [ ] Manager flow approved.
- [ ] Stripe payment flow approved.
- [ ] Mobile UX approved.
- [ ] No launch-blocking bugs remain.
- [ ] Ready for launch.
