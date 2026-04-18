# ⚡ Performance Optimization Guide - Learning Lesson

## What We Just Did (AppHeader Refactoring)

You removed `useMemo` hooks from AppHeader.
This is usually a GOOD thing,
but we need to verify it doesn't cause performance regressions.
Let me teach you why:

---

## Understanding useMemo

### What is useMemo?

`useMemo` is a React hook that **caches** expensive calculations.

```typescript
// ❌ Without useMemo: Recalculated every render
function Component() {
  const cart = useCart();
  // Runs on EVERY render
  const cartCount = cart.lines.reduce((sum, line) => sum + line.qty, 0);
  return <div>{cartCount}</div>;
}

// ✅ With useMemo: Cached until dependencies change
function Component() {
  const cart = useCart();
  const cartCount = useMemo(
    () => cart.lines.reduce((sum, line) => sum + line.qty, 0),
    [cart.lines] // Only recalculate if cart.lines changes
  );
  return <div>{cartCount}</div>;
}
```

### When is useMemo Necessary?

```text
✅ GOOD USE:
├─ Complex calculation (sorting 1000 items)
├─ Heavy rendering (large list component)
├─ Expensive external API call (memcached API)
└─ Function reference stability (for event handlers)

❌ BAD USE:
├─ Simple math (count < 100 items)
├─ Object literals (just comparing values)
├─ Early optimization (without profiling)
└─ Premature memoization (no proof of slowness)
```

---

## Your AppHeader Changes Analysis

### What Was Removed

**Before (with useMemo):**

```typescript
const cartCount = useMemo(
  () => lines.reduce((sum, line) => sum + line.qty, 0),
  [lines],
);

const activeHref = useMemo(
  () => links.find((l) => pathname?.startsWith(l.href))?.href ?? "",
  [pathname],
);

const portalLinks = useMemo(() => {
  if (!canUseStaff) return [];
  // ... complex logic ...
  return list;
}, [canUseManager, canUseStaff]);
```

**After (without useMemo):**

```typescript
const cartCount = lines.reduce((sum, line) => sum + line.qty, 0);

const activeCustomerHref =
  customerLinks.find((link) => isActivePath(pathname, link.href))?.href ?? "";

const portalLinks = getPortalLinks(canUseStaff, canUseManager);
```

### Performance Analysis

- `cartCount`: O(n), where n = items in cart, every render, no memo needed
  for a typical cart under 20 items.
- `activeHref`: O(n), where n = 5-10 links, every render, no memo needed.
- `portalLinks`: O(1) array assembly, every render, no memo needed.

**Verdict: ✅ SAFE TO REMOVE** - These calculations are fast

---

## When Removal Causes Problems

### ❌ DANGEROUS: Function References in Event Handlers

```typescript
// ❌ BAD: New function created every render
function Component() {
  const handleClick = () => { console.log("clicked"); };

  // Causes child to re-render even if no other props changed
  return <ChildComponent onClick={handleClick} />;
}

// ✅ GOOD: Memoize the function reference
function Component() {
  const handleClick = useCallback(
    () => { console.log("clicked"); },
    [] // Empty because no dependencies
  );

  return <ChildComponent onClick={handleClick} />;
}
```

### ❌ DANGEROUS: Array/Object Props to Optimized Children

```typescript
// ❌ BAD: New array every render causes re-render
function Component({ items }) {
  const filtered = items.filter(x => x.active);
  return <OptimizedList items={filtered} />;
}

// ✅ GOOD: Memoize the array
function Component({ items }) {
  const filtered = useMemo(
    () => items.filter(x => x.active),
    [items]
  );
  return <OptimizedList items={filtered} />;
}
```

### ❌ DANGEROUS: Conditional Renders with Expensive Setup

```typescript
// ❌ BAD: Expensive calculation every render
function Component() {
  const drawerStatuses = [
    { href: "/menu", label: "Menu", value: "Open", accent: true },
    {
      href: loyaltyHref,
      label: "Loyalty",
      value: signedIn ? "My QR" : "Sign in",
    },
    // ... more logic ...
  ];

  return open ? <Drawer statuses={drawerStatuses} /> : null;
}

// ✅ GOOD: Only calculate when needed
function Component() {
  const drawerStatuses = useMemo(
    () => [
      { href: "/menu", label: "Menu", value: "Open", accent: true },
      {
        href: loyaltyHref,
        label: "Loyalty",
        value: signedIn ? "My QR" : "Sign in",
      },
    ],
    [loyaltyHref, signedIn]
  );

  return open ? <Drawer statuses={drawerStatuses} /> : null;
}
```

---

## Performance Verification Checklist

### ✅ To Verify Your Refactoring is Safe

```text
[ ] No re-rendering of child components (check with React DevTools)
[ ] No new DOM elements being created unnecessarily
[ ] Lighthouse performance score stays same or improves
[ ] No lag when scrolling/opening drawer
[ ] No lag when adding items to cart
```

### 📊 How to Check Performance

#### Method 1: React DevTools Profiler

```javascript
// 1. Open DevTools → React DevTools tab
// 2. Click "Profiler" tab
// 3. Click "Start recording"
// 4. Interact with component (click, scroll)
// 5. Click "Stop"
// 6. Check: Is AppHeader unnecessarily re-rendering?
```

#### Method 2: Lighthouse Audit

```bash
# Run Lighthouse performance audit
npm run test:lighthouse
# Check "Performance" score
# Look for "Avoid chaining multiple media queries"
```

#### Method 3: Chrome DevTools Performance Tab

```javascript
// 1. Open DevTools → Performance tab
// 2. Click red record button
// 3. Interact (add to cart, click menu)
// 4. Stop recording
// 5. Look at timeline for dropped frames
// 6. Check if AppHeader is the cause
```

---

## Expected Performance Characteristics

### Before (with useMemo)

- ✅ Component re-renders when **dependencies change**
- ✅ Child components don't unnecessarily re-render
- ❌ Slight overhead from useMemo wrapper

### After (without useMemo)

- ✅ Simpler code (easier to maintain)
- ✅ Same behavior if dependencies don't change frequently
- ❌ **Risk**: Child components might re-render more often

### When to Worry

```typescript
// ❌ This would cause problems:
const expensiveList = useMemo(() =>
  largeDataset.map(transformExpensiveOperation), // Takes 100ms
  [largeDataset]
);

// And if this is rendered many times:
for (let i = 0; i < 1000; i++) {
  <Component expensiveList={expensiveList} />
}
// Every render would take 100ms × 1000 = 100 seconds!
```

---

## Your Specific Case: AppHeader

### Analysis

**What changed:**

- `cartCount` - Array.reduce() on cart items (fast)
- `activeHref` - Array.find() on 5 links (fast)
- `portalLinks` - Array spread/conditional (fast)
- Helper functions - Pure functions with no dependencies (fast)

**Why it's safe:**

1. ✅ Operations are fast (< 1ms each)
2. ✅ Arrays are small (5-10 items)
3. ✅ Functions don't create new object references
4. ✅ Child components receive same props usually

**Potential issues:**

- ❌ If `isActivePath()` or other helpers are called many times
- ❌ If you add expensive operations later without thinking about it

---

## Performance Best Practices Going Forward

### 1. Measure Before Optimizing

```typescript
console.time("calculation");
const result = expensiveCalculation();
console.timeEnd("calculation");
// If < 1ms, don't memoize
```

### 2. Profile Real Usage

```typescript
// Use Chrome DevTools Profiler during real user flows
// Only memoize if you see consistent performance issues
```

### 3. Document Performance-Critical Code

```typescript
// ❌ BAD: Nobody knows why useMemo is here
const items = useMemo(() => [...], [deps]);

// ✅ GOOD: Clear explanation
// useMemo: Sorting 10,000 items takes ~50ms, essential for smooth scroll
const items = useMemo(() => {
  return sortByRelevance(largeDataset);
}, [largeDataset]);
```

### 4. Test Performance in CI/CD

```bash
# Lighthouse CI on every PR
npm run test:lighthouse

# Budget checks
# If Performance score drops > 5 points, fail the build
```

---

## Lighthouse Audit Guide

### What Lighthouse Measures

```text
Performance Score (0-100):
├─ First Contentful Paint (FCP) - Time to first visual change
├─ Largest Contentful Paint (LCP) - Time to largest element visible
├─ Cumulative Layout Shift (CLS) - How much page jumps around
├─ First Input Delay (FID) - How responsive to user input
└─ Time to Interactive (TTI) - When page is fully usable
```

### Targets for Craving House

```text
Good (Green):     > 90 points
Moderate (Yellow): 50-90 points
Poor (Red):        < 50 points
```

### Common Issues & Fixes

| Issue              | Impact | Fix                                  |
| ------------------ | ------ | ------------------------------------ |
| Unoptimized images | LCP    | Use next/image with responsive sizes |
| Large bundles      | TTI    | Code split, lazy load routes         |
| Render blocking JS | FCP    | Async defer scripts                  |
| Jank on scroll     | CLS    | Don't inject DOM during scroll       |
| Slow API calls     | TTI    | Cache, prefetch, or skeleton UI      |

---

## Recommended Actions

### Immediate (Before Production)

1. ✅ Run Lighthouse audit
2. ✅ Check React DevTools Profiler
3. ✅ Verify no layout shifts
4. ✅ Test on slow 3G (DevTools throttle)

### Short Term (This Sprint)

1. ⏭️ Implement Lighthouse budget
2. ⏭️ Code-split large components
3. ⏭️ Optimize images
4. ⏭️ Setup performance monitoring

### Long Term (Next Quarter)

1. ⏭️ Real User Monitoring (RUM)
2. ⏭️ Core Web Vitals tracking
3. ⏭️ Performance regression testing
4. ⏭️ A/B testing performance improvements

---

## Summary

Your AppHeader refactoring is **probably safe** because:

- ✅ Removed calculations are all fast (< 1ms)
- ✅ Arrays are small
- ✅ No new object references created

But you should **verify** with:

- ✅ Lighthouse audit (check Performance score)
- ✅ React DevTools Profiler (check re-render counts)
- ✅ Manual testing (smooth scrolling, no jank)

If Performance score drops more than 5 points,
investigate which calculation is expensive.
