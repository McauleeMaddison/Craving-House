"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";

type LoyaltyMe = {
  stamps: number;
  rewardsRedeemed: number;
  rewardStamps: number;
};

type OrderDto = {
  id: string;
  status: string;
  createdAtIso: string;
};

function formatOrderStatus(status: string) {
  switch (status) {
    case "received":
      return "Received";
    case "preparing":
      return "Preparing";
    case "ready":
      return "Ready";
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}

export function HomeDashboardClient() {
  const { data, status } = useSession();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const isCustomer = !role || role === "customer";

  const { lines } = useCart();
  const cartCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines]);

  const [loyalty, setLoyalty] = useState<LoyaltyMe | null>(null);
  const [ordersCount, setOrdersCount] = useState<number | null>(null);
  const [latestOrder, setLatestOrder] = useState<OrderDto | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!signedIn) {
        setLoyalty(null);
        setOrdersCount(null);
        setLatestOrder(null);
        return;
      }

      try {
        const [loyaltyRes, ordersRes] = await Promise.all([
          fetch("/api/loyalty/me", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" })
        ]);

        if (!cancelled && loyaltyRes.ok) {
          setLoyalty((await loyaltyRes.json()) as LoyaltyMe);
        }

        if (!cancelled && ordersRes.ok) {
          const json = (await ordersRes.json()) as { orders: OrderDto[] };
          setOrdersCount(Array.isArray(json.orders) ? json.orders.length : 0);
          setLatestOrder(Array.isArray(json.orders) && json.orders.length > 0 ? json.orders[0] : null);
        }
      } catch {
        // ignore
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [signedIn]);

  return (
    <div className="dashWidgets">
      <Link className="widgetCard" href={cartCount > 0 ? "/cart" : "/menu"}>
        <div className="widgetTop">
          <div className="widgetTitle">Your cart</div>
          <div className="widgetValue">{cartCount > 0 ? `${cartCount}` : "—"}</div>
        </div>
        <div className="muted widgetHint">
          {cartCount > 0 ? "Items ready to checkout." : "Tap Menu to start an order."}
        </div>
      </Link>

      <Link className="widgetCard" href={signedIn ? "/loyalty" : "/signin"}>
        <div className="widgetTop">
          <div className="widgetTitle">Loyalty</div>
          <div className="widgetValue">
            {signedIn && loyalty ? `${loyalty.stamps % loyalty.rewardStamps}/${loyalty.rewardStamps}` : "Sign in"}
          </div>
        </div>
        <div className="muted widgetHint">
          {signedIn && loyalty
            ? "Show your QR at collection to collect beans."
            : "Sign in to get your personal QR card."}
        </div>
      </Link>

      {isCustomer ? (
        <Link className="widgetCard" href={signedIn ? "/orders" : "/signin"}>
          <div className="widgetTop">
            <div className="widgetTitle">Orders</div>
            <div className="widgetValue">{signedIn ? `${ordersCount ?? 0}` : "Sign in"}</div>
          </div>
          <div className="muted widgetHint">
            {signedIn
              ? latestOrder
                ? `Latest: ${formatOrderStatus(latestOrder.status)}`
                : "No orders yet."
              : "Sign in to track your orders."}
          </div>
        </Link>
      ) : null}
    </div>
  );
}

