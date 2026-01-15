import { OrderDetailsClient } from "@/app/orders/[orderId]/OrderDetailsClient";

export default async function OrderDetailsPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <main className="container page">
      <OrderDetailsClient orderId={orderId} />
    </main>
  );
}
