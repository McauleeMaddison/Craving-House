import Link from "next/link";

import { store } from "@/lib/store";

export default function HelpPage() {
  return (
    <main className="container page">
      <section className="surface helpHero" style={{ maxWidth: 980 }}>
        <div className="rowWrap">
          <span className="pill">Minimal</span>
          <span className="pill">Mobile-first</span>
          <span className="pill">Pay in store</span>
        </div>

        <h1 className="helpTitle" style={{ marginTop: 12 }}>
          Quick guide
        </h1>
        <p className="muted helpLead">
          Minimal steps to use the {store.name} web app.
        </p>

        <div className="grid-2 helpGrid">
          <div className="surface surfaceFlat helpCard">
            <div className="helpCardHeader">
              <div style={{ fontWeight: 900 }}>Customers</div>
              <span className="helpBadge">☕︎ Order</span>
            </div>
            <ol className="muted helpList">
              <li>
                Open <Link href="/menu">Menu</Link> and add items.
              </li>
              <li>
                Open <Link href="/cart">Cart</Link> and adjust quantities.
              </li>
              <li>
                Go to <Link href="/checkout">Checkout</Link> and place the order (pay
                in store).
              </li>
              <li>
                Track progress in <Link href="/orders">Orders</Link>.
              </li>
              <li>
                Open <Link href="/loyalty">Loyalty</Link> to show your QR at
                collection.
              </li>
            </ol>
          </div>

          <div className="surface surfaceFlat helpCard">
            <div className="helpCardHeader">
              <div style={{ fontWeight: 900 }}>Staff</div>
              <span className="helpBadge">✓ Queue</span>
            </div>
            <ol className="muted helpList">
              <li>Sign in (staff account).</li>
              <li>
                Open <Link href="/staff/orders">Order queue</Link> and update
                status.
              </li>
              <li>
                Open <Link href="/staff/loyalty-scan">Loyalty scan</Link>, scan
                customer QR, add stamps.
              </li>
            </ol>
            <p className="muted" style={{ marginTop: 10, lineHeight: 1.7 }}>
              Manager tasks live under <Link href="/manager">Manager</Link>.
            </p>
          </div>
        </div>

        <div className="surface surfaceFlat helpCard" style={{ maxWidth: 980 }}>
          <div className="helpCardHeader">
            <div style={{ fontWeight: 900 }}>Theme</div>
            <span className="helpBadge">◐ Toggle</span>
          </div>
          <p className="muted" style={{ marginTop: 10, lineHeight: 1.7, maxWidth: "70ch" }}>
            Light mode (poster yellow/black) is the default. Use the menu to
            toggle dark mode for a smokey black + yellow glow.
          </p>
        </div>

        <div className="helpFooter">
          <Link className="btn" href="/menu">
            Start ordering
          </Link>
          <Link className="btn btn-secondary" href="/">
            Back home
          </Link>
        </div>
      </section>
    </main>
  );
}
