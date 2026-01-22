import Link from "next/link";
import { getServerSession } from "next-auth";
import { store } from "@/lib/store";
import { LoyaltyQrClient } from "@/app/loyalty/LoyaltyQrClient";
import { LoyaltySummaryClient } from "@/app/loyalty/LoyaltySummaryClient";
import { authOptions } from "@/server/auth";

export default async function LoyaltyPage() {
  const session = await getServerSession(authOptions);
  const signedIn = Boolean(session?.user?.id);
  const displayName =
    (typeof session?.user?.name === "string" && session.user.name.trim()) ||
    (typeof session?.user?.email === "string" && session.user.email.split("@")[0]) ||
    "";

  return (
    <main className="container page">
      <section className="surface u-pad-18">
        <div className="u-flex-between-wrap">
          <div>
            <h1 className="u-title-26">Loyalty card</h1>
            <p className="muted u-mt-10 u-lh-16">
              Buy 5 eligible coffees, get 1 coffee on us. Staff scan your QR after collection.
            </p>
          </div>
          <div className="pill">5 stamps = reward</div>
        </div>

        <section className="surface loyaltyBanner">
          <div className="u-fw-900">{store.loyalty.headline}</div>
          <div className="muted u-mt-8 u-lh-16">
            {store.loyalty.finePrint}
          </div>
        </section>

          <div className="grid-2 u-mt-14">
            <div className="surface surfaceInset u-pad-16">
              <div className="u-fw-800">Your stamps</div>
              <LoyaltySummaryClient />
            </div>

            <div className="surface surfaceInset u-pad-16">
            <div className="u-fw-800">Your QR</div>
            <div className="muted u-mt-10 u-lh-16">
              This QR refreshes and is short-lived for security.
            </div>
            <LoyaltyQrClient />
          </div>
        </div>

        <div className="u-flex-wrap-gap-10 u-mt-14">
          {!signedIn ? (
            <Link className="btn" href="/signin">
              Sign in to view
            </Link>
          ) : (
            <div className="pill">Signed in as {displayName || "customer"}</div>
          )}
          <Link className="btn btn-secondary" href="/menu">
            Browse menu
          </Link>
          {signedIn ? (
            <Link className="btn btn-secondary" href="/orders">
              Track orders
            </Link>
          ) : null}
        </div>
      </section>
    </main>
  );
}
