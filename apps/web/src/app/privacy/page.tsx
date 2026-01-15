import { store } from "@/lib/store";

export default function PrivacyPage() {
  const supportEmail = store.supportEmail;
  const hasSupportEmail = Boolean(supportEmail) && supportEmail !== "replace-me@example.com";

  return (
    <main className="container page">
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Privacy policy</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7, maxWidth: "78ch" }}>
          This policy explains what data we collect, why we collect it, and how you can request deletion.
        </p>

        <div style={{ marginTop: 14, display: "grid", gap: 10, lineHeight: 1.7 }}>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>{store.name}</strong> uses this app to let customers order ahead and
            participate in loyalty rewards.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Data we store:</strong> your Google account identifier (used to sign
            you in), your orders (items, timestamps, status), and your loyalty stamp totals.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>How we use it:</strong> to operate the service (orders + pickup), to
            prevent fraud on loyalty stamps, and to support you if something goes wrong.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Sharing:</strong> we do not sell personal data. Access is restricted
            by staff/manager roles. We use third-party providers to run the app (hosting, database, and Google sign-in).
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Retention:</strong> we keep order and loyalty records so we can run
            the service. You can request deletion of your account data, subject to legal/accounting requirements.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <strong style={{ color: "var(--text)" }}>Contact:</strong>{" "}
            {hasSupportEmail ? (
              <a href={`mailto:${supportEmail}`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                {supportEmail}
              </a>
            ) : (
              <span>see the Contact page for the current support email.</span>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
