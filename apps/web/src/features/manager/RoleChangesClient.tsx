"use client";

import { useEffect, useState } from "react";

import { apiGetJson } from "@/lib/api";

type RoleChangeDto = {
  id: string;
  createdAtIso: string;
  fromRole: string;
  toRole: string;
  note: string | null;
  by: { id: string; email: string | null; name: string | null };
  target: { id: string; email: string | null; name: string | null };
};

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function displayPerson(p: { name: string | null; email: string | null; id: string }) {
  return p.name || p.email || p.id;
}

export function RoleChangesClient() {
  const [changes, setChanges] = useState<RoleChangeDto[]>([]);
  const [error, setError] = useState("");

  async function refresh() {
    const res = await apiGetJson<{ changes: RoleChangeDto[] }>("/api/manager/role-changes?limit=150");
    if (!res.ok) {
      setError(res.status === 401 ? "Sign in as manager." : res.error);
      setChanges([]);
      return;
    }
    setError("");
    setChanges(res.data.changes);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Audit log</h1>
            <p className="muted u-mt-10 u-lh-16">
              Role changes are recorded when managers promote/demote users.
            </p>
            {error ? <p className="muted u-mt-10 u-danger">{error}</p> : null}
          </div>
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => {
              setError("");
              void refresh();
            }}
          >
            Refresh
          </button>
        </div>
      </section>

      <section className="u-mt-12 u-grid-gap-10">
        {changes.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">No entries yet.</p>
          </div>
        ) : (
          changes.map((c) => (
            <article key={c.id} className="surface surfaceFlat u-pad-16">
              <div className="u-flex-between-wrap">
                <div className="u-fw-900">
                  {c.fromRole} → {c.toRole}
                </div>
                <div className="muted u-fs-13">{formatTime(c.createdAtIso)}</div>
              </div>
              <div className="muted u-mt-8 u-lh-16">
                Target: {displayPerson(c.target)} • By: {displayPerson(c.by)}
              </div>
              {c.note ? (
                <div className="pill u-mt-10">
                  Note: {c.note}
                </div>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
