# 🧪 Test Coverage Strategy for Craving House

## Current State Analysis

### ✅ What You Have

- `auth-messages.test.ts` - Basic message formatting tests
- `boiler-buster-access.test.ts` - Permission checking
- `drink-customizations.test.ts` - Utility tests
- `password.test.ts`, `credentials.test.ts`, `password-reset.test.ts`,
  `secret-box.test.ts` - Auth utilities

### ❌ What's Missing

- **Route Integration Tests** - Testing actual API endpoints with HTTP
- **Database Integration** - Full user flow from registration to checkout
- **Role-Based Access Control Tests** - Verifying staff/manager endpoints
- **Error Scenario Tests** - Rate limits, malformed input, race conditions

---

## 📚 Testing Pyramid (Recommended Structure)

```text
        🔺 E2E Tests (Playwright)
       /                    \
      /   Few, slow,        \
     /    real browser       \
    /________________________\

         🔷 Integration Tests
        /                    \
       /   API Routes +      \
      /    Database tests    \
     /________________________\

    🔸 Unit Tests (Fast, many)
   /                            \
  /  Pure functions, validation  \
 /______________________________\
```

### Unit Tests (Already have some)

- ✅ `password.ts` - Validation logic
- ✅ `auth-messages.ts` - Message formatting
- Need to add: Rate limit calculation, token generation

### Integration Tests (MISSING - HIGH PRIORITY)

- ❌ POST `/api/auth/register` with valid/invalid data
- ❌ POST `/api/auth/password-reset/request` and `/confirm`
- ❌ GET `/api/orders` with different user roles
- ❌ POST `/api/manager/products` (staff should be denied)

### E2E Tests (Partial)

- ✅ `checkout-flows.spec.ts` - Customer checkout
- ✅ `auth-access.spec.ts` - Sign in/out
- Need to add: Full manager portal workflow, loyalty redemption, TOTP setup

---

## 🛡️ Critical Auth Scenarios to Test

### 1. Registration Security

```typescript
Scenario: User Registration
├─ Happy Path
│  ├─ Valid email + strong password → User created
│  └─ Loyalty account auto-created
├─ Validation
│  ├─ Short email → 400 error
│  ├─ No @ in email → 400 error
│  ├─ Weak password → 400 error
│  └─ Email > 254 chars → 400 error
├─ Duplication
│  ├─ Duplicate email → 409 Conflict
│  └─ Case-insensitive check (TEST@test.com)
└─ Rate Limiting
   ├─ 10 registrations per minute per IP → OK
   └─ 11th attempt → 429 Too Many Requests
```

### 2. Password Reset Security

```typescript
Scenario: Password Reset
├─ Request Flow
│  ├─ Valid email → Returns generic "check email" message
│  ├─ Invalid email → Returns generic "check email" message
│  │  (enumeration prevention)
│  ├─ 5 resets per minute → OK
│  └─ 6th reset → 429 Too Many Requests
├─ Token Management
│  ├─ Token generated with crypto.randomBytes()
│  ├─ Token stored as hash (not plaintext)
│  ├─ Token expires after 15 minutes
│  └─ Token is one-time use (verified and deleted)
├─ Confirmation
│  ├─ New password must be strong (>= 9 chars)
│  ├─ Success → All old sessions invalidated
│  └─ Used token → 400 error on retry
└─ Security
   └─ Non-existent email → No error revealed (privacy)
```

### 3. Session & MFA

```typescript
Scenario: Sign In with MFA
├─ Without MFA
│  ├─ Valid credentials → Session created
│  └─ Session token valid for subsequent requests
├─ With TOTP Enabled
│  ├─ Valid credentials + invalid TOTP → 401 error
│  ├─ Valid credentials + valid TOTP → Session created
│  ├─ TOTP token can only be used once
│  └─ Rate limited (3 attempts, 15 min window)
└─ Session Lifecycle
   ├─ Session expires after 30 days
   ├─ Logout → Session invalidated
   └─ Password reset → All sessions invalidated
```

---

## 📁 Test Structure Recommendation

```text
apps/web/
├── src/
│   ├── __tests__/
│   │   ├── integration/
│   │   │   ├── auth/
│   │   │   │   ├── register.integration.test.ts
│   │   │   │   ├── signin.integration.test.ts
│   │   │   │   ├── password-reset.integration.test.ts
│   │   │   │   └── mfa.integration.test.ts
│   │   │   ├── manager-portal/
│   │   │   │   ├── orders.integration.test.ts
│   │   │   │   ├── rbac.integration.test.ts
│   │   │   │   └── authorization.integration.test.ts
│   │   │   └── checkout/
│   │   │       ├── cart-to-order.integration.test.ts
│   │   │       └── payment-processing.integration.test.ts
│   │   └── fixtures/
│   │       ├── test-database.ts (setup/teardown)
│   │       ├── auth-helpers.ts (login, register)
│   │       └── seed-data.ts (test users with different roles)
│   └── app/
│       └── api/
│           ├── (auth)/
│           │   └── auth/
│           │       ├── register/
│           │       │   ├── route.ts
│           │       │   └── register.test.ts ✅ (created)
│           │       └── password-reset/
│           │           ├── request/route.ts
│           │           ├── confirm/route.ts
│           │           └── password-reset.test.ts ✅ (created)
```

---

## 🔧 Implementation Approach

### Phase 1: Unit Tests (Foundation) ✅

- Already have password validation tests
- Add: rate limit calculations, token generation

### Phase 2: Integration Tests (High Priority)

- Setup test database (use SQLite for speed)
- Create test fixtures (helper functions)
- Test each route with valid/invalid input
- Verify database state after requests

### Phase 3: RBAC & Authorization (Medium Priority)

- Create test users with each role
- Test that endpoints reject unauthorized access
- Verify permission checks on sensitive operations

### Phase 4: E2E Critical Flows

- Customer: register → browse menu → add to cart → checkout
- Manager: login → view orders → process order → mark complete
- Staff: login → view loyalty queue → scan QR code → stamp account

---

## 🎯 Priority: Must Test These First

1. **Auth Registration** - Foundation of whole app
2. **Password Reset** - Common vulnerability vector
3. **Role-Based Access** - Prevents privilege escalation
4. **Stripe Integration** - Financial security
5. **Rate Limiting** - DoS prevention

---

## 📊 Coverage Goals

| Area               | Current | Target | Priority |
| ------------------ | ------- | ------ | -------- |
| Auth Flows         | 20%     | 80%    | CRITICAL |
| API Routes         | 5%      | 70%    | HIGH     |
| Manager Portal     | 0%      | 60%    | HIGH     |
| Checkout Flow      | 40%     | 90%    | MEDIUM   |
| Database Integrity | 10%     | 60%    | MEDIUM   |

---

## 🚀 Next Steps

1. ✅ Created placeholder test files to guide implementation
2. ⏭️ Run existing tests to ensure baseline works
3. ⏭️ Add test HTTP client (SuperTest or similar)
4. ⏭️ Setup test database schema
5. ⏭️ Implement integration tests (start with register)
6. ⏭️ Add RBAC tests for manager endpoints
7. ⏭️ Add E2E tests in Playwright

---

## 💡 Key Principles

- **Test the behavior, not implementation** - Focus on what users do,
  not how it works
- **Test security boundaries** - Role transitions,
  permission checks, rate limits
- **Test edge cases** - Expired tokens, malformed input, race conditions
- **Fast feedback** - Unit tests should run in <100ms, integration in <5s
- **Isolated tests** - Each test runs independently, no order dependencies
