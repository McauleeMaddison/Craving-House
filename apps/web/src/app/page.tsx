import { TutorialNudge } from "@/components/tutorial/TutorialNudge";
import { store } from "@/lib/store";
import Image from "next/image";
import { HomeDashboardClient } from "@/app/HomeDashboardClient";
import { HomeActionsClient } from "@/app/HomeActionsClient";

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

        <HomeActionsClient />
      </section>

      <TutorialNudge />
    </main>
  );
}
