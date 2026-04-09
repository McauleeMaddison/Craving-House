import assert from "node:assert/strict";
import test from "node:test";

import {
  authorizeCredentialsSignIn,
  type CredentialSignInUser,
  normalizeCredentialErrorCode,
  normalizeRole
} from "./credentials.ts";

function makeUser(overrides: Partial<CredentialSignInUser> = {}): CredentialSignInUser {
  return {
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    image: null,
    role: "customer",
    disabledAt: null,
    passwordHash: "stored-hash",
    mfaTotpSecret: null,
    mfaTotpEnabledAt: null,
    ...overrides
  };
}

function makeDeps(overrides: Partial<Parameters<typeof authorizeCredentialsSignIn>[0]["deps"]> = {}) {
  const calls = {
    cleared: [] as Array<{ email: string; ip: string }>,
    failures: [] as Array<{ email: string; ip: string }>,
    passwordChecks: [] as Array<{ password: string; stored: string }>,
    rehashes: [] as Array<{ userId: string; passwordHash: string }>,
    totpChecks: [] as Array<{ secretBase32: string; token: string }>
  };

  return {
    calls,
    deps: {
      clearCredentialSignInFailures: async (params: { email: string; ip: string }) => {
        calls.cleared.push(params);
      },
      decryptSecret: (box: string) => `decrypted:${box}`,
      findUserByEmail: async () => makeUser(),
      formatTooManyAttemptsError: (retryAfterSeconds: number) => `TooManyAttempts:${retryAfterSeconds}`,
      getCredentialSignInBlockStatus: async () => ({ blocked: false, retryAfterSeconds: 0 }),
      hashPassword: async () => "rehash-value",
      logError: () => {},
      passwordHashNeedsRehash: () => false,
      registerCredentialSignInFailure: async (params: { email: string; ip: string }) => {
        calls.failures.push(params);
        return { blocked: false, retryAfterSeconds: 0 };
      },
      updateUserPasswordHash: async (params: { userId: string; passwordHash: string }) => {
        calls.rehashes.push(params);
      },
      verifyPassword: async (params: { password: string; stored: string }) => {
        calls.passwordChecks.push(params);
        return true;
      },
      verifyTotp: (params: { secretBase32: string; token: string }) => {
        calls.totpChecks.push(params);
        return true;
      },
      ...overrides
    }
  };
}

test("normalizeRole falls back to customer for unsupported roles", () => {
  assert.equal(normalizeRole("manager"), "manager");
  assert.equal(normalizeRole("staff"), "staff");
  assert.equal(normalizeRole("owner"), "customer");
});

test("authorizeCredentialsSignIn returns null for missing credentials", async () => {
  const { deps, calls } = makeDeps();

  const result = await authorizeCredentialsSignIn({
    deps,
    email: "",
    password: "",
    ip: "127.0.0.1"
  });

  assert.equal(result, null);
  assert.equal(calls.failures.length, 0);
});

test("authorizeCredentialsSignIn rejects immediately when the email/ip is already blocked", async () => {
  const { deps } = makeDeps({
    getCredentialSignInBlockStatus: async () => ({ blocked: true, retryAfterSeconds: 45 })
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "password",
        ip: "127.0.0.1"
      }),
    { message: "TooManyAttempts:45" }
  );
});

test("authorizeCredentialsSignIn registers a failure for an invalid password", async () => {
  const { deps, calls } = makeDeps({
    verifyPassword: async (params: { password: string; stored: string }) => {
      calls.passwordChecks.push(params);
      return false;
    }
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "wrong-password",
        ip: "127.0.0.1"
      }),
    { message: "IncorrectPassword" }
  );
  assert.deepEqual(calls.failures, [{ email: "test@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.cleared.length, 0);
});

test("authorizeCredentialsSignIn registers a failure for an unknown email", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () => null
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "missing@example.com",
        password: "wrong-password",
        ip: "127.0.0.1"
      }),
    { message: "InvalidCredentials" }
  );

  assert.deepEqual(calls.failures, [{ email: "missing@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.cleared.length, 0);
});

test("authorizeCredentialsSignIn rejects disabled users with an internal auth code", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () =>
      makeUser({
        disabledAt: new Date("2026-04-09T12:00:00.000Z")
      })
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "correct-password",
        ip: "127.0.0.1"
      }),
    { message: "AccountDisabled" }
  );

  assert.deepEqual(calls.failures, [{ email: "test@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.cleared.length, 0);
});

test("authorizeCredentialsSignIn rejects password sign-in when the account has no password hash", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () =>
      makeUser({
        passwordHash: null
      })
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "correct-password",
        ip: "127.0.0.1"
      }),
    { message: "PasswordSignInUnavailable" }
  );

  assert.deepEqual(calls.failures, [{ email: "test@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.cleared.length, 0);
});

test("authorizeCredentialsSignIn returns a normalized user and clears failures after success", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () => makeUser({ role: "owner" })
  });

  const result = await authorizeCredentialsSignIn({
    deps,
    email: "TEST@EXAMPLE.COM ",
    password: "correct-password",
    ip: "127.0.0.1"
  });

  assert.deepEqual(result, {
    id: "user_123",
    email: "test@example.com",
    name: "Test User",
    image: null,
    role: "customer"
  });
  assert.deepEqual(calls.cleared, [{ email: "test@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.failures.length, 0);
});

test("authorizeCredentialsSignIn requires TOTP for MFA-enabled manager accounts", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () =>
      makeUser({
        role: "manager",
        mfaTotpSecret: "secret-box",
        mfaTotpEnabledAt: new Date("2026-04-09T12:00:00.000Z")
      })
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "correct-password",
        ip: "127.0.0.1"
      }),
    { message: "TOTPRequired" }
  );

  assert.deepEqual(calls.failures, [{ email: "test@example.com", ip: "127.0.0.1" }]);
  assert.equal(calls.totpChecks.length, 0);
});

test("authorizeCredentialsSignIn rejects invalid manager TOTP codes", async () => {
  const { deps, calls } = makeDeps({
    findUserByEmail: async () =>
      makeUser({
        role: "manager",
        mfaTotpSecret: "secret-box",
        mfaTotpEnabledAt: new Date("2026-04-09T12:00:00.000Z")
      }),
    verifyTotp: (params: { secretBase32: string; token: string }) => {
      calls.totpChecks.push(params);
      return false;
    }
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "correct-password",
        totp: "123456",
        ip: "127.0.0.1"
      }),
    { message: "TOTPInvalid" }
  );

  assert.deepEqual(calls.totpChecks, [{ secretBase32: "decrypted:secret-box", token: "123456" }]);
});

test("authorizeCredentialsSignIn surfaces a rate-limit error once a failure blocks sign-in", async () => {
  const { deps } = makeDeps({
    findUserByEmail: async () => null,
    registerCredentialSignInFailure: async () => ({ blocked: true, retryAfterSeconds: 120 })
  });

  await assert.rejects(
    () =>
      authorizeCredentialsSignIn({
        deps,
        email: "test@example.com",
        password: "correct-password",
        ip: "127.0.0.1"
      }),
    { message: "TooManyAttempts:120" }
  );
});

test("normalizeCredentialErrorCode collapses sensitive backend auth codes to public-safe codes", () => {
  assert.equal(normalizeCredentialErrorCode(new Error("IncorrectPassword")), "InvalidCredentials");
  assert.equal(normalizeCredentialErrorCode(new Error("AccountDisabled")), "InvalidCredentials");
  assert.equal(normalizeCredentialErrorCode(new Error("PasswordSignInUnavailable")), "InvalidCredentials");
  assert.equal(normalizeCredentialErrorCode(new Error("InvalidCredentials")), "InvalidCredentials");
  assert.equal(normalizeCredentialErrorCode(new Error("TOTPRequired")), "TOTPRequired");
  assert.equal(normalizeCredentialErrorCode(new Error("TOTPInvalid")), "TOTPInvalid");
  assert.equal(normalizeCredentialErrorCode(new Error("SomethingElse")), null);
  assert.equal(normalizeCredentialErrorCode("not-an-error"), null);
});
