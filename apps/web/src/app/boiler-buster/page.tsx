import type { Metadata } from "next";

import { BoilerBusterClient } from "@/features/boiler-buster/BoilerBusterClient";

export const metadata: Metadata = {
  title: "Boiler Buster | Craving House",
  description: "A quick customer tap game to play while waiting for an order."
};

export default function BoilerBusterPage() {
  return (
    <main className="container page">
      <BoilerBusterClient />
    </main>
  );
}
