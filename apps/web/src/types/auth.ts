/**
 * Type-safe user and role definitions for the entire app
 * This file is the single source of truth for user types
 * 
 * Benefits:
 * - No more "as any" for user types
 * - Clear role hierarchy
 * - Type-safe role checking
 * - Easy to audit permissions
 */

/**
 * App roles from lowest to highest privilege
 * - customer: regular customer (default)
 * - staff: can view orders and scan loyalty QR codes
 * - manager: full admin access
 */
export const ROLES = ["customer", "staff", "manager"] as const;
export type AppRole = (typeof ROLES)[number];

/**
 * User object that's guaranteed to be in the database
 * This is what getServerSession returns after validation
 */
export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string | null;
  role: AppRole;
};

/**
 * Session object with typed user
 * Use this instead of Session["user"] casting
 */
export type TypedSession = {
  user: AuthenticatedUser;
  expires: string;
};

/**
 * Type guard to check if a value is a valid AppRole
 * Safe for untrusted data (database, API responses)
 */
export function isValidRole(value: unknown): value is AppRole {
  return typeof value === "string" && ROLES.includes(value as AppRole);
}

/**
 * Normalize a role from database or external source
 * Returns "customer" if invalid
 */
export function normalizeRole(role: unknown): AppRole {
  if (isValidRole(role)) return role;
  return "customer";
}

/**
 * Check if user has a specific role (for permissions)
 * 
 * Example:
 *   hasRole(user, "manager") -> true if user is manager
 *   hasRole(user, ["staff", "manager"]) -> true if either
 */
export function hasRole(user: AuthenticatedUser, role: AppRole | AppRole[]): boolean {
  const roles = Array.isArray(role) ? role : [role];
  return roles.includes(user.role);
}

/**
 * Check if user has at least a minimum privilege level
 * Useful for hierarchical role checking
 * 
 * Example:
 *   hasMinimumRole(user, "staff") -> true for staff and manager, false for customer
 */
export function hasMinimumRole(user: AuthenticatedUser, minimumRole: AppRole): boolean {
  const hierarchy = { customer: 0, staff: 1, manager: 2 };
  return hierarchy[user.role] >= hierarchy[minimumRole];
}

/**
 * Extract user from session with type safety
 * Returns null if user is not properly authenticated
 * 
 * Example:
 *   const user = extractUser(session);
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   // Now user is fully typed
 */
export function extractUser(session: unknown): AuthenticatedUser | null {
  if (!session || typeof session !== "object") return null;
  
  const sess = session as Record<string, unknown>;
  const user = sess.user;
  
  if (!user || typeof user !== "object") return null;
  
  const userData = user as Record<string, unknown>;
  
  // Verify all required fields exist and are correct type
  if (typeof userData.id !== "string") return null;
  if (typeof userData.email !== "string") return null;
  if (userData.name !== null && typeof userData.name !== "string") return null;
  if (!isValidRole(userData.role)) return null;
  
  return {
    id: userData.id,
    email: userData.email,
    name: userData.name,
    role: userData.role
  };
}

// ============================================
// AUTH CONFIG TYPE GUARDS
// ============================================

/**
 * Credentials from NextAuth's credentials provider
 * Used for email/password signin
 */
export type CredentialsInput = {
  email?: string;
  password?: string;
  totp?: string; // Optional TOTP code for MFA
};

/**
 * Parse and validate credentials from untrusted input
 * This prevents "as any" casting when accessing credentials
 */
export function parseCredentials(raw: unknown): CredentialsInput | null {
  if (!raw || typeof raw !== "object") return null;
  
  const input = raw as Record<string, unknown>;
  
  // Validate structure (all fields optional, but if present must be string)
  if (input.email !== undefined && typeof input.email !== "string") return null;
  if (input.password !== undefined && typeof input.password !== "string") return null;
  if (input.totp !== undefined && typeof input.totp !== "string") return null;
  
  return {
    email: input.email as string | undefined,
    password: input.password as string | undefined,
    totp: input.totp as string | undefined
  };
}

// ============================================
// OAUTH PROFILE TYPE GUARDS
// ============================================

/**
 * OAuth profile from external providers (Google, GitHub, etc.)
 */
export type OAuthProfile = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
};

/**
 * Parse OAuth profile safely
 * Used when integrating with Google, GitHub, Apple, etc.
 */
export function parseOAuthProfile(raw: unknown): OAuthProfile | null {
  if (!raw || typeof raw !== "object") return null;
  
  const profile = raw as Record<string, unknown>;
  
  if (typeof profile.id !== "string") return null;
  if (typeof profile.email !== "string") return null;
  if (profile.name !== null && typeof profile.name !== "string") return null;
  if (profile.image !== null && typeof profile.image !== "string") return null;
  
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name as string | null,
    image: profile.image as string | null
  };
}

// ============================================
// USAGE IN YOUR CODE
// ============================================

/**
 * Before (with as any):
 * 
 *   const user = (session?.user as any);
 *   const role = user?.role as string; // Oops, what if role is wrong?
 *   if (role === "manager") { ... }
 * 
 * After (with type safety):
 * 
 *   const user = extractUser(session);
 *   if (!user) return unauthorized();
 *   
 *   if (hasRole(user, "manager")) { ... } // Type-safe
 *   if (hasMinimumRole(user, "staff")) { ... } // Hierarchical check
 */
