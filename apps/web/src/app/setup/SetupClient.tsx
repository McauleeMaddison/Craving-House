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
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Setup is already completed. If you need another manager, sign in as a
        manager and promote users from the manager dashboard (we’ll build this).
      </p>
    );
  }

  if (!props.isSignedIn) {
    return (
      <p style={{ marginTop: 12, opacity: 0.8 }}>
        Sign in first, then come back here to enter the one-time setup code.
      </p>
    );
  }

  return (
    <section style={{ marginTop: 16 }}>
      <label style={{ display: "block", fontSize: 13, opacity: 0.8 }}>
        One-time setup code
      </label>
      <input
        value={setupCode}
        onChange={(e) => setSetupCode(e.target.value)}
        placeholder="Paste the code from your .env"
        style={{
          marginTop: 8,
          width: "100%",
          padding: "12px 12px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.15)"
        }}
      />
      <button
        onClick={submit}
        disabled={status === "submitting" || setupCode.trim().length === 0}
        style={{
          marginTop: 12,
          padding: "12px 14px",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.12)",
          background: "black",
          color: "white",
          cursor: "pointer",
          opacity: status === "submitting" ? 0.7 : 1
        }}
      >
        {status === "submitting" ? "Setting up..." : "Make me the first manager"}
      </button>
      {message ? (
        <p style={{ marginTop: 10, fontSize: 13, opacity: 0.85 }}>{message}</p>
      ) : null}
    </section>
  );
}

