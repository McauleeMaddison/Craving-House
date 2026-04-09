export type AppUserRole = "customer" | "staff" | "manager";

export type CredentialSignInUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: unknown;
  disabledAt: Date | null;
  passwordHash: string | null;
  mfaTotpSecret: string | null;
  mfaTotpEnabledAt: Date | null;
};

export type AuthorizedUser = {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: AppUserRole;
};

type SignInBlockStatus = {
  blocked: boolean;
  retryAfterSeconds: number;
};

type CredentialSignInDeps = {
  clearCredentialSignInFailures(params: { email: string; ip: string }): Promise<unknown>;
  decryptSecret(box: string): string;
  findUserByEmail(email: string): Promise<CredentialSignInUser | null>;
  formatTooManyAttemptsError(retryAfterSeconds: number): string;
  getCredentialSignInBlockStatus(params: { email: string; ip: string }): Promise<SignInBlockStatus>;
  hashPassword(password: string): Promise<string>;
  logError(message: string, error: unknown): void;
  passwordHashNeedsRehash(stored: string): boolean;
  registerCredentialSignInFailure(params: { email: string; ip: string }): Promise<SignInBlockStatus>;
  updateUserPasswordHash(params: { userId: string; passwordHash: string }): Promise<unknown>;
  verifyPassword(params: { password: string; stored: string }): Promise<boolean>;
  verifyTotp(params: { secretBase32: string; token: string }): boolean;
};

export function normalizeRole(role: unknown): AppUserRole {
  if (role === "staff" || role === "manager") return role;
  return "customer";
}

export async function authorizeCredentialsSignIn(params: {
  deps: CredentialSignInDeps;
  email: string;
  ip: string;
  password: string;
  totp?: string;
}): Promise<AuthorizedUser | null> {
  const email = params.email.trim().toLowerCase();
  const password = params.password;
  const totp = (params.totp ?? "").trim();
  const { deps, ip } = params;

  if (!email || !password) return null;

  const fail = async (errorCode?: string) => {
    const failed = await deps.registerCredentialSignInFailure({ email, ip });
    if (failed.blocked) throw new Error(deps.formatTooManyAttemptsError(failed.retryAfterSeconds));
    if (errorCode) throw new Error(errorCode);
    return null;
  };

  const blocked = await deps.getCredentialSignInBlockStatus({ email, ip });
  if (blocked.blocked) {
    throw new Error(deps.formatTooManyAttemptsError(blocked.retryAfterSeconds));
  }

  const user = await deps.findUserByEmail(email);
  if (!user || user.disabledAt) return fail();
  if (!user.passwordHash) return fail();

  const ok = await deps.verifyPassword({ password, stored: user.passwordHash });
  if (!ok) return fail();

  const isManager = normalizeRole(user.role) === "manager";
  const mfaEnabled = Boolean(user.mfaTotpEnabledAt && user.mfaTotpSecret);
  if (isManager && mfaEnabled) {
    if (!totp) return fail("TOTPRequired");
    try {
      const secretBase32 = deps.decryptSecret(user.mfaTotpSecret!);
      const valid = deps.verifyTotp({ secretBase32, token: totp });
      if (!valid) return fail("TOTPInvalid");
    } catch {
      return fail("TOTPInvalid");
    }
  }

  await deps.clearCredentialSignInFailures({ email, ip });

  if (deps.passwordHashNeedsRehash(user.passwordHash)) {
    void deps
      .hashPassword(password)
      .then((passwordHash) =>
        deps.updateUserPasswordHash({
          userId: user.id,
          passwordHash
        })
      )
      .catch((error) => {
        deps.logError("Failed to rehash password after sign-in", error);
      });
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    image: user.image,
    role: normalizeRole(user.role)
  };
}
