import { OrderDetailsClient } from "@/features/orders/OrderDetailsClient";

export default async function OrderDetailsPage({
  params
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  return (
    <main className="container page pageCustomer">
      <OrderDetailsClient orderId={orderId} />
    </main>
  );
}
