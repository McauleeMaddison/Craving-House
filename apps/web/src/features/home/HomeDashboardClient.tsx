"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";

import { useCart } from "@/components/cart/CartContext";
import { normalizeCustomizations } from "@/lib/drink-customizations";
import { getFavoriteProductIds, onFavoritesUpdated } from "@/lib/favorites-storage";

type LoyaltyMe = {
  stamps: number;
  rewardsRedeemed: number;
  rewardStamps: number;
};

type OrderItemDto = {
  productId: string;
  qty: number;
  customizations?: unknown;
};

type OrderDto = {
  id: string;
  status: string;
  createdAtIso: string;
  paymentStatus?: string;
  items?: OrderItemDto[];
};

function formatOrderStatus(status: string) {
  switch (status) {
    case "received":
      return "Received";
    case "accepted":
    case "preparing":
      return "In progress";
    case "ready":
      return "Ready";
    case "collected":
    case "completed":
      return "Completed";
    case "canceled":
      return "Canceled";
    default:
      return status;
  }
}

function isActiveOrderStatus(status: string) {
  return status === "received" || status === "accepted" || status === "ready" || status === "preparing";
}

function isCompletedOrderStatus(status: string) {
  return status === "collected" || status === "completed";
}

type PrimaryCta =
  | {
      kind: "link";
      href: string;
      title: string;
      sub: string;
    }
  | {
      kind: "action";
      title: string;
      sub: string;
    };

export function HomeDashboardClient() {
  const router = useRouter();
  const { data, status } = useSession();
  const signedIn = status === "authenticated";
  const role = (data?.user as any)?.role as string | undefined;
  const isCustomer = !role || role === "customer";

  const { lines, add, clear } = useCart();
  const cartCount = useMemo(() => lines.reduce((sum, l) => sum + l.qty, 0), [lines]);

  const [loyalty, setLoyalty] = useState<LoyaltyMe | null>(null);
  const [orders, setOrders] = useState<OrderDto[]>([]);
  const [reordering, setReordering] = useState(false);
  const [reorderMessage, setReorderMessage] = useState("");
  const [favoritesCount, setFavoritesCount] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!signedIn) {
        setLoyalty(null);
        setOrders([]);
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
          setOrders(Array.isArray(json.orders) ? json.orders : []);
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

  useEffect(() => {
    function syncFavorites() {
      setFavoritesCount(getFavoriteProductIds().length);
    }
    syncFavorites();
    return onFavoritesUpdated(syncFavorites);
  }, []);

  const menuCardHint = useMemo(() => {
    if (cartCount > 0) {
      return `${cartCount} ${cartCount === 1 ? "item is" : "items are"} already in your cart.`;
    }
    if (favoritesCount > 0) {
      return `${favoritesCount} saved favorite${favoritesCount === 1 ? "" : "s"} ready for quick add.`;
    }
    return "Browse drinks, bites, and add-ons.";
  }, [cartCount, favoritesCount]);

  const latestOrder = useMemo(() => (orders.length > 0 ? orders[0] : null), [orders]);
  const activeOrder = useMemo(() => orders.find((order) => isActiveOrderStatus(order.status)) ?? null, [orders]);
  const lastCompletedOrder = useMemo(
    () => orders.find((order) => isCompletedOrderStatus(order.status) && (order.items?.length ?? 0) > 0) ?? null,
    [orders]
  );

  const loyaltyProgress = useMemo(() => {
    if (!signedIn || !loyalty || loyalty.rewardStamps <= 0) return null;
    const rewardReady = loyalty.stamps >= loyalty.rewardStamps;
    const towardReward = rewardReady ? loyalty.rewardStamps : loyalty.stamps % loyalty.rewardStamps;
    const pct = rewardReady ? 100 : Math.min(100, Math.round((towardReward / loyalty.rewardStamps) * 100));
    return {
      rewardReady,
      towardReward,
      remaining: rewardReady ? 0 : loyalty.rewardStamps - towardReward,
      pct
    };
  }, [signedIn, loyalty]);

  const primaryCta = useMemo<PrimaryCta>(() => {
    if (cartCount > 0) {
      return {
        kind: "link",
        href: "/cart",
        title: "View cart",
        sub: "Resume checkout with your current basket."
      };
    }
    if (signedIn && activeOrder) {
      return {
        kind: "link",
        href: `/orders/${activeOrder.id}`,
        title: "Track active order",
        sub: `Status: ${formatOrderStatus(activeOrder.status)}`
      };
    }
    if (signedIn && lastCompletedOrder) {
      return {
        kind: "action",
        title: "1-tap reorder",
        sub: "Rebuild your last completed order instantly."
      };
    }
    if (favoritesCount > 0) {
      return {
        kind: "link",
        href: "/menu?favorites=1",
        title: "Order favorites",
        sub: "Jump straight to your saved items."
      };
    }
    if (signedIn && loyaltyProgress?.rewardReady) {
      return {
        kind: "link",
        href: "/loyalty",
        title: "Claim free coffee",
        sub: "Your loyalty reward is ready now."
      };
    }
    return {
      kind: "link",
      href: "/menu",
      title: "Start an order",
      sub: "Browse menu + customise drinks."
    };
  }, [activeOrder, cartCount, favoritesCount, lastCompletedOrder, loyaltyProgress?.rewardReady, signedIn]);

  const orderCardHint = useMemo(() => {
    if (!signedIn) return "Track your orders and pickup status.";
    if (activeOrder) return `Active: ${formatOrderStatus(activeOrder.status)}`;
    if (latestOrder) return `Latest: ${formatOrderStatus(latestOrder.status)}`;
    return "No orders yet. Start your first order.";
  }, [activeOrder, latestOrder, signedIn]);

  const loyaltyCardHint = useMemo(() => {
    if (!signedIn || !loyalty) return "Get your personal QR card here.";
    if (loyaltyProgress?.rewardReady) return "Reward ready now. Redeem your free coffee.";
    return `${loyaltyProgress?.towardReward ?? 0}/${loyalty.rewardStamps} stamps to your free coffee.`;
  }, [loyalty, loyaltyProgress?.rewardReady, loyaltyProgress?.towardReward, signedIn]);

  function reorderLastCompletedOrder() {
    if (!lastCompletedOrder?.items?.length || reordering) return;
    setReorderMessage("");
    setReordering(true);

    clear();

    let itemCount = 0;
    for (const item of lastCompletedOrder.items) {
      const qty = Math.max(0, Math.round(Number(item.qty)));
      if (!item.productId || qty <= 0) continue;
      add(item.productId, qty, normalizeCustomizations(item.customizations ?? null));
      itemCount += qty;
    }

    if (itemCount <= 0) {
      setReorderMessage("That previous order can’t be reordered right now.");
      setReordering(false);
      return;
    }

    setReorderMessage(`${itemCount} ${itemCount === 1 ? "item was" : "items were"} added to your cart.`);
    setReordering(false);
    router.push("/checkout");
  }

  return (
    <>
      <div className="dashWidgets">
        <Link className="widgetCard" href="/menu">
          <div className="widgetTop">
            <div className="widgetTitle">Menu</div>
          </div>
          <div className="muted widgetHint">{menuCardHint}</div>
        </Link>

        <Link className="widgetCard" href={signedIn ? "/loyalty" : "/signin"}>
          <div className="widgetTop">
            <div className="widgetTitle">Loyalty</div>
          </div>
          <div className="muted widgetHint">{loyaltyCardHint}</div>
          {loyaltyProgress ? (
            <progress
              className="dashProgress"
              aria-hidden="true"
              value={Math.max(2, loyaltyProgress.pct)}
              max={100}
            />
          ) : null}
        </Link>

        {isCustomer ? (
          <Link className="widgetCard" href={signedIn ? "/orders" : "/signin"}>
            <div className="widgetTop">
              <div className="widgetTitle">Orders</div>
            </div>
            <div className="muted widgetHint">{orderCardHint}</div>
          </Link>
        ) : null}
      </div>

      <div className="dashCtas">
        {primaryCta.kind === "link" ? (
          <Link className="dashCtaPrimary" href={primaryCta.href}>
            <span>
              <span className="dashCtaPrimaryTitle">{primaryCta.title}</span>
              <span className="dashCtaPrimarySub muted">{primaryCta.sub}</span>
            </span>
            <span aria-hidden="true" className="dashArrow">
              →
            </span>
          </Link>
        ) : (
          <button
            className="dashCtaPrimary dashCtaPrimaryButton"
            type="button"
            onClick={reorderLastCompletedOrder}
            disabled={reordering}
          >
            <span>
              <span className="dashCtaPrimaryTitle">{reordering ? "Reordering..." : primaryCta.title}</span>
              <span className="dashCtaPrimarySub muted">{primaryCta.sub}</span>
            </span>
            <span aria-hidden="true" className="dashArrow">
              →
            </span>
          </button>
        )}

        <div className="dashCtaRow">
          <Link className="dashCtaSmall" href={signedIn ? "/loyalty" : "/signin"}>
            <span className="dashCtaSmallTitle">{loyaltyProgress?.rewardReady ? "Claim reward" : "My QR"}</span>
            <span aria-hidden="true" className="dashCtaSmallArrow">
              →
            </span>
          </Link>
          <Link className="dashCtaSmall" href={signedIn && activeOrder ? `/orders/${activeOrder.id}` : signedIn ? "/orders" : "/signin"}>
            <span className="dashCtaSmallTitle">{signedIn && activeOrder ? "Track active" : "Track order"}</span>
            <span aria-hidden="true" className="dashCtaSmallArrow">
              →
            </span>
          </Link>
          {favoritesCount > 0 ? (
            <Link className="dashCtaSmall" href="/menu?favorites=1">
              <span className="dashCtaSmallTitle">Favorites ({favoritesCount})</span>
              <span aria-hidden="true" className="dashCtaSmallArrow">
                →
              </span>
            </Link>
          ) : null}
        </div>
        {reorderMessage ? <p className="dashCtaMeta">{reorderMessage}</p> : null}
      </div>
    </>
  );
}
