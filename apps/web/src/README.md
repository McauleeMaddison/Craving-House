# Source Map

Use this folder layout as the quick navigation guide for the web app.

- `app/`
  Next.js routes, layouts, metadata files, and API handlers.
  Route groups under `app/api/` split handlers by concern:
  `auth`, `backoffice`, `commerce`, `engagement`, and `operations`.
- `features/`
  Route-level and domain-level UI modules.
  Most page components stay thin and hand off to a feature client here.
- `components/`
  Reusable UI building blocks shared across multiple features,
  such as navigation, cart context, icons, and brand assets.
- `server/`
  Server-only logic for auth, database access, payments, notifications,
  monitoring, and request security.
- `lib/`
  Shared pure helpers and small domain utilities used across both
  server and client code.
- `styles/`
  Global styling.
  `globals.css` contains the shared theme, layout, and responsive rules.
- `types/`
  Ambient and framework type extensions.

Practical rule of thumb:

- Add route files to `app/`.
- Add reusable UI to `components/`.
- Add page-specific or domain-specific behavior to `features/`.
- Add server-only business logic to `server/`.
- Add framework-agnostic helpers to `lib/`.
