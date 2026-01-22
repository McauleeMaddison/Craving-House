import { store } from "@/lib/store";

export default function PrivacyPage() {
  const supportEmail = store.supportEmail;
  const hasSupportEmail = Boolean(supportEmail) && supportEmail !== "replace-me@example.com";

  return (
    <main className="container page">
      <section className="surface u-pad-18 u-maxw-900">
        <h1 className="u-title-26">Privacy policy</h1>
        <p className="muted u-mt-10 u-lh-17 u-maxch-78">
          This policy explains what data we collect, why we collect it, and how you can request deletion.
        </p>

        <div className="u-mt-14 u-grid-gap-10 u-lh-17">
          <p className="muted u-m-0">
            <strong className="u-text">{store.name}</strong> uses this app to let customers order ahead and
            participate in loyalty rewards.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Data we store:</strong> your Google account identifier (used to sign
            you in), your orders (items, timestamps, status), and your loyalty stamp totals.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">How we use it:</strong> to operate the service (orders + pickup), to
            prevent fraud on loyalty stamps, and to support you if something goes wrong.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Sharing:</strong> we do not sell personal data. Access is restricted
            by staff/manager roles. We use third-party providers to run the app (hosting, database, and Google sign-in).
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Retention:</strong> we keep order and loyalty records so we can run
            the service. You can request deletion of your account data, subject to legal/accounting requirements.
          </p>
          <p className="muted u-m-0">
            <strong className="u-text">Contact:</strong>{" "}
            {hasSupportEmail ? (
              <a href={`mailto:${supportEmail}`} className="u-underline">
                {supportEmail}
              </a>
            ) : (
              <span>see the Contact page for the current support email.</span>
            )}
          </p>
        </div>
      </section>
    </main>
  );
}
