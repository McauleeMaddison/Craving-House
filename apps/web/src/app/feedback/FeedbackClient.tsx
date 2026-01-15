"use client";

import { useState } from "react";

export function FeedbackClient() {
  const [rating, setRating] = useState<number>(5);
  const [message, setMessage] = useState<string>("");
  const [status, setStatus] = useState<"idle" | "sent">("idle");

  function submit() {
    setStatus("sent");
    setMessage("");
    setTimeout(() => setStatus("idle"), 2200);
  }

  return (
    <section className="surface" style={{ padding: 18 }}>
      <h1 style={{ margin: 0, fontSize: 26 }}>Feedback</h1>
      <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
        Send feedback to help us improve. If you need a response, include your contact details in the message.
      </p>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <label style={{ display: "grid", gap: 8 }}>
          <span className="muted" style={{ fontSize: 13 }}>
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

        <label style={{ display: "grid", gap: 8 }}>
          <span className="muted" style={{ fontSize: 13 }}>
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

        <button className="btn" onClick={submit} disabled={!message.trim()}>
          Send feedback
        </button>

        {status === "sent" ? (
          <p className="muted" style={{ margin: 0 }}>
            Sent. Thank you.
          </p>
        ) : null}
      </div>
    </section>
  );
}
