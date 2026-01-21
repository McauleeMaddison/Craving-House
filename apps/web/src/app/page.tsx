import { TutorialNudge } from "@/components/tutorial/TutorialNudge";
import { store } from "@/lib/store";
import Image from "next/image";
import Link from "next/link";
import { HomeDashboardClient } from "@/app/HomeDashboardClient";

export default function HomePage() {
  return (
    <main className="container page">
      <section className="surface dashHero">
        <div className="dashHeader">
          <div className="dashLogo" aria-hidden="true">
            <Image src="/ch-favicon.jpeg" alt="" width={56} height={56} priority />
          </div>
          <div className="dashTitleBlock">
            <div className="dashName">{store.name}</div>
            <div className="muted dashTagline">{store.tagline}</div>
          </div>
        </div>

        <div className="dashMeta rowScroll">
          <span className="pill">{store.openingHours.summary}</span>
          <span className="pill">Pay in store</span>
          <span className="pill">Buy 5 get 1 free</span>
        </div>

        <div className="dashLead">
          <div className="dashLeadTitle">Order ahead. Collect when ready.</div>
          <div className="muted dashLeadSub">
            Place your order for collection, then show your loyalty QR at pickup to earn beans.
          </div>
        </div>

        <HomeDashboardClient />

        <div className="dashActions">
          <Link className="actionCard actionPrimary" href="/menu">
            <span>
              <span className="actionTitle">Menu</span>
              <span className="actionSubtitle muted">Browse + build your order</span>
            </span>
            <span className="actionArrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link className="actionCard" href="/cart">
            <span>
              <span className="actionTitle">Cart</span>
              <span className="actionSubtitle muted">Review before checkout</span>
            </span>
            <span className="actionArrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link className="actionCard" href="/orders">
            <span>
              <span className="actionTitle">Orders</span>
              <span className="actionSubtitle muted">Live status timeline</span>
            </span>
            <span className="actionArrow" aria-hidden="true">
              →
            </span>
          </Link>
          <Link className="actionCard" href="/loyalty">
            <span>
              <span className="actionTitle">Loyalty</span>
              <span className="actionSubtitle muted">Show QR at collection</span>
            </span>
            <span className="actionArrow" aria-hidden="true">
              →
            </span>
          </Link>
        </div>

        <div className="dashFooter rowWrap">
          <Link className="btn btn-secondary" href="/help">
            Quick guide
          </Link>
          <Link className="btn" href="/signin">
            Sign in
          </Link>
          <a
            className="btn btn-secondary"
            href={`https://instagram.com/${store.instagramHandle}`}
            target="_blank"
            rel="noreferrer"
          >
            {store.instagramHandle}
          </a>
        </div>
      </section>

      <TutorialNudge />
    </main>
  );
}
