# Data model (example)

This is a starting point; we’ll adjust after you answer `manuals/01-requirements.md`.

## Entities

- User
  - id, email/phone, role, createdAt
- Product (menu item)
  - id, name, description, price, available, prepSeconds, loyaltyEligible
- LoyaltyProgramSettings
  - rewardStamps (e.g. 5 stamps => reward)
- Order
  - id, userId, status, pickupTime, estimatedReadyAt, total, createdAt
- OrderItem
  - id, orderId, productId, qty, unitPrice
- LoyaltyAccount
  - id, userId, stamps, rewardsRedeemed
- LoyaltyStamp
  - id, loyaltyAccountId, orderId (optional), eligibleItemCount, createdAt, source (scan/manual), createdByStaffId
