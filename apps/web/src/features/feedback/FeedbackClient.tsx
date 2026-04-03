"use client";

import { useState } from "react";

import { apiPostJson } from "@/lib/api";

export function FeedbackClient() {
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string>("");

  async function submit() {
    setStatus("sending");
    setError("");

    const res = await apiPostJson<{ ok: true }>("/api/feedback", { rating, message });
    if (!res.ok) {
      setStatus("error");
      setError(res.error);
      return;
    }

    setStatus("sent");
    setMessage("");
    setTimeout(() => setStatus("idle"), 2200);
  }

  return (
    <section className="surface u-pad-18">
      <h1 className="u-title-26">Feedback</h1>
      <p className="muted u-mt-10 u-lh-16">
        Send feedback to help us improve. If you need a response, include your contact details in the message.
      </p>

      <div className="u-mt-14 u-grid-gap-10">
        <label className="u-grid-gap-8">
          <span className="muted u-fs-13">
            Rating
          </span>
          <select
            className="input"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
            aria-label="Rating"
          >
            {[5, 4, 3, 2, 1].map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>

        <label className="u-grid-gap-8">
          <span className="muted u-fs-13">
            Message
          </span>
          <textarea
            className="input"
            rows={5}
            placeholder="Tell us what we can do better…"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            aria-label="Message"
          />
        </label>

        <button className="btn" onClick={submit} disabled={!message.trim() || status === "sending"}>
          {status === "sending" ? "Sending…" : "Send feedback"}
        </button>

        {status === "sent" ? (
          <p className="muted u-m-0">
            Sent. Thank you.
          </p>
        ) : null}

        {status === "error" ? (
          <p className="muted u-m-0 u-danger">
            {error || "Could not send feedback. Please try again."}
          </p>
        ) : null}
      </div>
    </section>
  );
}
