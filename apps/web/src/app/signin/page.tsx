"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";

export default function SignInPage() {
  const devEnabled = process.env.NEXT_PUBLIC_DEV_AUTH_ENABLED === "true";
  const [devCode, setDevCode] = useState("");

  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18, maxWidth: 560 }}>
        <h1 style={{ fontSize: 26, margin: 0 }}>Sign in</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          Use Google. This keeps accounts secure (no passwords stored by you).
        </p>

        <div style={{ display: "grid", gap: 12, marginTop: 16 }}>
          <button className="btn btn-secondary" onClick={() => signIn("google")}>
            Continue with Google
          </button>
        </div>

        {devEnabled ? (
          <div style={{ marginTop: 16 }}>
            <div className="pill">Dev sign-in (local only)</div>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
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
              <p className="muted" style={{ margin: 0, fontSize: 12, lineHeight: 1.6 }}>
                Turn this off for real launch. It exists so you can see the app working before Google is configured.
              </p>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  );
}
