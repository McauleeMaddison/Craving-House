"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type FeedbackDto = {
  id: string;
  createdAtIso: string;
  rating: number;
  message: string;
  user: { id: string; email: string | null; name: string | null } | null;
};

export function FeedbackListClient() {
  const [items, setItems] = useState<FeedbackDto[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      setStatus("loading");
      const res = await apiGetJson<{ feedback: FeedbackDto[] }>("/api/manager/feedback?limit=150");
      if (!mounted) return;
      if (!res.ok) {
        setStatus("error");
        setError(res.error);
        return;
      }
      setItems(res.data.feedback);
      setStatus("idle");
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const rows = useMemo(() => {
    return items.map((f) => {
      const createdAt = new Date(f.createdAtIso);
      const createdLabel = Number.isFinite(createdAt.getTime()) ? createdAt.toLocaleString() : f.createdAtIso;
      const from = f.user?.email || f.user?.name || "Anonymous";
      return { ...f, createdLabel, from };
    });
  }, [items]);

  return (
    <section className="surface u-pad-18">
      <h1 className="u-title-26">Feedback</h1>
      <p className="muted u-mt-10 u-lh-16">Latest customer feedback submitted from /feedback.</p>

      {status === "loading" ? <div className="pill u-mt-12">Loading…</div> : null}
      {status === "error" ? (
        <p className="muted u-mt-12 u-danger">
          {error || "Could not load feedback."}
        </p>
      ) : null}

      {status !== "error" ? (
        <div className="u-mt-14 u-grid-gap-10">
          {rows.length === 0 ? (
            <div className="pill">No feedback yet.</div>
          ) : (
            rows.map((f) => (
              <div key={f.id} className="surface surfaceInset u-pad-16">
                <div className="rowWrap u-justify-between">
                  <div className="u-fw-900">{f.from}</div>
                  <div className="pill">★ {f.rating}/5</div>
                </div>
                <div className="muted u-mt-8 u-fs-12">{f.createdLabel}</div>
                <p className="u-mt-10 u-mb-0 u-lh-17">{f.message}</p>
              </div>
            ))
          )}
        </div>
      ) : null}
    </section>
  );
}

