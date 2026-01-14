import { store } from "@/lib/store";

export default function PrivacyPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Privacy policy</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          Replace this page with your final privacy policy before launch.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10, lineHeight: 1.7 }}>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>{store.name}</strong> uses this app to let customers order ahead and
            participate in loyalty rewards.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Data we store typically includes: account identifier (Google), orders, and loyalty stamps.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            We do not sell personal data. Access is restricted by staff/manager roles.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            For questions or deletion requests, contact us via the details on the Contact page.
          </p>
        </div>
      </section>
    </main>
  );
}
