import { GuestOrderDetailsClient } from "@/features/orders/GuestOrderDetailsClient";

export default async function GuestOrderDetailsPage({
  params
}: {
  params: Promise<{ guestToken: string }>;
}) {
  const { guestToken } = await params;
  return (
    <main className="container page">
      <GuestOrderDetailsClient guestToken={guestToken} />
    </main>
  );
}

