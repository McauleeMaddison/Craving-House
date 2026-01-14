import { store } from "@/lib/store";

export default function ContactPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18, maxWidth: 900 }}>
        <h1 style={{ margin: 0, fontSize: 26 }}>Contact</h1>
        <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
          Put your public support email/phone here before launch.
        </p>

        <div className="surface" style={{ marginTop: 14, padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
          <div style={{ fontWeight: 900 }}>{store.name}</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.7 }}>
            {store.addressLine}
            <br />
            {store.postcodeLine}
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

