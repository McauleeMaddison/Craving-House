"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

type Status = { enabled: boolean; pending: boolean };

export function ManagerMfaClient() {
  const [status, setStatus] = useState<Status>({ enabled: false, pending: false });
  const [loading, setLoading] = useState(true);
  const [setup, setSetup] = useState<{ secretBase32: string; qrUrl: string } | null>(null);
  const [code, setCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"" | "setup" | "enable" | "disable">("");

  async function refresh() {
    const res = await fetch("/api/manager/mfa/totp/status", { cache: "no-store" });
    const json = (await res.json().catch(() => null)) as any;
    if (!res.ok) throw new Error(json?.error ?? "Could not load status");
    setStatus({ enabled: Boolean(json?.enabled), pending: Boolean(json?.pending) });
  }

  useEffect(() => {
    void (async () => {
      try {
        await refresh();
      } catch (e: any) {
        setError(String(e?.message ?? "Could not load status"));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  async function startSetup() {
    setBusy("setup");
    setError("");
    setSetup(null);
    try {
      const res = await fetch("/api/manager/mfa/totp/setup", { method: "POST" });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.error ?? "Setup failed");
      setSetup({ secretBase32: String(json.secretBase32 ?? ""), qrUrl: String(json.qrUrl ?? "") });
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Setup failed"));
    } finally {
      setBusy("");
    }
  }

  async function enable() {
    setBusy("enable");
    setError("");
    try {
      const res = await fetch("/api/manager/mfa/totp/enable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code })
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.error ?? "Enable failed");
      setCode("");
      setSetup(null);
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Enable failed"));
    } finally {
      setBusy("");
    }
  }

  async function disable() {
    setBusy("disable");
    setError("");
    try {
      const res = await fetch("/api/manager/mfa/totp/disable", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ code: disableCode })
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) throw new Error(json?.error ?? "Disable failed");
      setDisableCode("");
      setSetup(null);
      await refresh();
    } catch (e: any) {
      setError(String(e?.message ?? "Disable failed"));
    } finally {
      setBusy("");
    }
  }

  if (loading) {
    return (
      <div className="surface surfaceInset u-pad-16 u-mt-14">
        <div className="u-fw-900">Security</div>
        <p className="muted u-mt-8 u-lh-16">Loading…</p>
      </div>
    );
  }

  return (
    <div className="surface surfaceInset u-pad-16 u-mt-14">
      <div className="u-flex-between-wrap">
        <div>
          <div className="u-fw-900">Security</div>
          <p className="muted u-mt-8 u-lh-16">
            Enable 2FA for manager sign-in using an authenticator app (TOTP).
          </p>
        </div>
        <span className="pill">{status.enabled ? "2FA Enabled" : status.pending ? "2FA Setup pending" : "2FA Off"}</span>
      </div>

      {error ? <p className="muted u-danger u-mt-10">{error}</p> : null}

      {!status.enabled ? (
        <>
          <div className="u-flex-wrap-gap-10 u-mt-10">
            <button className="btn" type="button" onClick={() => void startSetup()} disabled={busy !== ""}>
              {busy === "setup" ? "Generating…" : setup ? "Regenerate secret" : "Set up 2FA"}
            </button>
          </div>

          {setup ? (
            <div className="u-mt-12 u-grid-gap-10">
              <div className="u-fw-800">1) Scan QR</div>
              <div className="rowWrap">
                <Image alt="Authenticator QR code" src={setup.qrUrl} width={220} height={220} />
              </div>
              <div className="muted u-fs-12 u-lh-16">
                If you can’t scan, use this secret in your authenticator app: <code>{setup.secretBase32}</code>
              </div>

              <div className="u-fw-800">2) Enter code to enable</div>
              <div className="grid-2">
                <input
                  className="input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="6-digit code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                />
                <button className="btn" type="button" onClick={() => void enable()} disabled={busy !== "" || code.trim().length === 0}>
                  {busy === "enable" ? "Enabling…" : "Enable 2FA"}
                </button>
              </div>
              <p className="muted u-m-0 u-fs-12 u-lh-16">
                After enabling, manager sign-in will require email + password + authenticator code.
              </p>
            </div>
          ) : (
            <p className="muted u-mt-10 u-fs-12 u-lh-16">
              Use Google Authenticator, Microsoft Authenticator, 1Password, or any TOTP app.
            </p>
          )}
        </>
      ) : (
        <div className="u-mt-12 u-grid-gap-10">
          <div className="u-fw-800">Disable 2FA</div>
          <p className="muted u-m-0 u-fs-12 u-lh-16">
            Enter a current authenticator code to disable 2FA for your manager account.
          </p>
          <div className="grid-2">
            <input
              className="input"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value)}
              placeholder="6-digit code"
              inputMode="numeric"
              autoComplete="one-time-code"
            />
            <button className="btn btn-danger" type="button" onClick={() => void disable()} disabled={busy !== "" || disableCode.trim().length === 0}>
              {busy === "disable" ? "Disabling…" : "Disable 2FA"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

