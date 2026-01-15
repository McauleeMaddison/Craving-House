"use client";

import { useState } from "react";

export function SetupClient(props: {
  isSignedIn: boolean;
  alreadyConfigured: boolean;
}) {
  const [setupCode, setSetupCode] = useState("");
  const [status, setStatus] = useState<
    "idle" | "submitting" | "success" | "error"
  >("idle");
  const [message, setMessage] = useState<string>("");

  async function submit() {
    setStatus("submitting");
    setMessage("");
    try {
      const res = await fetch("/api/setup/initial-manager", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ setupCode })
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Setup failed");
        return;
      }
      setStatus("success");
      setMessage("Manager access granted. Sign out and sign back in to refresh.");
    } catch {
      setStatus("error");
      setMessage("Setup failed");
    }
  }

  if (props.alreadyConfigured) {
    return (
      <p className="muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
        Setup is already completed. If you need another manager, promote users
        from <a href="/manager/users" style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Manager → Users</a>.
      </p>
    );
  }

  if (!props.isSignedIn) {
    return (
      <p className="muted" style={{ marginTop: 12, lineHeight: 1.7 }}>
        Sign in first, then come back here to enter the one-time setup code.
      </p>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <label className="muted" style={{ display: "block", fontSize: 13 }}>
        One-time setup code
      </label>
      <input
        className="input"
        value={setupCode}
        onChange={(e) => setSetupCode(e.target.value)}
        placeholder="Paste the code from your .env"
        style={{ marginTop: 8 }}
      />
      <button
        className="btn"
        onClick={submit}
        disabled={status === "submitting" || setupCode.trim().length === 0}
        style={{ marginTop: 12, opacity: status === "submitting" ? 0.7 : 1 }}
      >
        {status === "submitting" ? "Setting up..." : "Make me the first manager"}
      </button>
      {message ? (
        <p className="muted" style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>
          {message}
        </p>
      ) : null}
    </section>
  );
}
