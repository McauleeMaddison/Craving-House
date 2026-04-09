"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { apiGetJson } from "@/lib/api";

type UserDto = {
  id: string;
  name: string | null;
  email: string | null;
  role: string;
  disabledAtIso: string | null;
  createdAtIso: string;
};

type UserRole = "customer" | "staff" | "manager";

type UserPatchBody = {
  disabled?: boolean;
  newPassword?: string;
  note?: string;
  role?: UserRole;
};

type ApiErrorResponse = {
  error?: string;
} | null;

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function displayUserLabel(user: UserDto) {
  return user.name || user.email || user.id;
}

export function UsersClient() {
  const { data } = useSession();
  const currentUserId = (data?.user as { id?: string } | undefined)?.id ?? "";
  const [q, setQ] = useState("");
  const [roleFilter, setRoleFilter] = useState<"" | UserRole>("");
  const [statusFilter, setStatusFilter] = useState<"" | "active" | "disabled">("");
  const [users, setUsers] = useState<UserDto[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [savingId, setSavingId] = useState("");
  const [note, setNote] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createName, setCreateName] = useState("");
  const [createRole, setCreateRole] = useState<UserRole>("staff");
  const [createPassword, setCreatePassword] = useState("");
  const [creating, setCreating] = useState(false);
  const [pwUserId, setPwUserId] = useState("");
  const [pwValue, setPwValue] = useState("");

  async function refresh(overrides?: {
    q?: string;
    roleFilter?: "" | UserRole;
    statusFilter?: "" | "active" | "disabled";
  }) {
    setError("");
    const queryValue = overrides?.q ?? q;
    const roleValue = overrides?.roleFilter ?? roleFilter;
    const statusValue = overrides?.statusFilter ?? statusFilter;
    const qs = new URLSearchParams();
    if (queryValue.trim()) qs.set("q", queryValue.trim());
    if (roleValue) qs.set("role", roleValue);
    if (statusValue) qs.set("status", statusValue);
    const suffix = qs.size > 0 ? `?${qs.toString()}` : "";
    const res = await apiGetJson<{ users: UserDto[] }>(`/api/manager/users${suffix}`);
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in as manager." : res.error);
      setUsers([]);
      return;
    }
    setUsers(res.data.users);
  }

  function resetFilters() {
    const cleared = { q: "", roleFilter: "" as const, statusFilter: "" as const };
    setQ(cleared.q);
    setRoleFilter(cleared.roleFilter);
    setStatusFilter(cleared.statusFilter);
    setError("");
    setNotice("");
    void refresh(cleared);
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

  async function patch(userId: string, body: UserPatchBody) {
    setSavingId(userId);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/manager/users/${userId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body)
      });
      const json = (await res.json().catch(() => null)) as ApiErrorResponse;
      if (!res.ok) {
        setError(json?.error ?? "Update failed");
        return;
      }
      await refresh();
      const updatedUser = users.find((user) => user.id === userId);
      setNotice(`Updated ${updatedUser ? displayUserLabel(updatedUser) : "account"}.`);
    } finally {
      setSavingId("");
    }
  }

  async function createUser() {
    setCreating(true);
    setError("");
    setNotice("");
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
      const json = (await res.json().catch(() => null)) as ApiErrorResponse;
      if (!res.ok) {
        setError(json?.error ?? "Create failed");
        return;
      }
      setCreateEmail("");
      setCreateName("");
      setCreatePassword("");
      await refresh();
      setNotice(`Created ${createRole} account for ${createEmail.trim().toLowerCase()}.`);
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
              <p className="muted u-mt-10 u-danger" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="muted u-mt-10" aria-live="polite">
                {notice}
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
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Search users</span>
            <input
              className="input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search by email or name…"
            />
          </label>
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Role filter</span>
            <select className="input" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as "" | UserRole)}>
              <option value="">All roles</option>
              <option value="customer">customer</option>
              <option value="staff">staff</option>
              <option value="manager">manager</option>
            </select>
          </label>
        </div>

        <div className="grid-2 u-mt-10">
          <label className="u-grid-gap-8">
            <span className="muted u-fs-12">Status filter</span>
            <select
              className="input"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "" | "active" | "disabled")}
            >
              <option value="">All statuses</option>
              <option value="active">active</option>
              <option value="disabled">disabled</option>
            </select>
          </label>
          <div className="u-flex-wrap-gap-10">
            <button className="btn btn-secondary" onClick={() => void refresh()} type="button">
              Apply filters
            </button>
            <button className="btn btn-secondary" onClick={resetFilters} type="button">
              Reset
            </button>
          </div>
        </div>

        <div className="surface surfaceInset u-pad-14 u-mt-12">
          <div className="u-fw-900">Create staff/manager account</div>
          <p className="muted u-mt-8 u-lh-16">
            Creates an email+password account immediately (no invite email). Share credentials securely.
          </p>
          <div className="grid-2 u-mt-10">
            <label className="u-grid-gap-8">
              <span className="muted u-fs-12">Email</span>
              <input
                className="input"
                value={createEmail}
                onChange={(e) => setCreateEmail(e.target.value)}
                placeholder="Email"
                autoComplete="email"
              />
            </label>
            <label className="u-grid-gap-8">
              <span className="muted u-fs-12">Name</span>
              <input className="input" value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="Name (optional)" />
            </label>
          </div>
          <div className="grid-2 u-mt-10">
            <label className="u-grid-gap-8">
              <span className="muted u-fs-12">Role</span>
              <select className="input" value={createRole} onChange={(e) => setCreateRole(e.target.value as UserRole)}>
                <option value="customer">customer</option>
                <option value="staff">staff</option>
                <option value="manager">manager</option>
              </select>
            </label>
            <label className="u-grid-gap-8">
              <span className="muted u-fs-12">Temporary password</span>
              <input
                className="input"
                value={createPassword}
                onChange={(e) => setCreatePassword(e.target.value)}
                placeholder="Temporary password (min 9 chars)"
                type="password"
                autoComplete="new-password"
              />
            </label>
          </div>
          <button
            className="btn u-mt-10"
            type="button"
            onClick={createUser}
            disabled={creating || !createEmail.trim() || createPassword.trim().length < 9}
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
        {users.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">No users match the current filters.</p>
          </div>
        ) : null}
        {users.map((u) => (
          <article key={u.id} className="surface surfaceFlat u-pad-16">
            {(() => {
              const isCurrentManager = u.id === currentUserId;
              const roleActionDisabled = savingId === u.id || isCurrentManager;
              const disableActionLabel = u.disabledAtIso ? "Re-enable" : "Disable";
              return (
                <>
            <div className="u-flex-between-wrap">
              <div>
                <div className="u-fw-900">
                  {displayUserLabel(u)}
                </div>
                <div className="muted u-mt-6 u-fs-13">
                  {u.email || "—"} • Created {formatDate(u.createdAtIso)}
                </div>
              </div>

              <div className="rowWrap">
                {isCurrentManager ? <span className="pill">You</span> : null}
                <span className="pill">Role: {u.role}</span>
                {u.disabledAtIso ? <span className="pill">Disabled</span> : <span className="pill">Active</span>}
              </div>
            </div>

            <div className="rowWrap u-mt-12">
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => patch(u.id, { role: "customer", note })}
                disabled={roleActionDisabled || u.role === "customer"}
              >
                Make customer
              </button>
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => patch(u.id, { role: "staff", note })}
                disabled={roleActionDisabled || u.role === "staff"}
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
                disabled={roleActionDisabled || u.role === "manager"}
              >
                Make manager
              </button>
              <button
                className="btn btn-danger"
                type="button"
                onClick={() => {
                  if (!confirm(`${disableActionLabel} this account?`)) return;
                  void patch(u.id, { disabled: !u.disabledAtIso });
                }}
                disabled={roleActionDisabled}
              >
                {disableActionLabel}
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
                      placeholder="New password (min 9 chars)"
                      type="password"
                      autoComplete="new-password"
                    />
                    <button
                      className="btn"
                      type="button"
                      onClick={() => void setPassword(u.id)}
                      disabled={savingId === u.id || pwValue.trim().length < 9}
                    >
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
                </>
              );
            })()}
          </article>
        ))}
      </section>
    </>
  );
}
