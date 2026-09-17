# Craving House Coffee App

**Project 4 — Full Stack Frameworks with Django**

[Live application](https://craving-house-app.onrender.com) · [GitHub repository](https://github.com/McauleeMaddison/Craving-House)

## Project Overview

Craving House is a Python and Django application for a coffee shop. Customers browse food and drinks, customise items, place pickup orders, collect loyalty stamps and send feedback. Staff manage the order queue and award stamps; managers maintain the menu. Boiler Buster gives customers a short game to play while waiting.

The project demonstrates both sides of a full-stack application: responsive HTML templates, CSS and JavaScript provide the interface, while Django routes, views, forms, authentication and the ORM handle requests and persist data. The cart belongs to the browser session; completed orders, menu data, feedback and loyalty records belong to the database. Pages render on the server, with JavaScript enhancements for navigation, themes, cart feedback, camera scanning and the game.

This documentation describes the implementation in this repository. The dated evidence below comes from a local assessment run on **17 September 2026**, not a production deployment test.

## Contents

- [User experience](#user-experience) and [user stories](#user-stories)
- [Front-end design](#front-end-design), [features](#front-end-features) and [responsive design](#responsive-design)
- [Full-stack integration](#full-stack-integration)
- [Screenshot evidence](#frontend-screenshot-evidence)
- [Front-end testing](#front-end-testing), [automated testing](#automated-testing) and [validation](#validation--code-quality)
- [Bugs and fixes](#bugs-and-fixes)
- [Database and backend](#database--backend)
- [Setup](#setup), [assessor access](#assessor-test-access), [payment testing](#payment-testing) and [deployment](#deployment-notes)

## Technology Stack

- Python 3.9+
- Django 4.2
- SQLite for local development
- Django templates for server-rendered pages
- Django forms for validation
- Django ORM for database models and queries
- Django authentication and admin
- Django test runner for quality checks

## Main Features

- Customer menu browsing with prices, prep times, and item availability
- Item customisation for add-ons such as waffle toppings, hot dog toppings, and meal sides
- Session-based cart for pickup orders
- Checkout flow for Stripe test card payment or counter payment
- Private order confirmation pages with lookup codes
- Staff dashboard for viewing and updating active orders (refresh to obtain new orders)
- Digital loyalty card with staff stamp scanning
- Interactive Boiler Buster pressure-control mini game
- Customer feedback form saved to the database
- Manager dashboard for creating, editing, showing, and hiding menu items
- Django admin for full data management

## Project Structure

- `manage.py` - Django command-line entry point
- `craving_house/` - Django project settings, root URLs, ASGI, and WSGI config
- `cafe/` - main application code, including models, forms, views, admin, tests, and demo seed command
- `templates/` - Django HTML templates
- `static/django/` - application CSS and JavaScript
- `images/` - Craving House brand assets served as static files
- `requirements.txt` - Python dependencies
- `.env` - optional private local configuration; not loaded automatically or committed; production values are configured in Render

## Required Stack Evidence

- `manage.py` starts and manages the Django application.
- `craving_house/settings.py` configures the Django project.
- `cafe/models.py` defines the database schema using the Django ORM.
- `cafe/views.py` handles customer, staff, manager, and loyalty workflows.
- `cafe/payments.py` creates Stripe Checkout sessions for test card payments.
- `templates/` contains server-rendered Django pages.
- `static/django/js/clicker.js` powers the interactive Boiler Buster game.
- `cafe/tests.py` verifies ordering and access-control behaviour.
- `requirements.txt` lists Django as the application dependency.

## User Experience

| User group | Purpose and journey |
| --- | --- |
| Guest/customer | Start from the home page, browse the menu, choose quantity/add-ons, review the cart and place a counter-payment order without creating an account. Keep the confirmation URL to check its status. Guests can submit feedback and play Boiler Buster. |
| Registered customer | Sign in to see a named welcome, personal loyalty card and the eight most recent orders placed while signed in. Feedback uses the account email. Signup creates a loyalty profile and signs the customer in. |
| Staff | Signing in redirects the home route to the service dashboard. Staff see the oldest active order first, payment indicators, status controls and a loyalty station with manual code entry and optional camera scanning. |
| Manager/admin | Managers land on the menu dashboard, can create/edit/delete items and change availability, and can access the staff portal. Django admin is a separate interface controlled by Django staff status and model permissions; the seeded manager is a superuser. |

The shared navigation adapts to these roles. Staff and managers receive a **Portal** drawer and operational links instead of customer shopping links. Hiding links is a presentation choice; decorators in `cafe/views.py` enforce access on the server as well.

## User Stories

These stories describe implemented features. Acceptance criteria are observable outcomes, not proposed functionality. `M` references the manual functional table below; `A` refers to the existing Django suite; `S` refers to the supplementary request checks. Screenshots are indexed in [docs/screenshots](docs/screenshots/README.md).

| ID | User story | Acceptance criteria | How the application satisfies it / relevant feature | Testing evidence |
| --- | --- | --- | --- | --- |
| US01 | As a guest, I want to browse the menu, so that I can choose food and drinks. | Categories contain item names, descriptions, prices and preparation times. | `/menu/` renders category and item cards from the ORM. Information appears on the card; there is no separate product-detail page. | M02; A menu test; screenshots 03–04 |
| US02 | As a customer, I want to customise an item, so that my order includes my preferred toppings or sides. | Available add-ons can be selected; their names and prices appear in the cart. | Native **Customize** disclosures and checkboxes submit add-on IDs. Django accepts only available add-ons belonging to that item. | M04; A add-on calculation test; screenshot 05 |
| US03 | As a customer, I want to add items to my cart, so that I can build a pickup order. | Quantity is reflected in the cart and its navigation badge. | Menu POST forms are enhanced with `fetch`; the response updates badges without leaving the menu. | M03–04; A AJAX payload test |
| US04 | As a customer, I want to update or remove cart items, so that I can correct my order before checkout. | Update recalculates totals; Remove or quantity zero removes the line; an empty cart has a menu link. | `/cart/` posts to `update_cart`; summary values are recalculated from current menu data. | M05–07; S zero-removal check; screenshot 06 |
| US05 | As a customer, I want to place an order, so that the café can prepare it for collection. | Name is required; valid checkout creates an order with the selected items, total and prep estimate. | `CheckoutForm` validates details; `create_order_from_cart` stores order/item snapshots in a transaction. | M08–09; A checkout test; S invalid checkout; screenshots 07–08 |
| US06 | As a customer, I want to pay at the counter, so that I can order without entering card details online. | Confirmation states the amount due at collection and the cart is cleared. | Counter checkout stores payment method `counter` and status `due`. | M09–10; A counter-order assertions |
| US07 | As a customer, I want to use Stripe test checkout when configured, so that I can try card payment. | Unconfigured card payment is disabled; configured checkout redirects to Stripe; a verified paid return updates the order. | `cafe/payments.py` creates/retrieves Checkout sessions; the confirmation view checks payment status and order reference. | M11; S unconfigured direct POST; A mocked Stripe tests. External checkout remains untested. |
| US08 | As a guest, I want to create an account, so that I can keep a digital loyalty card. | Valid signup creates a user/profile and signs in; invalid input is rejected. | `/signup/` uses `SignUpForm`, based on Django `UserCreationForm`. | A signup test; M14; S signup validation; screenshot 16 |
| US09 | As a registered customer, I want to sign in and sign out, so that I can access my account and end my session. | Valid login shows the username; invalid login displays an error; sign out restores guest navigation. | Django authentication views plus a POST sign-out form in `base.html`. | M12–13, M20; screenshot 09 |
| US10 | As a registered customer, I want to see loyalty progress, so that I know how close I am to a reward. | The card shows a code/QR, current stamps out of eight and rewards available. | `/loyalty/` renders the profile, locally generated QR SVG and eight stamp positions. | M15, M18; A loyalty rendering; S eight-stamp boundary; screenshots 10, 17 |
| US11 | As a staff member, I want to award loyalty stamps, so that a customer's visit is recorded. | Valid code and 1–8 stamps update the profile and create a scan record; invalid input is rejected. | Staff form posts to `/staff/loyalty/scan/`; camera decoding can fill the same code field. | M18; A scan record test; S invalid scans. Physical camera untested. |
| US12 | As a customer, I want to submit feedback, so that the café can review my experience. | Name/message and a rating of 1–5 are required; success is acknowledged. | `FeedbackForm` stores feedback; signed-in email comes from the account. Review is through Django admin. | M16; A guest/account email tests; S feedback validation; screenshot 11 |
| US13 | As a customer, I want to play Boiler Buster, so that I have something to do while waiting. | Start runs the timer/gauges; taps vent steam; the round can restart. | `/boiler-buster/` loads `clicker.js`; game state is in the browser and best score uses local storage. | M17; A page/legacy-route tests; screenshot 12 |
| US14 | As a staff member, I want to view incoming orders, so that I can prioritise preparation. | Active orders appear oldest first with item/add-on and payment information; collected/cancelled orders are excluded. | `/staff/` queries active orders and renders the next-order card, counts and order station. Refresh to obtain new orders. | M18; A ordering/statistics tests; screenshot 13 |
| US15 | As a staff member, I want to update order statuses, so that customers can check collection progress. | A valid status persists and appears on the customer's confirmation after reload; invalid statuses are rejected. | Staff POST updates `Order.status`; both interfaces read the same record. | M18; S status checks; screenshots 08, 14 |
| US16 | As a manager, I want to manage menu items and availability, so that the customer menu reflects what we can prepare. | New/edit saves fields; Hide disables ordering; Show restores availability; deletion is restricted to managers. | `/manager/` links to `MenuItemForm` and POST toggle/delete routes. Hidden items remain visible as unavailable cards. | M19; A manager access/deletion tests; S form checks; screenshot 15 |
| US17 | As a registered customer, I want to view recent orders, so that I can return to their tracking pages. | Only my eight most recent signed-in orders appear, with statuses and tracking links. | `/orders/` filters by `request.user`, orders newest first and limits the queryset to eight. | A history ownership, limit and checkout-linkage tests; browser history journey still to capture. |

## Front-End Design

The working interface uses [base.html](templates/cafe/base.html), the page templates under `templates/cafe/` and `templates/registration/`, [app.css](static/django/css/app.css), [app.js](static/django/js/app.js) and [clicker.js](static/django/js/clicker.js). `static/html/index.html`, `static/css/style.css` and `static/js/script.js` provide a separate static project launcher; they are not the Django customer interface.

- **Layout and hierarchy:** a shared header, main landmark and footer frame each page. The home page uses action cards and a prominent **Start an order** link. Menu category headings organise item cards. Checkout separates the form from the order summary; staff separate order and loyalty stations; managers use product rows with adjacent actions.
- **Branding and colour:** the existing `images/ch-logo.png` appears in the header and browser icons through the `brand/` static namespace. CSS variables define the gold accent (`#f2b705`), near-black (`#0b0d12`) surfaces, pale text, green success and pink/red danger colours. Gradients, rounded corners, shadows and pills repeat across components. A light/dark switch stores the preference as `cravingHouseTheme` in local storage.
- **Typography:** CSS declares Plus Jakarta Sans/Manrope/Avenir Next for body text and Sora/Avenir Next Demi Bold for display text, with system fallbacks. The base template does not download these fonts; actual typeface depends on what is installed. `clamp()` scales prominent headings, and muted text distinguishes explanations from actions.
- **Controls:** primary ordering actions use the gold accent; secondary navigation uses outlined/surface buttons. The control-height token is 44px. Menu forms group quantity, add-ons and the submit button. Disabled items display **Unavailable**. Manager deletion invokes a JavaScript confirmation dialog.
- **Forms and messages:** Django `form.as_p` renders labelled fields, help text and validation errors for signup, login, checkout, feedback and product editing. Menu quantity controls have descriptive hidden text. Successful actions and server errors appear in a shared polite live region. AJAX cart actions update button text and an item-specific status region.
- **Accessibility present:** `lang="en"`, viewport metadata, a skip-to-content link, semantic navigation/main/footer, visible keyboard focus rules, labelled theme switches, drawer expanded state, native buttons/checkboxes/disclosures, game progressbar values, and a CSS reduced-motion rule. These are implementation features, not a claim of WCAG compliance. See the limitations below for remaining gaps.

## Front-End Features

| Visible feature | Interaction and resulting behaviour | Django/backend connection |
| --- | --- | --- |
| Shared navigation and themes | Desktop links or a mobile drawer; overlay, close button and Escape close the drawer. Switch changes the theme and persists it across reloads. | Context processor provides role flags and cart count. Theme preference remains in the browser. |
| Home dashboard | Menu, loyalty, order/cart shortcuts and **Need help?** guide the next action. A signed-in profile supplies progress. | `home` redirects operational users to their portals. Its active-order count is shop-wide; the Orders widget links to the cart, not personal history. |
| Menu and customisation | Read descriptions/prices/prep times, open **Customize**, choose add-ons and quantity, then add to cart. | `menu` prefetches categories/items/add-ons; `add_to_cart` filters valid choices and updates the session. |
| Cart | See named add-ons, per-unit/line totals, quantity, prep estimate and total. Update, remove, add more or continue. | `cart_summary` prices available items/add-ons using database values. Quantity is capped at 20 per cart line. |
| Checkout and confirmation | Enter pickup details; choose counter payment or configured Stripe. Confirmation shows items, payment information and collection status. | Form validation precedes transactional order creation. The confirmation URL includes the order ID and an unguessable UUID lookup code. |
| Accounts and order history | Signup is linked from Sign in. Customer navigation adds **Orders** after login; history offers tracking links. | Django user/session authentication; history filters by account. Guest orders do not automatically become account history. |
| Loyalty | View QR/card code, eight stamp positions and reward count; show the card to staff. | `CustomerProfile` stores progress. Stamps are awarded explicitly by staff, not automatically by checkout. Every eight stamps converts into one reward. |
| Feedback | Guest email is optional; signed-in feedback displays the account email. Submission shows an acknowledgement. | `FeedbackForm` saves `Feedback`; signed-in submissions cannot override the saved account email via the posted field. |
| Boiler Buster | A 20-second pressure-control game with score, best, timer and streak displays. Tap/click to start and vent; restart after a round. | Django serves the page; JavaScript drives the game. The game's queue is simulated and does not change real orders, stamps or rewards. |
| Staff portal | Next order, status/payment counters, active order cards, status select and loyalty form. Optional camera controls decode a QR into the code field. | Staff-only views update orders and create loyalty audit records. Scanner uses `BarcodeDetector`, with bundled `jsQR` fallback. |
| Manager portal and admin | Menu totals, product list, New item, Edit, Hide/Show and Delete. | Manager-only CRUD views use `MenuItemForm`. Categories/add-ons and feedback review are available in Django admin with appropriate permissions. |

## Responsive Design

The responsive rules were inspected in `static/django/css/app.css`; viewport checks are recorded separately below.

| Range / breakpoint | Actual CSS behaviour |
| --- | --- |
| Desktop above 1180px | Menu uses three equal columns; desktop navigation is visible. Checkout and staff workspaces use multiple columns. |
| 861–1179px | Menu uses two columns. At 980px and above Boiler Buster places its instructions alongside the board. |
| 860px and below, including the tested 768px tablet width | Desktop navigation is hidden and the drawer toggle is shown. Menu, checkout, staff workspace, loyalty card, history, cart rows and manager rows stack into one column. |
| 720px and below | Smaller menu/card spacing and home controls; staff heading/actions stack. The game's statistics use two columns and its machine/tap area scales down. |
| 420px and below, including 375px | Narrower page gutters; header tagline and Menu text are hidden while the labelled 44px toggle remains. Drawer width is capped at `min(92vw, 380px)`; menu hero actions and home shortcut row stack. |
| 380px and below | Boiler Buster action buttons can take full width. |
| Reduced-motion preference | CSS animations/transitions are disabled; the game also reads reduced-motion/coarse-pointer preferences. |

`safe-area-inset` spacing supports narrow-screen headers/home content. Not every CSS selector represents a currently rendered component: older game styles remain in the stylesheet. No separate native mobile application is implemented.

## Full-Stack Integration

The usual path is **template/control → URL route → view → validation/business logic → session or ORM/database → HTML redirect/render or JSON → visible update**.

| Example | End-to-end implementation |
| --- | --- |
| Add a customised item | `menu.html` submits quantity/add-on IDs to `/cart/add/<item_id>/` → `add_to_cart` checks availability and valid add-on ownership → `cart.py` builds a key from item and sorted add-on IDs → Django session is saved → JSON updates navigation badges/status text. Without the enhancement, the form receives a redirect and success message. |
| Counter checkout | `checkout.html` posts to `/checkout/` → `CheckoutForm` validates → `transaction.atomic()` creates `Order` and `OrderItem` snapshots → totals/prep time are calculated → cart clears → UUID confirmation page renders the stored result. The local browser test produced two £6.40 customised waffles, £12.80 total and 10 minutes prep. |
| Loyalty stamps | Staff submits a UUID and count → `LoyaltyScanForm` validates → profile updates and a `LoyaltyScan` records staff/count → success message → customer reloads `/loyalty/` and sees the new progress. |
| Feedback | `feedback.html` posts rating/message → `FeedbackForm` validates → authenticated email is taken from `request.user` → `Feedback` saves → redirect displays acknowledgement. |
| Order status | Staff selects a permitted status → `/staff/orders/<pk>/status/` checks staff access and allowed choices → ORM saves the status → staff page refreshes; the customer confirmation reads the same status on reload. |

## Frontend Screenshot Evidence

Seventeen **real local browser captures** are included in [docs/screenshots/README.md](docs/screenshots/README.md), including all fifteen originally requested views plus signup and mobile loyalty after stamps. The original `images/` files are brand/print assets, not application testing screenshots.

Screenshots show disposable demonstration data on the local server. They document captured states, not every step or every device. These are viewport captures; long pages need scrolling. Full-page capture was avoided because the capture tool included the off-screen navigation drawer in its output.

![Craving House desktop home](docs/screenshots/01-home-desktop.jpg)

![Menu customisation with Nutella selected](docs/screenshots/05-item-customisation.jpg)

![Staff order management on mobile](docs/screenshots/14-staff-order-management.jpg)

Additional evidence still worth capturing manually: external Stripe test checkout/paid return, physical-camera QR scanning, signed-in order history, and representative error states and tablet views in another browser. Suggested filenames and instructions are in the screenshot checklist; no links point to missing images.

## Front-End Testing

### Test environment and evidence boundaries

Testing took place on **17 September 2026**, using Python **3.9.6**, Django **4.2.30** and the **Codex in-app browser** against `http://127.0.0.1:8765`. The browser tool did not report a product version. A fresh seeded SQLite database at `/tmp/craving-assessment.sqlite3` isolated browser orders, users and feedback from the repository's existing database. The local server explicitly had no Stripe key. No production order, payment or deployment was performed.

- **PASS — browser:** the listed action and visible result were exercised through browser controls. This is a bounded manual check performed with UI automation, not a reusable end-to-end test suite.
- **PASS — Django:** an assertion ran in a Django test; it does not prove browser rendering or JavaScript behaviour.
- **Layout check:** the page was loaded at the stated viewport and document width was measured. It does not establish visual perfection, touch usability or contrast compliance.
- **NOT TESTED:** no pass is claimed. Source inspection alone is not a functional pass.

Reproduction details and raw command output are in [docs/testing/README.md](docs/testing/README.md).

### Manual Functional Testing

| ID / Feature | Test performed | Expected result | Actual result | Status |
| --- | --- | --- | --- | --- |
| M01 Navigation/theme | Open mobile drawer; use theme switch; reload; switch back; press Escape; follow desktop Menu. | Drawer responds, preference survives reload and menu opens. | Expanded state changed; dark preference survived; Escape restored closed state; menu rendered. | PASS — browser |
| M02 Menu information | Open seeded menu at desktop/mobile widths. | Categorised names, descriptions, GBP prices and prep times. | Americano showed £3.10/2 minutes; waffle £5.30/5 minutes; category/card content rendered. | PASS — browser |
| M03 Add item | Add one Americano from menu. | Badge increments without leaving menu. | Button entered Adding state and cart badges became 1. | PASS — browser |
| M04 Customisation | Expand Waffle Plain; select Nutella +£1.10; add; open cart. | Add-on persists and unit total is £6.40. | Cart showed Nutella, £6.40 waffle and £9.50 including Americano. | PASS — browser |
| M05 Quantity | Change waffle quantity to 2 and submit Update. | Waffle line £12.80; combined total £15.90. | Updated total appeared; later checkout retained quantity 2. | PASS — browser |
| M06 Removal | Remove Americano. | Only two customised waffles remain. | Checkout showed £12.80 total and 10-minute prep estimate. | PASS — browser |
| M07 Empty cart | Visit cart after ordering, then request checkout. | Empty state; checkout redirects to menu. | “Your cart is empty”; checkout redirected with “Add an item before checking out.” | PASS — browser |
| M08 Checkout validation | Submit blank name; enter malformed email. | Invalid input blocks order submission. | Name `valueMissing` and email `typeMismatch` were true; stayed at checkout. Server rejection also verified in S. | PASS — browser + Django |
| M09 Counter order | Enter Assessment Guest and assessment@example.com; Pay at counter. | Confirmation contains items, total and payment due. | Order #1, two waffles with Nutella, £12.80 due, 10-minute prep; cart cleared. | PASS — browser |
| M10 Confirmation status | After staff update, reopen the order's UUID URL. | Updated collection status is visible. | “Ready for collection” replaced “Placed”. | PASS — browser |
| M11 Stripe configuration | Inspect checkout without key; separately POST Stripe in S. | Disabled card button; direct request rejected. | Disabled state/explanation observed; server created no order for unconfigured Stripe. External provider flow not exercised. | PASS — browser + Django, configured provider NOT TESTED |
| M12 Invalid login | Submit customer with incorrect password. | Login error; no authenticated session. | Django displayed the correct-username-and-password error. | PASS — browser |
| M13 Valid login | Sign in with seeded customer/staff/manager credentials. | Customer welcome and role-specific landing pages. | Customer home, Service dashboard and Menu and operations appeared respectively. | PASS — browser |
| M14 Signup | Submit empty form; inspect form at three widths. | Required username blocks submission. | Browser reported missing username. Valid creation and password/email/duplicate validation ran in Django tests. | PASS — browser for empty input; Django for creation/other validation |
| M15 Loyalty display | Open customer loyalty page before/after staff award. | QR/code, eight stamp positions and current count. | Initially 0/8; subsequently 3/8, with matching filled stamps. | PASS — browser |
| M16 Feedback | Submit empty name, then rating 6, then valid name/message/rating 5 while signed in. | Missing/out-of-range input rejected; valid feedback acknowledged. | Browser validity flags rejected invalid input; acknowledgement appeared; account email was displayed without an editable email field. | PASS — browser |
| M17 Boiler Buster | Start and tap; allow an unattended round to end; restart. | Timer/gauges respond and reset. | ROUND LIVE, Taps: 2, then BOILER TRIPPED; restart reset timer to 20s. Winning round, score persistence and keyboard play not exercised. | PASS — browser for listed controls |
| M18 Staff operations | Inspect incoming order; set Ready; submit invalid UUID then valid customer code with 3 stamps. | Order persists; invalid scan shows error; valid scan updates card. | Correct order/add-ons/payment shown; status confirmation, invalid-code error and stamp success message appeared; customer showed 3/8. | PASS — browser; camera NOT TESTED |
| M19 Manager menu | Create Assessment Cocoa £2.75; edit to £2.95; Hide; check menu; Show. | Changes save; hidden item cannot be ordered; Show restores availability. | Save messages and £2.95 row verified; menu showed disabled Unavailable; Show returned Available. Delete is covered by A, not this browser run. | PASS — browser |
| M20 Logout | Sign out through desktop and mobile portal navigation. | Guest state returns. | Sign in link returned and account welcome disappeared. | PASS — browser |

### Responsive Testing

Viewports: **375 × 812**, **768 × 900** and **1440 × 900 CSS pixels**. All rows below were actually loaded at all three sizes. [Raw measurements](docs/testing/responsive-observations.json) record `innerWidth` and document `scrollWidth`; a vertical scrollbar can reduce the latter by 15px. **L = PASS for no document-level horizontal overflow only.** It is deliberately narrower than a full responsive usability pass.

| Page/state | Mobile 375px | Tablet 768px | Desktop 1440px | Notes |
| --- | --- | --- | --- | --- |
| Home, guest | L | L | L | Mobile and desktop screenshots visually inspected; primary actions visible. |
| Menu, seeded | L | L | L | Mobile screenshot visually inspected; all categories rendered; exact column changes come from CSS inspection. |
| Cart, populated | L | L | L | Desktop capture inspected; mobile/tablet width checks only. |
| Checkout, populated | L | L | L | Desktop form/summary inspected; required-field browser test completed. |
| Login | L | L | L | Desktop capture; valid/invalid authentication tested separately. |
| Signup | L | L | L | Form loads at each width; native required-input check completed. |
| Loyalty, customer | L | L | L | Mobile card visually inspected after stamp award; code wraps and progress is visible. |
| Feedback, customer | L | L | L | Form loads at each width; valid/invalid submission checked on desktop. |
| Staff dashboard, active order | L | L | L | Desktop overview and mobile order station visually inspected. |
| Manager dashboard | L | L | L | Mobile stacked controls visually inspected; desktop capture supplied. |
| Manager new-item form | L | L | L | Width checks and native category-required validation completed. |

These checks used resized browser viewports, not physical phones/tablets. Portrait/landscape devices, zoom, long user-generated content, dark-mode layouts across every page and exhaustive keyboard traversal remain to be tested. Some text over the gold background appears faint in captures; no measured contrast pass is claimed.

### Browser Testing

| Browser | Testing actually performed | Result / scope |
| --- | --- | --- |
| Codex in-app browser, version not reported | M01–M20 within the boundaries above; viewport checks; inspected captured console warnings/errors at the end of the main workflow. | Listed workflows passed; log query returned no warning/error entries. This is not a complete network or accessibility audit. |
| Chrome | Not run as a separate browser. | NOT TESTED |
| Safari | Installed locally, but not exercised in this test pass. | NOT TESTED |
| Firefox | Not exercised in this test pass. | NOT TESTED |

The QR fallback test in `cafe/tests.py` checks script text; it is **not** proof of cross-browser camera scanning.

### Form Validation Testing

The nine [supplementary checks](docs/testing/request_checks.py) exercise forms and server responses with isolated test data. `S` means these checks, which bypass browser-native validation intentionally. All listed S checks passed; exact assertions and output are linked rather than claiming blanket form coverage.

| Form | Valid input | Missing required input | Invalid input | Expected feedback and actual result |
| --- | --- | --- | --- | --- |
| Signup | Unique username, email and matching acceptable passwords valid in S; creation/profile/login verified in A. | Empty form invalid in S; empty username blocked in browser. | Bad email, mismatched/weak passwords and existing username rejected in S. | Django password mismatch text rendered; no user created by invalid POST. PASS for these cases. |
| Login | Seeded customer/staff/manager credentials accepted in browser. | Not separately submitted empty in browser. | Wrong password rejected in browser. | Correct-username-and-password error displayed. PASS for valid/incorrect-password cases; missing-input case NOT TESTED. |
| Checkout | Name-only form valid in S; browser guest checkout succeeded. Email/phone/notes optional. | No name rejected in S and browser. | Bad email rejected in S and browser. | Bound form errors returned; invalid POSTs created zero orders. PASS. |
| Feedback | Guest form valid in S; browser signed-in rating 5 succeeded; A verifies stored guest/account email. | Empty form invalid in S; name missing blocked in browser. | Email malformed, rating 0/6 and blank message rejected in S; rating 6 also blocked in browser. | Form errors returned and invalid POSTs created no Feedback rows. PASS. |
| Manager item | Category/name/description/£2.95/prep 5 accepted; browser create/edit succeeded. | Empty form invalid in S; browser required category blocked save. | Non-numeric price, negative prep, blank name and duplicate category/name rejected in S. | Bound form errors; no extra item saved. PASS for listed inputs. |
| Loyalty stamp | Valid card and 3 stamps succeeded in browser; 8 stamps converted to one reward in S. | Empty form invalid in S. | Malformed UUID, zero or nine stamps rejected in S; malformed UUID also submitted in browser. | Shared invalid-card/count error; invalid cases created no scan record. PASS. Unknown but well-formed UUID not included. |
| Staff order status | Ready succeeded in browser; Collected excluded the order from the queue in S. | No separate missing-status case. | Unknown status rejected in S. | “That order status is not valid”; original status unchanged. PASS for listed cases. |

### User Story Testing

| User story | Acceptance criteria checked | Test/evidence | Result |
| --- | --- | --- | --- |
| US01 | Item/category information renders | M02; A menu; 03–04 | PASS |
| US02 | Add-ons selected, priced and retained | M04; A add-ons; 05–06 | PASS |
| US03 | Add action updates session/badge | M03; A AJAX payload | PASS |
| US04 | Update/remove/empty state | M05–07; S quantity zero | PASS |
| US05 | Valid order persists; invalid input rejected | M08–09; A checkout; S checkout | PASS |
| US06 | Counter due confirmation and cleared cart | M07, M09; A checkout | PASS |
| US07 | Disabled when unconfigured; pending/paid provider responses | M11; S disabled POST; A mocks | PARTIAL: real Stripe checkout/return not tested |
| US08 | Account/profile creation and validation | A signup; S signup; M14 | PASS — creation through Django test client, not browser |
| US09 | Valid/invalid login and logout | M12–13, M20 | PASS |
| US10 | Stamp/reward progress | M15/M18; A QR/card; S eight-stamp conversion | PASS — reward boundary through Django |
| US11 | Staff award and rejection | M18; A scan audit; S invalid scans | PASS — manual code entry; camera NOT TESTED |
| US12 | Feedback validation/storage and acknowledgement | M16; A email storage; S invalid input | PASS |
| US13 | Start/tap/restart | M17; A page/redirect | PASS for stated controls; full gameplay NOT TESTED |
| US14 | Incoming active queue and prioritisation | M18; A oldest-first/closed exclusion | PASS |
| US15 | Status changes shared with customer | M10/M18; S status | PASS |
| US16 | CRUD access and availability | M19; A deletion/access; S form | PASS — deletion through Django test client |
| US17 | Owned, limited recent history and tracking links | A order history and signed-in checkout | PASS — Django; manual browser history check outstanding |

## Automated Testing

The original [cafe/tests.py](cafe/tests.py) remains intact. Its **35 tests passed** with `OK` and Django reported **no system-check issues (0 silenced)**. See [system check output](docs/testing/django-check.txt) and [test output](docs/testing/django-tests.txt).

| Existing coverage | What the assertions establish |
| --- | --- |
| Menu/cart/add-ons | Menu content renders, AJAX add returns expected JSON, selected add-on names/prices appear and totals are correct. |
| Signup/authentication-related presentation | Account/profile creation, welcome username, guest navigation and role-specific portal links/redirects. The suite does not itself test bad login credentials. |
| Home/loyalty | Guest/untracked/tracked progress, eight stamp slots, QR markup, staff stamp updates and scan audit records. |
| Feedback | Guest email saves; signed-in form hides the email input and uses account email even if a different value is posted. |
| Checkout/payments | Counter order totals, prep time and add-on snapshots; mocked Stripe pending checkout/redirect and mocked paid confirmation. No card is charged. |
| History/status | Login requirement, ownership filtering, eight-order limit, signed-in checkout association, collected customer wording. |
| Permissions and staff/manager work | Customer denied staff access, Staff group denied manager access, manager dashboard/deletion, portal navigation and oldest-first staff queue statistics. |
| Static/game/health | Brand/static icon references, scanner fallback source strings, game page and legacy redirect, health JSON. These are not visual browser tests. |

The additional **nine assessment checks passed** with `OK`; see [their source](docs/testing/request_checks.py) and [raw output](docs/testing/request-checks.txt). They add targeted invalid-input/no-write checks, zero-quantity removal, incorrect order lookup, eight-stamp reward conversion, invalid/collected statuses, disabled Stripe POST and compilation of all 15 project templates. They run explicitly, separately from the original suite.

Re-run from an activated environment:

```bash
python3 manage.py check
python3 manage.py test
python3 manage.py test docs.testing.request_checks --verbosity 2
python3 manage.py collectstatic --noinput
```

`collectstatic` was run with a temporary `STATIC_ROOT`: **138 files copied, 404 post-processed**, exit 0. [Raw output](docs/testing/collectstatic.txt). The existing GitHub Django Quality workflow runs system checks, tests and static collection on relevant changes; it does not run a browser suite. No remote CI run is claimed here.

## Validation / Code Quality

| Check | Actual evidence |
| --- | --- |
| Django system check | PASS: zero issues. |
| Existing automated suite | PASS: 35 tests, OK. |
| Supplementary form/request/template checks | PASS: 9 tests, OK; all 15 templates compile. |
| HTML/template structure | Inspected semantic shell, form markup, CSRF tokens and browser-rendered pages. Template compilation is not HTML5 validation. No W3C/Nu HTML validator was run. |
| CSS | Inspected actual variables, responsive selectors and reduced-motion rules; rendered at three widths. No CSS validator or linter was run. |
| JavaScript | Exercised drawer/theme/cart/game controls in the browser; captured console query returned no warnings/errors. No ESLint or standalone JS syntax checker was run. Camera and gameplay branches are not exhaustively covered. |
| Static assets | PASS: WhiteNoise static collection/manifest processing completed with temporary output directory. |
| Whitespace and links | Final local `git diff --check` and repository Markdown target checks; see evidence notes. |

## Bugs and Fixes

| Finding | Evidence / cause | Resolution and verification |
| --- | --- | --- |
| Home-page loyalty offer contradicted the actual eight-stamp scheme | `home.html` said “Buy 5 get 1 free”; `CustomerProfile.LOYALTY_STAMPS_REQUIRED` is 8 and the loyalty page renders eight positions. | Changed only that pill to “Collect 8 stamps for a reward”. Corrected text observed in the local browser at mobile/desktop sizes. Original suite passed; supplementary eight-stamp conversion check passed. No loyalty logic or data changed. |

No critical unresolved bug was identified in the documented local test pass. This is limited to the exercised scenarios; it does not imply that untested payment, camera or accessibility paths are defect-free. No historical fixes have been invented.

### Known Limitations

- Staff queues and customer status pages require a refresh to see new data; no polling/WebSocket push is implemented.
- A confirmation URL acts as a private bearer link: anyone with the complete order ID/UUID URL can view it. Keep it private; do not treat it as account-only access.
- The manager's **recorded revenue** metric sums all order subtotals, including unpaid/cancelled orders. It is not verified payment income.
- Loyalty reward counts are stored, but no customer-facing reward redemption workflow is implemented. Staff explicitly award stamps; ordering an eligible item does not award one automatically.
- Stripe is enabled by a non-empty environment value; the code does not enforce a test-key prefix. Use a test-mode key for assessment. Payment confirmation is checked on return from Checkout; there is no webhook route. A paid session not returning to the application can remain pending locally. External success/cancellation/failure journeys need separate evidence.
- Accessibility remains incomplete: the cart quantity and staff status controls lack explicit labels, the mobile dialog has no scripted focus trap/return, and the home lead uses a `div` rather than an `h1`. Colour contrast and screen-reader behaviour have not been audited. These are recorded assessment gaps; this documentation update does not redesign those controls.
- Signup succeeds through the Django test client, but a complete browser signup journey is not recorded. Browser history, physical QR camera scanning, multiple browser products and full gameplay also need further checks.
- `dist/craving-house-django-submission.zip` is an existing archive and has not been regenerated. It does not automatically include these new docs/screenshots; prepare a fresh submission archive after reviewing the changes.

## Database / Backend

### Data model

The schema is defined in [cafe/models.py](cafe/models.py) and versioned in `cafe/migrations/`. No schema changes were made for this documentation work.

| Model | Stored data and relationships |
| --- | --- |
| `MenuCategory` | Unique name/slug and display order; one category has many menu items. Category deletion is protected while referenced. |
| `MenuItem` | Category, name, description, decimal price, prep minutes, loyalty eligibility, availability and featured flag. Name is unique within a category. |
| `MenuItemAddOn` | Parent item, name, price, availability and display order; unique name per item. Add-ons are deleted with their menu item. |
| `CustomerProfile` | One-to-one Django User, UUID card code, phone, current stamps and rewards available. Eight stamps convert to one reward. |
| `Order` | Optional customer FK, guest contact/pickup details, UUID lookup code, order/payment statuses, Stripe session ID, subtotal and prep estimate. Deleting a user leaves the order with a null customer. |
| `OrderItem` | Belongs to an order; stores item name, add-on names/total, quantity, unit price and prep snapshot. Menu-item deletion nulls the FK and preserves historic order information. |
| `Feedback` | Name, optional email, validated 1–5 rating, message and timestamp. |
| `LoyaltyScan` | Links the profile and awarding staff user, count and time. Staff-user deletion is protected while audit records refer to that user. |

The session cart is a mapping of item/add-on keys to quantities rather than a separate Cart model. Current availability and prices are resolved by `cart_summary`; checkout snapshots them into persistent order lines. Monetary fields use decimal arithmetic. SQLite is the development default; settings select PostgreSQL with SSL when `DATABASE_URL` is present.

### Authentication, permissions and security

Django supplies password hashing/validators, sessions, authentication views and admin. `cafe/roles.py` recognises active users in **Staff** or **Manager** groups and Django staff/superuser flags. Staff access includes Managers; manager access requires the Manager group or superuser status. Membership in the Manager group alone does not grant arbitrary Django admin permissions.

Mutation controls use POST forms with CSRF tokens; dedicated cart/status/stamp/toggle/delete endpoints require POST. Django forms validate checkout, signup, feedback and product fields. Normal template values are escaped; the loyalty SVG is generated locally before being rendered as safe markup. Lookup UUIDs protect order URLs from simple sequential-ID guessing. Existing permission tests cover selected access paths, not every possible security condition.

Production settings support allowed hosts, trusted CSRF origins, secure cookies, HTTPS redirection, proxy HTTPS handling and HSTS. WhiteNoise serves collected static assets and Gunicorn runs WSGI. Credentials belong in environment variables, not tracked files. The settings read `os.environ`; the application does **not** automatically load a `.env` file.

## Setup

Create and activate a virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install dependencies:

```bash
python3 -m pip install -r requirements.txt
```

Create the local database:

```bash
python3 manage.py migrate
```

For a fresh development database, load demo menu data and test accounts. This command updates seeded menu values; use a disposable database for assessment tests:

```bash
python3 manage.py seed_demo
```

Start the development server:

```bash
python3 manage.py runserver
```

Open the application at:

```text
http://127.0.0.1:8000/
```

## Assessor Test Access

The seed command creates these demonstration accounts for assessment:

- Manager: `manager` / `ManagerPass123`
- Staff: `staff` / `StaffPass123`
- Customer: `customer` / `CustomerPass123`

The demo customer loyalty card code is:

```text
11111111-1111-4111-8111-111111111111
```

Public users can also create their own account from `/signup/` or the **Create an account** link on the sign-in page. After login, the navigation displays `Welcome, <username>` so assessors can confirm which account is active.

These credentials are for assessment only. Create new accounts and passwords before using the application in any real environment.

## Payment Testing

Stripe Checkout is supported when `STRIPE_SECRET_KEY` is configured with a Stripe test-mode secret key. The application redirects to Stripe Checkout and does not store card numbers.

Use these Stripe test card details in test mode:

```text
Card number: 4242 4242 4242 4242
Expiry: any future date, for example 12/34
CVC: any 3 digits, for example 123
Postcode: any valid postcode, for example SW1A 1AA
```

If `STRIPE_SECRET_KEY` is not set, the Stripe button is disabled and the assessor can still test the checkout workflow with **Pay at counter**.

## Loyalty Scan Testing

To test staff loyalty scanning:

1. Sign in as staff with `staff` / `StaffPass123`.
2. Open `/staff/`.
3. Enter the demo customer card code `11111111-1111-4111-8111-111111111111`.
4. Enter a stamp count, for example `3`.
5. Submit **Add stamps**.
6. Sign in as customer with `customer` / `CustomerPass123` and open `/loyalty/` to confirm the stamps were added.

## Functional Acceptance Checklist

Use this checklist before submitting or demonstrating the project. It is a repeatable demonstration plan; completed results and remaining gaps are recorded in Front-End Testing above:

- Open `/` and confirm the homepage loads.
- Open `/menu/` and confirm seeded menu items appear.
- Add an item to the cart, including a customised item add-on.
- Place a pickup order from checkout with Stripe test payment or counter payment.
- Confirm the order appears in `/staff/`.
- Update the order status from the staff dashboard.
- Create or sign into a customer account and open `/loyalty/`.
- Open `/boiler-buster/` and confirm the Boiler Buster game responds to clicks and gauge movement.
- Add loyalty stamps from the staff dashboard.
- Submit feedback from `/feedback/`.
- Sign into `/admin/` or `/manager/` and confirm menu data is manageable.

## Deployment Notes

- Set `DJANGO_SECRET_KEY` to a unique production value.
- Set `DJANGO_DEBUG=false`.
- Set `DJANGO_ALLOWED_HOSTS` to the deployed domain names.
- Set `STRIPE_SECRET_KEY` to a Stripe test-mode key for assessor card-payment testing.
- Keep `DJANGO_SECURE_SSL_REDIRECT=true` for HTTPS deployments.
- Run `python3 manage.py migrate` before first production use.
- Create a production admin account with `python3 manage.py createsuperuser`.
- Replace or delete demo accounts before real use.
- Do not commit real `.env` files or production secrets.

## Render Deployment

This project includes a root `Dockerfile` for Render Docker deployments.

Recommended Render settings:

- Environment: Docker
- Repository: `McauleeMaddison/Craving-House`
- Branch: `main`
- Dockerfile path: `Dockerfile`
- Root directory: leave blank unless the repository is inside a subfolder

If you use a Render Python service instead of Docker, use these commands:

```text
Build Command: sh ./render-build.sh
Start Command: sh ./render-start.sh
```

Do not use any `npm`, `apps/web`, Prisma, Next.js, or Node build command for this project. This is a Django application.

Recommended environment variables:

```text
DJANGO_SECRET_KEY=<generate-a-long-random-secret>
DJANGO_DEBUG=false
DJANGO_ALLOWED_HOSTS=.onrender.com,<your-render-domain>
DJANGO_CSRF_TRUSTED_ORIGINS=https://*.onrender.com,https://<your-render-domain>
DJANGO_SECURE_SSL_REDIRECT=true
DJANGO_SECURE_HSTS_SECONDS=31536000
DJANGO_SECURE_HSTS_INCLUDE_SUBDOMAINS=false
STRIPE_SECRET_KEY=<your Stripe test secret key from the Stripe dashboard>
SEED_DEMO_DATA=true
```

If you attach a Render PostgreSQL database, Render provides `DATABASE_URL` automatically. The application will use it. If no `DATABASE_URL` is present, the container falls back to SQLite, which is suitable only for a temporary demo because container storage is not permanent.

The Docker startup script applies migrations, seeds only when `SEED_DEMO_DATA=true` (the script defaults to true), and starts Gunicorn on `0.0.0.0:${PORT:-8000}`. Set `SEED_DEMO_DATA=false` after setting up a persistent deployment if you want to preserve manager edits to seeded menu items: re-seeding updates demo prices/availability and removes legacy demo data. Its operations are:

```bash
python manage.py migrate --noinput
python manage.py seed_demo
gunicorn craving_house.wsgi:application
```
