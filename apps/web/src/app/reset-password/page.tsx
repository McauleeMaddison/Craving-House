import { Suspense } from "react";

import { PasswordResetClient } from "@/features/auth/PasswordResetClient";

export default function ResetPasswordPage() {
  return (
    <main className="container page">
      <Suspense
        fallback={
          <section className="surface u-pad-18 u-maxw-560">
            <h1 className="u-title-26">Reset password</h1>
            <p className="muted u-mt-10 u-lh-16">Loading password reset form...</p>
          </section>
        }
      >
        <PasswordResetClient />
      </Suspense>
    </main>
  );
}
