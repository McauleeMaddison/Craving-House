"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type UserDto = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  disabledAtIso: string | null;
  createdAtIso: string;
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export function UsersClient() {
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState("");
  const [note, setNote] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<"customer" | "staff" | "manager">("staff");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [pwUserId, setPwUserId] = useState("");
  const [pwValue, setPwValue] = useState("");

  async function refresh() {
    setError("");
    const qs = q.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await apiGetJson<{ users: UserDto[] }>(`/api/manager/users${qs}`);
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in as manager." : res.error);
      setUsers([]);
      return;
    }
    setUsers(res.data.users);
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const total = users.length;
    const staff = users.filter((u) => u.role === "staff").length;
    const managers = users.filter((u) => u.role === "manager").length;
    const disabled = users.filter((u) => u.disabledAtIso).length;
    return { total, staff, managers, disabled };
  }, [users]);

  async function patch(userId: string, body: any) {
    setSavingId(userId);
    setError("");
    try {
      const res = await fetch(`/api/manager/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "Update failed");
        return;
      }
      await refresh();
    } finally {
      setSavingId("");
    }
  }

  async function createUser() {
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/manager/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: createEmail,
          name: createName,
          role: createRole,
          password: createPassword
        })
      });
      const json = (await res.json().catch(() => null)) as any;
      if (!res.ok) {
        setError(json?.error ?? "Create failed");
        return;
      }
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("");
      await refresh();
    } finally {
      setCreating(false);
    }
  }

  async function setPassword(userId: string) {
    if (!pwValue.trim()) return;
    await patch(userId, { newPassword: pwValue });
    setPwUserId("");
    setPwValue("");
  }

  return (
    <>
      <section className="surface u-pad-18">
        <div className="rowWrap u-justify-between">
          <div>
            <h1 className="u-title-26">Users & roles</h1>
            <p className="muted u-mt-10 u-lh-16">
              Search users, promote to staff, and disable accounts.
            </p>
            {error ? (
              <p className="muted u-mt-10 u-danger">
                {error}
              </p>
            ) : null}
          </div>
          <div className="rowWrap">
            <span className="pill">Total: {stats.total}</span>
            <span className="pill">Staff: {stats.staff}</span>
            <span className="pill">Managers: {stats.managers}</span>
            <span className="pill">Disabled: {stats.disabled}</span>
          </div>
        </div>

        <div className="grid-2 u-mt-12">
          <input
            className="input"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email or name…"
          />
          <button className="btn btn-secondary" onClick={refresh} type="button">
            Search
          </button>
        </div>

        <div className="surface surfaceInset u-pad-14 u-mt-12">
          <div className="u-fw-900">Create staff/manager account</div>
          <p className="muted u-mt-8 u-lh-16">
            Creates an email+password account immediately (no invite email). Share credentials securely.
          </p>
          <div className="grid-2 u-mt-10">
            <input
              className="input"
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              placeholder="Email"
              autoComplete="email"
            />
            <input className="input" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Name (optional)" />
          </div>
          <div className="grid-2 u-mt-10">
            <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as any)}>
              <option value="customer">customer</option>
              <option value="staff">staff</option>
              <option value="manager">manager</option>
            </select>
            <input
              className="input"
              value={createPassword}
              onChange={(e) => setCreatePassword(e.target.value)}
              placeholder="Temporary password (min 10 chars)"
              type="password"
              autoComplete="new-password"
            />
          </div>
          <button
            className="btn u-mt-10"
            type="button"
            onClick={createUser}
            disabled={creating || !createEmail.trim() || createPassword.trim().length < 10}
          >
            {creating ? "Creating…" : "Create account"}
          </button>
        </div>

        <label className="u-grid-gap-8 u-mt-12">
          <span className="muted u-fs-12">
            Note (stored on role changes)
          </span>
          <input
            className="input"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="e.g. New barista hired 2026-01-14"
          />
        </label>
      </section>

      <section className="u-mt-12 u-grid-gap-10">
        {users.map((u) => (
          <article key={u.id} className="surface surfaceFlat u-pad-16">
            <div className="u-flex-between-wrap">
              <div>
                <div className="u-fw-900">
                  {u.name || u.email || u.id}
                </div>
                <div className="muted u-mt-6 u-fs-13">
                  {u.email || "—"} • Created {formatDate(u.createdAtIso)}
                </div>
              </div>

              <div className="rowWrap">
                <span className="pill">Role: {u.role}</span>
                {u.disabledAtIso ? <span className="pill">Disabled</span> : <span className="pill">Active</span>}
              </div>
            </div>

            <div className="rowWrap u-mt-12">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => patch(u.id, { role: "customer", note })}
                disabled={savingId === u.id}
              >
                Make customer
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => patch(u.id, { role: "staff", note })}
                disabled={savingId === u.id}
              >
                Make staff
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  if (!confirm("Promote to manager? Only do this for trusted owners/operators.")) return;
                  void patch(u.id, { role: "manager", note });
                }}
                disabled={savingId === u.id}
              >
                Make manager
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => patch(u.id, { disabled: !u.disabledAtIso })}
                disabled={savingId === u.id}
              >
                {u.disabledAtIso ? "Re-enable" : "Disable"}
              </button>
            </div>

            <div className="surface surfaceInset u-pad-12 u-mt-12">
              <div className="u-fw-800">Password</div>
              {pwUserId === u.id ? (
                <>
                  <div className="grid-2 u-mt-10">
                    <input
                      className="input"
                      value={pwValue}
                      onChange={(e) => setPwValue(e.target.value)}
                      placeholder="New password (min 10 chars)"
                      type="password"
                      autoComplete="new-password"
                    />
                    <button className="btn" type="button" onClick={() => void setPassword(u.id)} disabled={savingId === u.id}>
                      Set password
                    </button>
                  </div>
                  <button className="btn btn-secondary u-mt-10" type="button" onClick={() => { setPwUserId(""); setPwValue(""); }}>
                    Cancel
                  </button>
                </>
              ) : (
                <button className="btn btn-secondary u-mt-10" type="button" onClick={() => setPwUserId(u.id)} disabled={savingId === u.id}>
                  Set / reset password
                </button>
              )}
            </div>
          </article>
        ))}
      </section>
    </>
  );
}
