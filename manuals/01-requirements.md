# Requirements (MVP)

## Core user stories

### Customers
- Browse menu (with prices, availability, allergens)
- Choose pickup location (if multiple) and pickup time window
- Place an order for collection in advance
- Receive order status updates (received / accepted / ready / collected)
- Earn loyalty “stamps” and redeem a reward

### Managers / Staff
- Sign in with staff accounts (restricted access)
- Create/edit menu items and mark items unavailable
- Set store opening hours + pickup lead time (e.g. “20 minutes minimum”)
- View order queue and update status
- Manage loyalty rules (e.g. “buy 9 coffees get 1 free”)

## Key decisions (please answer)

1) Payments: **pay in store**.
2) Pickup scheduling: **ASAP + estimate** (estimate depends on items ordered).
3) Loyalty: **buy 5 coffees, get 1 coffee free** (5 stamps = reward).
4) Loyalty scan: **staff scan a customer QR code** (customer presents QR in their account).
5) Accounts: **Sign in with Apple + Google** (no passwords for MVP).
6) Locations: **one store**.

## Loyalty rules (proposed for MVP)

- Earn rate: **1 stamp per qualifying coffee** (configurable list of products)
- Reward: **1 free coffee** at **5 stamps**
- Stamps are granted only by staff action after collection (scan-based), not self-awarded
- Anti-fraud: QR codes are signed and short-lived; staff can’t stamp without staff login

## Pickup time estimates (manager-managed)

- Each product has a manager-set prep time (seconds)
- The order ETA is computed from the sum of item prep times (and optional store-wide base time)

## Security expectations

- Customer data protected (least privilege, secure sessions, rate limiting)
- Staff/admin area locked to staff roles only
- Audit trail for key actions (menu changes, refunds, loyalty adjustments)
