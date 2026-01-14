import Link from "next/link";
import { store } from "@/lib/store";
import { LoyaltyQrClient } from "@/app/loyalty/LoyaltyQrClient";
import { LoyaltySummaryClient } from "@/app/loyalty/LoyaltySummaryClient";

export default function LoyaltyPage() {
  return (
    <main className="container" style={{ padding: "12px 0 30px" }}>
      <section className="surface" style={{ padding: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 26 }}>Loyalty card</h1>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              Buy 5 eligible coffees, get 1 coffee on us. Staff scan your QR after collection.
            </p>
          </div>
          <div className="pill">5 stamps = reward</div>
        </div>

        <section
          className="surface"
          style={{
            marginTop: 14,
            padding: 16,
            background: "rgba(212, 163, 115, 0.12)",
            borderColor: "rgba(212, 163, 115, 0.25)",
            boxShadow: "none"
          }}
        >
          <div style={{ fontWeight: 900, letterSpacing: -0.1 }}>{store.loyalty.headline}</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.6 }}>
            {store.loyalty.finePrint}
          </div>
        </section>

        <div className="grid-2" style={{ marginTop: 14 }}>
          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Your stamps</div>
            <LoyaltySummaryClient />
          </div>

          <div className="surface" style={{ padding: 16, background: "rgba(255,255,255,0.04)", boxShadow: "none" }}>
            <div style={{ fontWeight: 800 }}>Your QR (placeholder)</div>
            <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
              This is a signed, short-lived token. Next we’ll render it as a scannable QR code image.
            </div>
            <LoyaltyQrClient />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          <Link className="btn" href="/signin">
            Sign in to view
          </Link>
          <Link className="btn btn-secondary" href="/menu">
            Browse menu
          </Link>
        </div>
      </section>
    </main>
  );
}
