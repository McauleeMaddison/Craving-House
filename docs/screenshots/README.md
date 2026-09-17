# Frontend Screenshot Evidence

Captured on **17 September 2026** from the actual locally running Django application, using the Codex in-app browser and a disposable seeded SQLite database. The browser exports JPEG bytes, so the captured files use `.jpg` extensions. These are viewport screenshots, not generated illustrations or production captures. Demonstration contact details and loyalty code are synthetic/seeded. The local database is not included in the repository.

Desktop viewport: **1440 × 900**. Mobile viewport: **375 × 812**. A browser scrollbar may reduce captured content width. Long pages extend below the viewport. Screenshots show different stages of the same assessment session; for example, the order becomes Ready and the card increases to three stamps. They do not represent a single simultaneous database snapshot.

## Captured checklist

| Complete | File | Evidence / state |
| --- | --- | --- |
| [x] | [01-home-desktop.jpg](01-home-desktop.jpg) | Guest dashboard; corrected eight-stamp message; desktop actions. |
| [x] | [02-home-mobile.jpg](02-home-mobile.jpg) | Home at 375px with mobile toggle and stacked shortcuts. |
| [x] | [03-menu-desktop.jpg](03-menu-desktop.jpg) | Desktop category/card layout, including the temporary Assessment Cocoa item created during M19. |
| [x] | [04-menu-mobile.jpg](04-menu-mobile.jpg) | Mobile menu heading, cards and ordering controls. |
| [x] | [05-item-customisation.jpg](05-item-customisation.jpg) | Waffle disclosure open; Nutella +£1.10 selected. |
| [x] | [06-cart.jpg](06-cart.jpg) | Two waffles with Nutella, £12.80 total. |
| [x] | [07-checkout.jpg](07-checkout.jpg) | Guest details form/summary; unconfigured Stripe disabled. |
| [x] | [08-order-confirmation.jpg](08-order-confirmation.jpg) | Counter order after staff marked it Ready for collection. |
| [x] | [09-login-account.jpg](09-login-account.jpg) | Login fields and signup link. |
| [x] | [10-loyalty.jpg](10-loyalty.jpg) | Customer card, locally generated QR and three earned stamps. |
| [x] | [11-feedback.jpg](11-feedback.jpg) | Signed-in form uses seeded customer email. |
| [x] | [12-boiler-buster.jpg](12-boiler-buster.jpg) | Game interface in standby; gameplay is documented in M17. |
| [x] | [13-staff-dashboard.jpg](13-staff-dashboard.jpg) | Active order overview, status/payment counts and loyalty station. |
| [x] | [14-staff-order-management.jpg](14-staff-order-management.jpg) | Mobile order station, Ready state and update control. |
| [x] | [15-manager-menu-management.jpg](15-manager-menu-management.jpg) | Manager metrics and item actions. |
| [x] | [16-signup.jpg](16-signup.jpg) | Registration fields and Django password guidance. |
| [x] | [17-loyalty-mobile-after-stamps.jpg](17-loyalty-mobile-after-stamps.jpg) | Mobile customer card after staff awarded three stamps. |

## Remaining manual evidence

Use a local/test deployment and synthetic data. Keep real customer details, private order lookup links and secrets out of shared captures. Suggested files below **do not yet exist** and are deliberately not image links.

- [ ] `18-stripe-test-checkout.png`: Stripe-hosted test checkout, using a test-mode key.
- [ ] `19-stripe-paid-confirmation.png`: return to the app with Payment successful and matching order total. Also record cancel/error behaviour in the testing table.
- [ ] `20-staff-camera-scan.png`: successful scan of the seeded customer QR using a physical camera; show decoded code/status, not a customer's personal card.
- [ ] `21-customer-order-history.png`: signed-in customer history with tracking links; only that account's orders.
- [ ] `22-form-validation.png`: visible Django error state, such as mismatched signup passwords, with sensitive fields empty.
- [ ] `23-tablet-checkout.png`: 768px checkout in a separately identified browser.
- [ ] `24-dark-theme-mobile.png`: readable mobile form/menu in dark mode.

For each new capture, add its actual filename, date, browser/version, viewport, role and test ID to this checklist. Replace planned status only after performing the action and verifying the result. Review the image before adding a Markdown link.
