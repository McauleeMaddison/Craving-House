import { store } from "@/lib/store";

export default function TermsPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Terms</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7, maxWidth: "78ch" }}>
          By using this app, you agree to the terms below. These terms are written for a single-store, pay-in-store,
          order-ahead service.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10, lineHeight: 1.7 }}>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Orders:</strong> orders are for collection from{" "}
            <strong style={{ color: "var(--text)" }}>{store.addressLine}</strong>. We may adjust availability or substitute
            items if something sells out.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Payment:</strong> pay in store at collection unless otherwise stated.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Pickup times:</strong> estimates are based on prep times and current
            queue. They are estimates, not guarantees.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Loyalty:</strong>{" "}
            <strong style={{ color: "var(--text)" }}>{store.loyalty.headline}</strong>. {store.loyalty.finePrint} Stamps
            are granted by staff at collection time and are not self-awarded.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Abuse:</strong> do not attempt to fake loyalty stamps, scrape the app,
            or interfere with operations. We may disable accounts for misuse.
          </p>
        </div>
      </section>
    </main>
  );
}
