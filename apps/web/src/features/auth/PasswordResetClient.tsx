"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

type PasswordResetRequestResponse = {
  debugResetUrl?: string;
  error?: string;
  message?: string;
  ok?: boolean;
} | null;

type PasswordResetConfirmResponse = {
  error?: string;
  ok?: boolean;
} | null;

export function PasswordResetClient() {
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const hasToken = Boolean(emailFromQuery && token);

  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [debugResetUrl, setDebugResetUrl] = useState("");

  const helperText = useMemo(() => {
    if (hasToken) return "Choose a new password for your account.";
    return "Enter the email for your account and we'll send you a reset link.";
  }, [hasToken]);

  async function requestReset() {
    setSubmitting(true);
    setError("");
    setNotice("");
    setDebugResetUrl("");
    try {
      const res = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() })
      });
      const json = (await res.json().catch(() => null)) as PasswordResetRequestResponse;
      if (!res.ok) {
        setError(json?.error || json?.message || "Unable to start password reset right now.");
        return;
      }
      setNotice(json?.message || "If that email can be reset, we'll send a link shortly.");
      if (json?.debugResetUrl) setDebugResetUrl(json.debugResetUrl);
    } catch {
      setError("Unable to start password reset right now.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReset() {
    setSubmitting(true);
    setError("");
    setNotice("");
    if (password !== confirmPassword) {
      setSubmitting(false);
      setError("Passwords do not match.");
      return;
    }
    try {
      const res = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: emailFromQuery, token, password })
      });
      const json = (await res.json().catch(() => null)) as PasswordResetConfirmResponse;
      if (!res.ok) {
        setError(json?.error || "Unable to reset password right now.");
        return;
      }
      setNotice("Your password has been reset. You can sign in with the new password now.");
      setPassword("");
      setConfirmPassword("");
    } catch {
      setError("Unable to reset password right now.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="surface u-pad-18 u-maxw-560">
      <h1 className="u-title-26">{hasToken ? "Choose a new password" : "Reset password"}</h1>
      <p className="muted u-mt-10 u-lh-16">{helperText}</p>

      <div className="u-grid-gap-10 u-mt-16">
        {!hasToken ? (
          <>
            <label className="u-grid-gap-8">
              <span className="muted u-fs-13">Email</span>
              <input
                className="input"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                type="email"
                autoComplete="email"
              />
            </label>
            <button className="btn" type="button" onClick={() => void requestReset()} disabled={submitting || !email.trim()}>
              {submitting ? "Sending..." : "Send reset link"}
            </button>
          </>
        ) : (
          <>
            <div className="pill">Resetting password for {emailFromQuery}</div>
            <label className="u-grid-gap-8">
              <span className="muted u-fs-13">New password</span>
              <input
                className="input"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 9 characters"
                type="password"
                autoComplete="new-password"
              />
            </label>
            <label className="u-grid-gap-8">
              <span className="muted u-fs-13">Confirm new password</span>
              <input
                className="input"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repeat your new password"
                type="password"
                autoComplete="new-password"
              />
            </label>
            <button
              className="btn"
              type="button"
              onClick={() => void confirmReset()}
              disabled={submitting || password.trim().length < 9 || confirmPassword.trim().length < 9}
            >
              {submitting ? "Resetting..." : "Reset password"}
            </button>
          </>
        )}

        {error ? (
          <p className="muted u-danger u-m-0" role="alert">
            {error}
          </p>
        ) : null}
        {notice ? (
          <div className="pill" aria-live="polite">
            {notice}
          </div>
        ) : null}
        {debugResetUrl && !hasToken ? (
          <Link className="btn btn-secondary" href={debugResetUrl}>
            Open debug reset link
          </Link>
        ) : null}
        <p className="muted u-m-0 u-fs-12 u-lh-16">
          <Link className="u-underline" href="/signin">
            Back to sign in
          </Link>
        </p>
      </div>
    </section>
  );
}
