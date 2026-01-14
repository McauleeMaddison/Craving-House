# Reviews, Feedback, and Manager Controls (design)

You want managers to manage users, reviews, and feedback. Here’s the simplest secure design.

## 1) What “reviews” are (separate concepts)

Keep these separate in your app:

1) **Product reviews** (e.g. “Latte was great”)
2) **Order feedback** (e.g. “Pickup time too long”)
3) **General shop feedback** (e.g. “Please add oat milk”)

For MVP, start with *Order feedback* + *General shop feedback*. Product reviews can come later.

## 2) Data you should store (minimum)

### Review/Feedback fields
- `id`
- `userId` (who wrote it)
- `orderId` (optional)
- `rating` (optional 1–5)
- `message` (text)
- `status` (`published`, `hidden`, `flagged`)
- `createdAt`
- `moderatedByUserId` (manager)
- `moderatedAt`
- `moderationNote` (why it was hidden/flagged)

### Why this matters
- You need an audit trail so moderation is fair and accountable.

## 3) Manager actions (the moderation toolbox)

Managers should be able to:
- View all reviews/feedback (with filters by status/date/rating)
- Hide/unhide a review (never delete by default)
- Flag suspicious reviews for follow-up
- Reply (optional; can be “public reply” or “internal note”)

## 4) Anti-abuse basics (simple but effective)

- Rate limit submissions (e.g. max N per hour)
- Only allow order feedback if the user actually placed that order
- Content rules (block obvious spam/links if needed)
- “Report” button for customers (optional)

## 5) User management (what managers need)

Managers commonly need:
- View user list (search by email)
- View user profile (orders count, stamps, last activity)
- Adjust loyalty only with reason + audit record
- Disable an account (rare; keep audit)

## 6) What we’ll implement next (practical)

1) Add `Feedback` model in Prisma (DB)
2) Add customer page: “Leave feedback”
3) Add manager dashboard page: list/moderate
4) Add server routes enforcing `manager` role + audit
