"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function authErrorToMessage(error: string) {
  switch (error) {
    case "CredentialsSignin":
      return "Sign-in failed. Check your email/password.";
    case "TOTPRequired":
      return "Enter your 6-digit authenticator code to sign in.";
    case "TOTPInvalid":
      return "Invalid authenticator code. Try again.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Google sign-in failed. Check your Google OAuth configuration.";
    default:
      return "Sign-in failed. Please try again.";
  }
}

export default function SignInPage() {
  const router = useRouter();
  const devEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";
  const [devCode, setDevCode] = useState("");
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [providers, setProviders] = useState<Record<string, unknown> | null>(null);

  const googleAvailable = Boolean(providers && (providers as any).google);

  useEffect(() => {
    const url = new URL(window.location.href);
    const err = url.searchParams.get("error");
    if (err) setMessage(authErrorToMessage(err));
  }, []);

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
        const json = (await res.json().catch(() => ({}))) as any;
        if (!res.ok) {
          setMessage(json?.error || "Could not create account.");
          return;
        }
      } catch {
        setMessage("Could not create account.");
        return;
      }
    }

    const result = await signIn("credentials", {
      email: cleanEmail,
      password,
      totp: totp.trim(),
      callbackUrl: "/",
      redirect: false
    });
    if (!result) {
      setMessage("Sign-in failed. Please try again.");
      return;
    }
    if (result.error) {
      setMessage(authErrorToMessage(result.error));
      return;
    }
    router.push(result.url || "/");
  }

  return (
    <main className="container page">
      <section className="surface u-pad-18 u-maxw-560">
        <h1 className="u-title-26">Sign in</h1>
        <p className="muted u-mt-10 u-lh-16">
          Sign in with Google or with your email + password.
        </p>

        <div className="u-grid-gap-12 u-mt-16">
          {googleAvailable ? (
            <button className="btn btn-secondary" onClick={() => signIn("google", { callbackUrl: "/" })}>
              Continue with Google
            </button>
          ) : (
            <div className="pill">Google sign-in not available yet.</div>
          )}

          <div className="surface surfaceFlat u-pad-14">
            <div className="rowWrap u-justify-between">
              <div className="u-fw-950">{mode === "signin" ? "Email sign in" : "Create account"}</div>
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
            </div>

            <div className="u-grid-gap-10 u-mt-12">
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
                placeholder="Authenticator code (managers only)"
                inputMode="numeric"
                autoComplete="one-time-code"
              />
              {message ? <div className="pill">{message}</div> : null}
              <button
                className="btn btn-secondary"
                type="button"
                onClick={onEmailSubmit}
                disabled={!email.trim() || !password.trim()}
              >
                {mode === "signin" ? "Sign in" : "Create account + sign in"}
              </button>
              {mode === "signup" ? (
                <p className="muted u-m-0 u-fs-12 u-lh-16">
                  Password must be at least 10 characters.
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {devEnabled ? (
          <div className="u-mt-16">
            <div className="pill">Dev sign-in (local only)</div>
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
                className="btn btn-secondary"
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
      </section>
    </main>
  );
}
