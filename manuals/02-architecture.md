# Architecture (Web-first, scalable)

## Why web-first (PWA)
- One codebase works on iPhone/Android and desktop
- Fast to ship and easy to maintain
- Later you can add a native app without redoing backend logic

## High-level components

- UI (customers): menu, cart, checkout, order tracking, loyalty card
- UI (staff): order queue + status updates
- UI (manager): menu + hours + loyalty rules + reporting
- Server routes: order placement, availability checks, loyalty stamping, admin actions
- Database: users, menu, orders, loyalty stamps, rewards

## Roles (RBAC)
- `customer`: place orders, view own orders, view loyalty
- `staff`: view/update orders, apply loyalty stamps
- `manager`: staff permissions + manage menu/hours/loyalty settings
