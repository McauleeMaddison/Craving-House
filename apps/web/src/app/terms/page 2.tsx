import { store } from "@/lib/store";

export default function TermsPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Terms</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          Replace this page with your final terms before launch.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10, lineHeight: 1.7 }}>
          <p className="muted" style={{ margin: 0 }}>
            Orders are for collection from <strong style={{ color: "var(--text)" }}>{store.addressLine}</strong>. Payment is
            in store unless otherwise stated.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Loyalty: <strong style={{ color: "var(--text)" }}>{store.loyalty.headline}</strong>.{" "}
            {store.loyalty.finePrint}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            We may refuse service or cancel orders where necessary (e.g. items unavailable).
          </p>
        </div>
      </section>
    </main>
  );
}

