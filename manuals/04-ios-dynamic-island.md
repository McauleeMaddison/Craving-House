# iOS Dynamic Island (Phase 2)

You asked for a sleek “coffee bean” animation in the iPhone Dynamic Island when a customer earns a loyalty stamp.

## Important constraint

- A web app / PWA cannot control the iPhone Dynamic Island.
- Dynamic Island requires a **native iOS app** using **ActivityKit (Live Activities)** and a supported iPhone model.

## Practical plan

### Phase 1 (MVP: web-first)
- Customers use the web app (PWA) for menu, ordering, and a QR loyalty card
- Staff scan the customer QR and apply spend-based stamps securely
- The web UI can show a smooth “stamp added” animation in-app

### Phase 2 (native iOS add-on)
- Build a small iOS app (SwiftUI) focused on:
  - Sign in (e.g. Google)
  - Wallet-style loyalty card
  - Live Activity for “stamp earned” moment + Dynamic Island presentation
- Backend remains the same; the iOS app uses the same API

## What I need from you later
- Confirm your loyalty parameters (e.g. £5 per stamp, 9 stamps = reward)
- Whether the “stamp earned” moment happens at:
  - collection time (staff scan), or
  - order placement (not recommended for fraud)
- Apple Developer account (for device testing + App Store release)
