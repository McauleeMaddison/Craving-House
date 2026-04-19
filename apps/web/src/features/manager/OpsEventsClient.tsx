"use client";

import { useEffect, useState } from "react";

import { apiGetJson } from "@/lib/api";

type OpsEventDto = {
  id: string;
  category: string;
  severity: "info" | "warning" | "critical";
  area: string;
  action: string | null;
  message: string;
  details: Record<string, unknown> | null;
  requestId: string | null;
  userId: string | null;
  createdAtIso: string;
};

type OpsEventsPayload = {
  summary24h: {
    apiErrors: number;
    criticalEvents: number;
    auditEvents: number;
  };
  events: OpsEventDto[];
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

function toSeverityLabel(severity: OpsEventDto["severity"]) {
  if (severity === "critical") return "Critical";
  if (severity === "warning") return "Warning";
  return "Info";
}

export function OpsEventsClient() {
  const [payload, setPayload] = useState<OpsEventsPayload | null>(null);
  const [error, setError] = useState("");

  async function refresh() {
    const result = await apiGetJson<OpsEventsPayload>("/api/manager/audit/events?limit=120");
    if (!result.ok) {
      setError(result.status === 401 ? "Sign in as manager." : result.error);
      setPayload(null);
      return;
    }
    setError("");
    setPayload(result.data);
  }

  useEffect(() => {
    void refresh();
  }, []);

  return (
    <>
      <section className="surface u-pad-18 u-mt-12">
        <div className="u-flex-between-wrap">
          <div>
            <h2 className="u-title-26">Operations events</h2>
            <p className="muted u-mt-10 u-lh-16">
              Recent API errors, critical incidents, and privileged actions.
            </p>
            {error ? (
              <p className="muted u-mt-10 u-danger">{error}</p>
            ) : null}
          </div>
          <button className="btn btn-secondary" type="button" onClick={() => void refresh()}>
            Refresh
          </button>
        </div>

        {payload ? (
          <div className="dashboardQuickChipRow u-mt-12">
            <span className="dashboardQuickChip dashboardQuickChipMuted">API errors (24h): {payload.summary24h.apiErrors}</span>
            <span className="dashboardQuickChip dashboardQuickChipMuted">Critical (24h): {payload.summary24h.criticalEvents}</span>
            <span className="dashboardQuickChip dashboardQuickChipMuted">Audit actions (24h): {payload.summary24h.auditEvents}</span>
          </div>
        ) : null}
      </section>

      <section className="u-mt-12 u-grid-gap-10">
        {!payload || payload.events.length === 0 ? (
          <div className="surface u-pad-16">
            <p className="muted u-m-0">No operations events yet.</p>
          </div>
        ) : (
          payload.events.map((event) => (
            <article key={event.id} className={`surface surfaceFlat u-pad-16 opsEventCard opsEventCard-${event.severity}`}>
              <div className="u-flex-between-wrap">
                <div className="u-fw-900">
                  [{event.category}] {event.message}
                </div>
                <div className="muted u-fs-13">{formatTime(event.createdAtIso)}</div>
              </div>
              <div className="muted u-mt-8 u-lh-16">
                Area: {event.area}
                {event.action ? ` • Action: ${event.action}` : ""}
                {event.userId ? ` • User: ${event.userId}` : ""}
                {event.requestId ? ` • Request: ${event.requestId}` : ""}
              </div>
              <div className="rowWrap u-mt-10">
                <span className="pill">{toSeverityLabel(event.severity)}</span>
              </div>
              {event.details ? (
                <details className="u-mt-10">
                  <summary className="muted u-fs-13">Details</summary>
                  <pre className="opsEventDetails">{JSON.stringify(event.details, null, 2)}</pre>
                </details>
              ) : null}
            </article>
          ))
        )}
      </section>
    </>
  );
}
