import { BrandLockup } from "@/components/brand/BrandLockup";
import { TutorialNudge } from "@/components/tutorial/TutorialNudge";
import { store } from "@/lib/store";

export default function HomePage() {
  return (
    <main className="container page">
      <section className="surface hero">
        <div className="rowWrap">
          <span className="pill">Mobile-first</span>
          <span className="pill">Pay in store</span>
          <span className="pill">Buy 5 get 1 free</span>
        </div>

        <div>
          <BrandLockup size="lg" />
        </div>

        <h1 className="heroTitle">Order ahead. Collect when ready.</h1>
        <p className="muted heroSubtitle">
          {store.tagline} — order ahead for collection and earn loyalty stamps (buy 5 eligible coffees, get 1 free).
        </p>

        <div className="rowWrap">
          <a className="btn" href="/menu">
            Browse menu
          </a>
          <a className="btn btn-secondary" href="/loyalty">
            Loyalty card
          </a>
          <a className="btn btn-secondary" href="/signin">
            Sign in
          </a>
          <a className="btn btn-secondary" href="/help">
            Quick guide
          </a>
        </div>

        <div className="rowWrap">
          <span className="pill">
            {store.addressLine} • {store.postcodeLine}
          </span>
          <span className="pill">{store.openingHours.summary}</span>
          <a
            className="pill"
            href={`https://instagram.com/${store.instagramHandle}`}
            target="_blank"
            rel="noreferrer"
          >
            {store.instagramHandle}
          </a>
        </div>
      </section>

      <section className="grid-3 cards">
        <article className="surface surfaceFlat card">
          <h2 className="cardTitle">Customer</h2>
          <p className="muted cardBody">
            Menu → Cart → Order ahead → Pickup updates → Loyalty stamps.
          </p>
        </article>
        <article className="surface surfaceFlat card">
          <h2 className="cardTitle">Staff</h2>
          <p className="muted cardBody">
            Order queue + status updates + scan customer QR to add stamps.
          </p>
        </article>
        <article className="surface surfaceFlat card">
          <h2 className="cardTitle">Manager</h2>
          <p className="muted cardBody">
            Manage menu, prep times, loyalty eligibility, staff access, and feedback moderation.
          </p>
        </article>
      </section>

      <TutorialNudge />
    </main>
  );
}
