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
          </article>
        ))}
      </section>
    </>
  );
}
