import Link from "next/link";

import { store } from "@/lib/store";

export default function HelpPage() {
  return (
    <main className="container page pageCustomer">
      <section className="surface helpHero u-maxw-980">
        <div className="rowWrap">
          <span className="pill">Minimal</span>
          <span className="pill">Mobile-first</span>
          <span className="pill">Pay at checkout</span>
        </div>

        <h1 className="helpTitle u-mt-12">
          Quick guide
        </h1>
        <p className="muted helpLead">
          Minimal steps to use the {store.name} web app.
        </p>

        <div className="grid-2 helpGrid">
          <div className="surface surfaceFlat helpCard">
            <div className="helpCardHeader">
              <div className="u-fw-900">Customers</div>
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
                online).
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
              <div className="u-fw-900">Pickup & loyalty</div>
              <span className="helpBadge">✓ Collect</span>
            </div>
            <ol className="muted helpList">
              <li>
                After checkout, open <Link href="/orders">Orders</Link> to follow your status.
              </li>
              <li>
                When your order is ready, collect at the counter and show your QR from{" "}
                <Link href="/loyalty">Loyalty</Link>.
              </li>
              <li>
                Keep notifications enabled in <Link href="/orders">Orders</Link> to get live updates.
              </li>
            </ol>
          </div>
        </div>

        <div className="surface surfaceFlat helpCard u-maxw-980">
          <div className="helpCardHeader">
            <div className="u-fw-900">Theme</div>
            <span className="helpBadge">◐ Toggle</span>
          </div>
          <p className="muted u-mt-10 u-lh-17 u-maxch-70">
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
