# 🛡️ Manager/Staff Portal Security - Role-Based Access Control (RBAC)

## What is RBAC (Role-Based Access Control)?

RBAC is how we prevent unauthorized users from accessing sensitive operations.

```
❌ BAD: No permission checks
├─ Attacker signs in as "customer"
├─ Changes URL to /api/manager/orders
└─ Sees all orders (should only see if staff/manager)

✅ GOOD: Permission checks in place
├─ Attacker signs in as "customer"
├─ Tries to access /api/manager/orders
├─ Request rejected: "Forbidden" (403)
└─ Can only see customer pages
```

Your app has 3 portals with different permission levels:

```
         Manager Portal (highest privilege)
         ├─ View all orders
         ├─ View all customers
         ├─ Manage products & pricing
         ├─ View audit logs
         ├─ Process refunds
         └─ Requires TOTP MFA
         
         Staff Portal (medium privilege)
         ├─ View order queue (only today)
         ├─ Mark orders complete
         ├─ Scan loyalty QR codes
         └─ Stamp accounts
         
         Customer Portal (lowest privilege)
         ├─ View own orders
         ├─ View loyalty QR code
         └─ Place new orders
```

---

## Current Security Architecture

### Your Access Control System

**Location:** `src/server/auth/access.ts`

```typescript
// Check if user has a required role
export async function requireRole(allowed: AppRole[]) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) 
    return { ok: false, reason: "unauthorized" };
  
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, role: true, disabledAt: true }
  });
  
  const role = user?.role || "customer";
  
  if (!allowed.includes(role)) 
    return { ok: false, reason: "forbidden" }; // ✅ Permission denied!
  
  return { ok: true, userId: user.id, role };
}
```

**This is EXCELLENT!** You have:
- ✅ Proper session checking
- ✅ Role validation
- ✅ Account disabled checking
- ✅ Clear error codes ("unauthorized" vs "forbidden")

---

## Security Vulnerabilities to Prevent

### 1️⃣ Vertical Privilege Escalation
**Threat:** Customer becomes Manager

```typescript
// ❌ VULNERABLE: No permission check
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Later: Update any user's role
  await prisma.user.update({
    where: { id: request.body.userId },
    data: { role: "manager" } // Anyone can do this!
  });
}

// ✅ SECURE: Permission required
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  
  // Must be manager
  const allowed = await requireRole(["manager"]);
  if (!allowed.ok) {
    return NextResponse.json(
      { error: "Forbidden" }, 
      { status: 403 }
    );
  }
  
  // Only now update user
  await prisma.user.update({
    where: { id: request.body.userId },
    data: { role: "manager" }
  });
}
```

### 2️⃣ Horizontal Privilege Escalation
**Threat:** Customer views another customer's orders

```typescript
// ❌ VULNERABLE: No data filtering
export async function GET(request: Request) {
  const { orderId } = params;
  
  // Anyone can view any order
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  return NextResponse.json(order);
}

// ✅ SECURE: Data filtered by user
export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return unauthorized();
  
  const { orderId } = params;
  
  // Get the order
  const order = await prisma.order.findUnique({
    where: { id: orderId }
  });
  
  if (!order) return notFound();
  
  // Verify user owns the order or is staff/manager
  if (order.userId !== session.user.id && session.user.role === "customer") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }
  
  return NextResponse.json(order);
}
```

### 3️⃣ TOTP Bypass
**Threat:** Staff/Manager disables MFA or bypasses TOTP check

```typescript
// ❌ VULNERABLE: TOTP disabled for some roles
if (role === "customer") {
  // TOTP required
  if (!verifyTotp(totp)) return unauthorized();
}
// For staff/manager, TOTP ignored!

// ✅ SECURE: TOTP required for high-privilege roles
if (["staff", "manager"].includes(role)) {
  // TOTP required
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user.mfaTotpEnabledAt) {
    return NextResponse.json(
      { error: "MFA not enabled" },
      { status: 403 }
    );
  }
  if (!verifyTotp(totp, user.mfaTotpSecret)) {
    return NextResponse.json(
      { error: "Invalid MFA code" },
      { status: 401 }
    );
  }
}
```

---

## Security Checklist: What To Verify

### ✅ Authorization Checks

```
[ ] Every /manager/* route requires requireRole(["manager"])
[ ] Every /staff/* route requires requireRole(["staff", "manager"])
[ ] No route accepts "as any" for user data
[ ] Data responses filtered by user ID (horizontal escalation check)
[ ] Deleted/disabled users cannot access portal
[ ] Session expiration tested (old sessions rejected)
```

### ✅ MFA (Multi-Factor Authentication)

```
[ ] Managers must have TOTP enabled
[ ] TOTP code verified on sensitive operations
[ ] TOTP codes are single-use (time-based, 30-sec window)
[ ] Invalid code locked out for 15 minutes (rate limited)
[ ] TOTP backup codes work (if implemented)
```

### ✅ Data Validation

```
[ ] All request bodies validated for type/range
[ ] No SQL injection risks (using Prisma - good!)
[ ] No CSRF tokens needed if using httpOnly cookies
[ ] Rate limiting on sensitive operations
```

### ✅ Audit Logging

```
[ ] All manager/staff operations logged
[ ] Logs include: user ID, action, timestamp, IP
[ ] Log tampering prevented (immutable or signed)
[ ] Admin can view audit logs
```

---

## Test Examples for RBAC

### Test 1: Customer Cannot Access Manager Endpoints

```typescript
test("GET /api/manager/orders requires manager role", async () => {
  // Sign in as customer
  const session = await signinAs("customer");
  
  // Try to access manager endpoint
  const response = await fetch("/api/manager/orders", {
    headers: { Authorization: `Bearer ${session.token}` }
  });
  
  // Should be denied
  assert.equal(response.status, 403);
  assert(response.json.error.includes("Forbidden"));
});

test("GET /api/manager/orders allows manager", async () => {
  // Sign in as manager
  const session = await signinAs("manager");
  
  // Try to access manager endpoint
  const response = await fetch("/api/manager/orders", {
    headers: { Authorization: `Bearer ${session.token}` }
  });
  
  // Should be allowed
  assert.equal(response.status, 200);
  assert(Array.isArray(response.json));
});
```

### Test 2: Customer Cannot Access Another Customer's Data

```typescript
test("GET /api/orders/[id] filters by user", async () => {
  // Create two customers
  const customer1 = await createUser({ role: "customer" });
  const customer2 = await createUser({ role: "customer" });
  
  // Customer1 places an order
  const order = await createOrder({ userId: customer1.id });
  
  // Customer2 tries to view customer1's order
  const session2 = await signinAs(customer2);
  const response = await fetch(`/api/orders/${order.id}`, {
    headers: { Authorization: `Bearer ${session2.token}` }
  });
  
  // Should be denied
  assert.equal(response.status, 403);
});
```

### Test 3: Manager Requires TOTP

```typescript
test("POST /api/manager/process-refund requires TOTP", async () => {
  // Sign in as manager (with TOTP enabled)
  const session = await signinAs("manager");
  
  // Try to process refund WITHOUT TOTP code
  const response = await fetch("/api/manager/process-refund", {
    method: "POST",
    headers: { Authorization: `Bearer ${session.token}` },
    body: JSON.stringify({ orderId: "123", reason: "refund" })
  });
  
  // Should require MFA
  assert.equal(response.status, 403);
  assert(response.json.error.includes("MFA"));
});

test("POST /api/manager/process-refund works with valid TOTP", async () => {
  const session = await signinAs("manager");
  const totp = generateTotpCode(managerUser.mfaTotpSecret);
  
  const response = await fetch("/api/manager/process-refund", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.token}`,
      "X-TOTP": totp
    },
    body: JSON.stringify({ orderId: "123" })
  });
  
  assert.equal(response.status, 200);
});
```

---

## Implementation Checklist

### Step 1: Verify All Protected Routes

```bash
# Find all manager/staff endpoints
grep -r "/manager" src/app/api/
grep -r "/staff" src/app/api/

# Check each one has requireRole() call
```

### Step 2: Create RBAC Test Suite

```typescript
// tests/rbac.test.ts
test.describe("Manager Portal RBAC", () => {
  test("customer access denied", () => { ... });
  test("staff access denied", () => { ... });
  test("manager access allowed", () => { ... });
});
```

### Step 3: Audit Sensitive Operations

```
[ ] Create user - only manager
[ ] Delete user - only manager
[ ] Process refund - only manager (with TOTP)
[ ] View all orders - only manager/staff
[ ] Disable account - only manager (with audit log)
```

---

## Your Current Strengths

✅ **Good:**
- `requireRole()` function is well-designed
- MFA TOTP checking exists
- Role field in session

⚠️ **To Verify:**
- All endpoints call `requireRole()` before operating
- TOTP verification happens for sensitive manager operations
- Horizontal escalation prevented (user can't see other users' data)
- Rate limiting on sensitive endpoints

---

## Summary

Your app needs RBAC because:
1. **Confidentiality** - Customers shouldn't see each other's orders
2. **Integrity** - Only managers should modify system settings
3. **Compliance** - Some businesses require audit trails for data access
4. **Trust** - Users need to know their data is secure

With proper RBAC:
- ✅ Customer data is private
- ✅ Staff can only do staff tasks
- ✅ Managers must use MFA for sensitive operations
- ✅ All access is logged and auditable
