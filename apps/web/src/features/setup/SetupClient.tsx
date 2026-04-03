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
      <p className="muted u-mt-12 u-lh-17">
        Setup is already completed. If you need another manager, promote users
        from{" "}
        <a href="/manager/users" className="u-underline">
          Manager → Users
        </a>
        .
      </p>
    );
  }

  if (!props.isSignedIn) {
    return (
      <p className="muted u-mt-12 u-lh-17">
        Sign in first, then come back here to enter the one-time setup code.
      </p>
    );
  }

  return (
    <section className="u-mt-16">
      <label className="muted u-block u-fs-13">
        One-time setup code
      </label>
      <input
        className="input u-mt-8"
        value={setupCode}
        onChange={(e) => setSetupCode(e.target.value)}
        placeholder="Paste the code from your .env"
      />
      <button
        className={`btn u-mt-12 ${status === "submitting" ? "setupSubmitSubmitting" : ""}`}
        onClick={submit}
        disabled={status === "submitting" || setupCode.trim().length === 0}
      >
        {status === "submitting" ? "Setting up..." : "Make me the first manager"}
      </button>
      {message ? (
        <p className="muted u-mt-10 u-fs-13 u-lh-17">
          {message}
        </p>
      ) : null}
    </section>
  );
}
