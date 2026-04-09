# Phone QA Script

Last updated: 2026-04-09

Use this for a fast non-Stripe handover pass on a real phone or an iPhone-sized browser viewport.

Scope:

- customer-facing mobile UX
- non-payment browsing, cart, sign-in, loyalty, and order-history checks
- basic role-entry checks for staff and manager

Do not use this script for final payment sign-off. Stripe is a separate step.

## Before You Start

- Open `https://craving-house.onrender.com`
- Use a real phone if possible
- If using desktop devtools, use an iPhone-sized viewport
- Use a private/incognito window if you want a clean guest session

Use the prepared handover customer, staff, and manager test accounts.
Do not store test passwords in this repo. Keep them separate.

## Pass Rules

Mark a step as pass only if:

- the page loads cleanly
- the action works on the first or second attempt
- text is readable
- buttons are easy to tap
- nothing overlaps, clips, or feels broken

If anything fails, take a screenshot and note:

- page
- action attempted
- expected result
- actual result

## 10-15 Minute Script

### 1. Home

Open `/`.

Check:

- header looks clean
- mobile drawer button is visible
- page title, hero, and quick actions fit on screen
- no clipped text or awkward spacing

Pass if:

- the page looks intentional and readable without horizontal scrolling

### 2. Mobile Drawer

Open the drawer, then close it.

Check:

- drawer opens smoothly
- drawer contains `Menu`, `Cart`, `Loyalty`, `Orders`, and `Feedback`
- cart remains easy to find
- close button works
- tapping outside the drawer closes it

Pass if:

- navigation is easy to use one-handed and `Menu` is present

### 3. Guest Menu Browse

Open `/menu`.

Check:

- products render
- prices are formatted as pounds
- prep time text is readable
- unavailable products, if any, are clearly shown and cannot be added
- obvious add-on items like `Add Chips`, `Mozzarella`, or waffle toppings are not listed as standalone menu products

Pass if:

- menu feels clean and customer-facing, with no internal/admin wording

### 4. Guest Add To Cart

Pick one normal item and, if available, one customizable drink.

Check:

- customization panel opens cleanly
- selected customization stays attached to the parent item
- add to cart updates the badge/count
- cart opens from mobile navigation

Pass if:

- cart count changes correctly and the customized item is shown correctly in the cart

### 5. Cart

Open `/cart`.

Check:

- quantity increase works
- quantity decrease works
- remove works
- totals update correctly
- empty-state copy is clear if you remove everything

Pass if:

- cart math looks correct and the screen stays tidy while editing quantities

### 6. Checkout Without Stripe

Open `/checkout`.

As guest:

- leave `Name for pickup` empty and try to continue
- then add a pickup name but leave guest email empty and try again

Check:

- pickup name is required
- guest email is required
- payment-disabled message is understandable

Pass if:

- validation is clear and the page does not feel broken even though payments are disabled

### 7. Customer Sign-In

Sign in with the handover customer account.

Check:

- sign-in succeeds
- return to home feels clean
- account state changes correctly

Pass if:

- signed-in state is obvious and stable

### 8. Signed-In Customer Pages

While signed in as customer, open:

- `/`
- `/orders`
- `/loyalty`

Check:

- home shows signed-in dashboard state
- orders page loads, even if there are no orders
- loyalty page shows stamp summary and QR/token area

Pass if:

- the signed-in customer journey feels complete without dead ends

### 9. Sign-Out

Sign out from the mobile drawer.

Check:

- session ends cleanly
- customer-only state disappears
- you do not remain stuck in a signed-in UI state

Pass if:

- signed-out state is immediate and obvious

### 10. Staff And Manager Entry Check

This can be done quickly on phone or desktop.

Sign in as staff:

- open `/staff`
- open `/staff/orders`
- open `/staff/loyalty-scan`
- confirm `/manager` does not grant manager access

Sign in as manager:

- open `/manager`
- open `/manager/orders`
- open `/manager/products`
- open `/manager/users`
- open `/manager/settings`
- open `/manager/audit`

Pass if:

- staff can reach staff tools but not manager-only tools
- manager can reach both manager and staff tools

## Final Decision

If all steps above pass, you can mark these as effectively ready apart from Stripe:

- mobile UX basic pass
- customer browsing/cart/sign-in/loyalty flow
- staff access basics
- manager access basics

Remaining separate release checks:

- Stripe test-mode setup and payment walkthrough
- Render deploy-log review
- Render migration success confirmation
