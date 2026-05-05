"use client";

import { getSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

import { getRegisterErrorMessage, getSignInErrorMessage, type RegisterErrorResponse } from "@/lib/auth-messages";
import { resolvePostSignInRedirect } from "@/lib/post-signin-redirect";

export default function SignInPage() {
  const devEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";
  const [devCode, setDevCode] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);
  const [callbackUrl, setCallbackUrl] = useState("/");
  const [oauthBusy, setOauthBusy] = useState(false);

  const googleAvailable = Boolean(providers?.google);
  const managerMode = callbackUrl.startsWith("/manager");

  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get("error");
    if (err) setMessage(getSignInErrorMessage(err));
    const cb = url.searchParams.get("callbackUrl");
    if (cb && cb.startsWith("/")) setCallbackUrl(cb);
  }, []);

  useEffect(() => {
    if (managerMode && mode === "signup") {
      setMode("signin");
    }
  }, [managerMode, mode]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const res = await fetch("/api/auth/providers", { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as Record<string, unknown>;
        if (!cancelled) setProviders(json);
      } catch {
        // ignore
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  async function waitForSessionReady(expectedEmail?: string) {
    const normalizedExpectedEmail = expectedEmail?.trim().toLowerCase() ?? "";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      const session = await getSession();
      const sessionEmail =
        typeof session?.user?.email === "string" ? session.user.email.trim().toLowerCase() : "";

      if (session?.user?.id) {
        if (!normalizedExpectedEmail || !sessionEmail || sessionEmail === normalizedExpectedEmail) {
          return session;
        }
      }
      await new Promise((resolve) => window.setTimeout(resolve, 150));
    }
    return null;
  }

  async function onEmailSubmit() {
    setMessage(null);
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password.trim()) {
      setMessage("Enter your email and password.");
      return;
    }

    if (mode === "signup") {
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password })
        });
        const json = (await res.json().catch(() => null)) as RegisterErrorResponse;
        if (!res.ok) {
          setMessage(getRegisterErrorMessage(json));
          return;
        }
      } catch {
        setMessage("Could not create account. Please try again.");
        return;
      }
    }

    try {
      const existingSession = await getSession();
      if (existingSession?.user?.id) {
        await signOut({ redirect: false });
      }
    } catch {
      // Ignore sign-out edge cases and proceed with sign-in.
    }

    const result = await signIn("credentials", {
      email: cleanEmail,
      password,
      totp: totp.trim(),
      callbackUrl,
      redirect: false
    });
    if (!result) {
      setMessage("Sign-in failed. Please try again.");
      return;
    }
    if (result.error) {
      setMessage(getSignInErrorMessage(result.error));
      return;
    }
    const session = await waitForSessionReady(cleanEmail);
    const destination = resolvePostSignInRedirect({
      role: session?.user?.role,
      resultUrl: result.url,
      callbackUrl
    });
    // Hard navigation ensures the new session cookie is picked up immediately.
    window.location.assign(destination);
  }

  async function onGoogleSignIn() {
    setMessage(null);
    setOauthBusy(true);
    try {
      const result = await signIn("google", { callbackUrl, redirect: false });
      if (!result) {
        setMessage("Google sign-in failed. Please try again.");
        return;
      }
      if (result.error) {
        setMessage(getSignInErrorMessage(result.error));
        return;
      }
      if (!result.url) {
        setMessage("Google sign-in failed. Please try again.");
        return;
      }
      window.location.assign(result.url);
    } finally {
      setOauthBusy(false);
    }
  }

  const authHeading = managerMode ? "Manager sign in" : mode === "signin" ? "Sign in" : "Create account";
  const authSubcopy = managerMode
    ? "Use email + password. After 2FA is enrolled, an authenticator code is required."
    : mode === "signin"
      ? "Use Google or email + password to access your account."
      : "Create a customer account with email + password.";

  return (
    <main className="container page pageSignIn">
      <section className="surface signInShell">
        <div className="signInIntro">
          <div className="pill pillFit">Secure account access</div>
          <h1 className="signInTitle">Craving House sign-in</h1>
          <p className="muted signInLead">
            Sign in with Google or with your email + password. This page handles customer, staff, and manager access.
          </p>

          <div className="signInFeatureGrid">
            <article className="surface surfaceFlat signInFeatureCard">
              <div className="signInFeatureTitle">Role-based control</div>
              <p className="muted signInFeatureBody">
                Managers and staff use the same entrypoint, with secure permissions applied automatically after sign-in.
              </p>
            </article>
            <article className="surface surfaceFlat signInFeatureCard">
              <div className="signInFeatureTitle">Manager safety checks</div>
              <p className="muted signInFeatureBody">
                Manager accounts require stronger safeguards, including authenticator code after 2FA enrollment.
              </p>
            </article>
          </div>
        </div>

        <div className="signInAuthColumn">
          <div className="surface surfaceFlat signInAuthCard">
            <div className="signInAuthHeader">
              <div>
                <div className="signInAuthTitle">{authHeading}</div>
                <p className="muted signInAuthCopy">{authSubcopy}</p>
              </div>
              {!managerMode ? (
                <button
                  className="btn btn-secondary btnCompact"
                  type="button"
                  onClick={() => {
                    setMessage(null);
                    setMode((m) => (m === "signin" ? "signup" : "signin"));
                  }}
                >
                  {mode === "signin" ? "Create account" : "I have an account"}
                </button>
              ) : null}
            </div>

            <div className="signInAuthStack">
              {googleAvailable && !managerMode ? (
                <button className="btn btn-secondary signInWideButton" onClick={() => void onGoogleSignIn()} disabled={oauthBusy}>
                  {oauthBusy ? "Redirecting…" : "Continue with Google"}
                </button>
              ) : managerMode ? (
                <div className="pill">Manager sign-in uses email + password and can require authenticator code.</div>
              ) : (
                <div className="pill">Google sign-in not available. Set GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET on the server.</div>
              )}

              <div className="surface surfaceInset signInEmailCard">
                <div className="u-grid-gap-10">
                  <input
                    className="input"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email"
                    type="email"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <div className="inputEndWrap">
                    <input
                      className="input inputWithEndButton"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Password"
                      type={showPassword ? "text" : "password"}
                      autoCapitalize="none"
                      autoCorrect="off"
                    />
                    <button
                      className="inputEndButton"
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    className="input"
                    value={totp}
                    onChange={(e) => setTotp(e.target.value)}
                    placeholder="Authenticator code (required after manager 2FA setup)"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                  />
                  {message ? <div className="pill">{message}</div> : null}
                  <button
                    className="btn btn-secondary signInWideButton"
                    type="button"
                    onClick={onEmailSubmit}
                    disabled={!email.trim() || !password.trim()}
                  >
                    {mode === "signin" ? "Sign in" : "Create account + sign in"}
                  </button>
                  {mode === "signin" ? (
                    <p className="muted u-m-0 u-fs-12 u-lh-16">
                      <a className="u-underline" href="/reset-password">
                        Forgot your password?
                      </a>
                    </p>
                  ) : null}
                  {mode === "signup" ? (
                    <p className="muted u-m-0 u-fs-12 u-lh-16">
                      Password must be at least 9 characters.
                    </p>
                  ) : null}
                </div>
              </div>
            </div>

            {devEnabled ? (
              <div className="signInDevBlock">
                <div className="pill pillFit">Dev sign-in (local only)</div>
                <div className="u-grid-gap-10 u-mt-10">
                  <input
                    className="input"
                    value={devCode}
                    onChange={(e) => setDevCode(e.target.value)}
                    placeholder="Dev code"
                    type="password"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                  <button
                    className="btn btn-secondary signInWideButton"
                    onClick={() => signIn("dev", { code: devCode })}
                    disabled={!devCode.trim()}
                  >
                    Sign in (dev)
                  </button>
                  <p className="muted u-m-0 u-fs-12 u-lh-16">
                    Turn this off for real launch. It exists so you can see the app working before Google is configured.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}
