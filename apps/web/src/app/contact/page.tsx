import { store } from "@/lib/store";

export default function ContactPage() {
  const supportEmail = store.supportEmail;
  const hasSupportEmail = Boolean(supportEmail) && supportEmail !== "replace-me@example.com";

  return (
    <main className="container page">
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Contact</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7, maxWidth: "75ch" }}>
          For help with orders, accessibility, or data requests, contact us using the details below.
        </p>

        <div
          className="surface surfaceFlat"
          style={{ marginTop: 14, padding: 16, background: "rgba(255,255,255,0.04)" }}
        >
          <div style={{ fontWeight: 900 }}>{store.name}</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
            {store.addressLine}
            <br />
            {store.postcodeLine}
            <br />
            <span>{store.openingHours.summary}</span>
            <br />
            <br />
            <div style={{ display: "grid", gap: 8 }}>
              <div>
                <strong style={{ color: "var(--text)" }}>Email:</strong>{" "}
                {hasSupportEmail ? (
                  <a href={`mailto:${supportEmail}`} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>
                    {supportEmail}
                  </a>
                ) : (
                  <span>
                    Set <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> in your Render environment variables.
                  </span>
                )}
              </div>
            </div>
            <br />
            <a href="https://instagram.com/cravinghouseashford2025" target="_blank" rel="noreferrer">
              {store.instagramHandle}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
