import { store } from "@/lib/store";

export default function ContactPage() {
  const supportEmail = store.supportEmail;
  const hasSupportEmail = Boolean(supportEmail) && supportEmail !== "replace-me@example.com";

  return (
    <main className="container page">
      <section className="surface u-pad-18 u-maxw-900">
        <h1 className="u-title-26">Contact</h1>
        <p className="muted u-mt-10 u-lh-17 u-maxch-75">
          For help with orders, accessibility, or data requests, contact us using the details below.
        </p>

        <div className="surface surfaceFlat surfaceInset u-mt-14 u-pad-16">
          <div className="u-fw-900">{store.name}</div>
          <div className="muted u-mt-8 u-lh-17">
            {store.addressLine}
            <br />
            {store.postcodeLine}
            <br />
            <span>{store.openingHours.summary}</span>
            <br />
            <br />
            <div className="u-grid-gap-8">
              <div>
                <strong className="u-text">Email:</strong>{" "}
                {hasSupportEmail ? (
                  <a href={`mailto:${supportEmail}`} className="u-underline">
                    {supportEmail}
                  </a>
                ) : (
                  <span>
                    Set <code>NEXT_PUBLIC_SUPPORT_EMAIL</code> in your Render environment variables.
                  </span>
                )}
              </div>
            </div>
            <br />
            <a href="https://instagram.com/cravinghouseashford2025" target="_blank" rel="noreferrer">
              {store.instagramHandle}
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
