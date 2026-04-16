import { TutorialNudge } from "@/components/tutorial/TutorialNudge";
import { store } from "@/lib/store";
import { HomeDashboardClient } from "@/features/home/HomeDashboardClient";
import { HomeActionsClient } from "@/features/home/HomeActionsClient";

export default function HomePage() {
  return (
    <main className="container page pageHome">
      <section className="surface dashHero">
        <div className="dashMeta rowScroll">
          <span className="pill">{store.openingHours.summary}</span>
          <span className="pill">Pay securely online</span>
          <span className="pill">Buy 5 get 1 free</span>
        </div>

        <div className="dashLead">
          <div className="dashLeadTitle">Order ahead. Collect when ready.</div>
          <div className="muted dashLeadSub">
            Place your order for collection, then show your loyalty QR at pickup to earn stamps.
          </div>
        </div>

        <HomeDashboardClient />

        <HomeActionsClient />
      </section>

      <TutorialNudge />
    </main>
  );
}
