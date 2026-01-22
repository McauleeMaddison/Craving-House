import { store } from "@/lib/store";

export default function TermsPage() {
  return (
    <main className="container page">
      <section className="surface u-pad-18 u-maxw-900">
        <h1 className="u-title-26">Terms</h1>
        <p className="muted u-mt-10 u-lh-17 u-maxch-78">
          By using this app, you agree to the terms below. These terms are written for a single-store, pay-in-store,
          order-ahead service.
        </p>

        <div className="u-mt-14 u-grid-gap-10 u-lh-17">
          <p className="muted u-m-0">
            <strong className="u-text">Orders:</strong> orders are for collection from{" "}
            <strong className="u-text">{store.addressLine}</strong>. We may adjust availability or substitute
            items if something sells out.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Payment:</strong> pay in store at collection unless otherwise stated.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Pickup times:</strong> estimates are based on prep times and current
            queue. They are estimates, not guarantees.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Loyalty:</strong>{" "}
            <strong className="u-text">{store.loyalty.headline}</strong>. {store.loyalty.finePrint} Stamps
            are granted by staff at collection time and are not self-awarded.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Abuse:</strong> do not attempt to fake loyalty stamps, scrape the app,
            or interfere with operations. We may disable accounts for misuse.
          </p>
        </div>
      </section>
    </main>
  );
}
