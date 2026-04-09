import assert from "node:assert/strict";
import test from "node:test";

import { getRegisterErrorMessage, getSignInErrorMessage } from "./auth-messages.ts";

test("getSignInErrorMessage keeps credential failures generic", () => {
  assert.equal(getSignInErrorMessage("InvalidCredentials"), "Incorrect email or password.");
  assert.equal(getSignInErrorMessage("CredentialsSignin"), "Incorrect email or password.");
});

test("getSignInErrorMessage formats retry delays for rate limits", () => {
  assert.equal(
    getSignInErrorMessage("TooManyAttempts:75"),
    "Too many sign-in attempts. Please wait about 1 minute and try again."
  );
});

test("getSignInErrorMessage preserves specific MFA guidance", () => {
  assert.equal(getSignInErrorMessage("TOTPRequired"), "Enter your 6-digit authenticator code to sign in.");
  assert.equal(getSignInErrorMessage("TOTPInvalid"), "Invalid authenticator code. Try again.");
});

test("getRegisterErrorMessage keeps duplicate-account failures privacy-safe", () => {
  assert.equal(
    getRegisterErrorMessage({ code: "SignInInstead", error: "An account with that email already exists." }),
    "We couldn't create that account. Sign in instead if you already have one."
  );
});

test("getRegisterErrorMessage returns password validation feedback", () => {
  assert.equal(
    getRegisterErrorMessage({ code: "InvalidPassword", error: "Password must be at least 9 characters." }),
    "Password must be at least 9 characters."
  );
});

test("getRegisterErrorMessage falls back cleanly for generic failures", () => {
  assert.equal(getRegisterErrorMessage(null), "Could not create account. Please try again.");
  assert.equal(getRegisterErrorMessage({}), "Could not create account. Please try again.");
});
