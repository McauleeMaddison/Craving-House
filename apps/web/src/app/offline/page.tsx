import Link from "next/link";

export default function OfflinePage() {
  return (
    <main className="container page pageCustomer">
      <section className="surface u-pad-18">
        <h1 className="u-title-26">You are offline</h1>
        <p className="muted u-mt-10 u-lh-16">
          This page is available while offline. Reconnect to load live menu, checkout, and order tracking updates.
        </p>
        <div className="rowWrap u-mt-12">
          <Link className="btn" href="/">
            Retry home
          </Link>
          <Link className="btn btn-secondary" href="/menu">
            Browse cached menu shell
          </Link>
        </div>
      </section>
    </main>
  );
}
