"use client";

import { useEffect, useMemo, useState } from "react";

import { apiGetJson } from "@/lib/api";

type StaffOrderDto = {
  id: string;
  createdAtIso: string;
  status: "received" | "accepted" | "ready" | "collected" | "canceled";
};

type ProductDto = { id: string; available: boolean; loyaltyEligible: boolean };
type UserDto = { id: string; role: string; disabledAtIso: string | null };
type ManagerAnalyticsDto = {
  snapshotForDate: string;
  ordersToday: number;
  paidOrdersToday: number;
  conversionPct: number | null;
  liveQueueCount: number;
  avgPrepMinutes: number | null;
  loyaltyStampsToday: number;
  loyaltyRedemptionsToday: number;
};

function minutesSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

export function ManagerDashboardClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);
  const [analytics, setAnalytics] = useState<ManagerAnalyticsDto | null>(null);

  const [error, setError] = useState("");

  async function refresh() {
    const [o, p, u, a] = await Promise.all([
      apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders"),
      apiGetJson<{ products: ProductDto[] }>("/api/manager/products"),
      apiGetJson<{ users: UserDto[] }>("/api/manager/users"),
      apiGetJson<ManagerAnalyticsDto>("/api/manager/analytics/summary")
    ]);

    if (!o.ok) return setError(o.status === 401 ? "Sign in as manager." : o.error);
    if (!p.ok) return setError(p.status === 401 ? "Sign in as manager." : p.error);
    if (!u.ok) return setError(u.status === 401 ? "Sign in as manager." : u.error);

    setError("");
    setOrders(o.data.orders);
    setProducts(p.data.products);
    setUsers(u.data.users);
    setAnalytics(a.ok ? a.data : null);
  }

  useEffect(() => {
    void refresh();
  }, []);

  const orderStats = useMemo(() => {
    const received = orders.filter((o) => o.status === "received").length;
    const accepted = orders.filter((o) => o.status === "accepted").length;
    const ready = orders.filter((o) => o.status === "ready").length;
    const oldestIso = orders.length ? orders.map((o) => o.createdAtIso).sort()[0] : "";
    return { received, accepted, ready, oldestIso };
  }, [orders]);

  const productStats = useMemo(() => {
    const total = products.length;
    const active = products.filter((p) => p.available).length;
    const eligible = products.filter((p) => p.loyaltyEligible).length;
    return { total, active, eligible };
  }, [products]);

  const userStats = useMemo(() => {
    const total = users.length;
    const staff = users.filter((u) => u.role === "staff").length;
    const managers = users.filter((u) => u.role === "manager").length;
    const disabled = users.filter((u) => Boolean(u.disabledAtIso)).length;
    return { total, staff, managers, disabled };
  }, [users]);

  return (
    <section className="dashboardSection u-mt-12">
      {error ? <p className="muted u-danger">{error}</p> : null}

      <div className="dashboardStats dashboardStatsFour">
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Orders</div>
          <div className="dashboardStatValue">{orders.length}</div>
          <div className="dashboardStatHint">
            Oldest: {orderStats.oldestIso ? `${minutesSince(orderStats.oldestIso)} min ago` : "—"}
          </div>
        </div>
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Queue split</div>
          <div className="dashboardStatValue">{orderStats.received}</div>
          <div className="dashboardStatHint">
            {orderStats.accepted} accepted • {orderStats.ready} ready
          </div>
        </div>
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Menu</div>
          <div className="dashboardStatValue">{productStats.active}</div>
          <div className="dashboardStatHint">
            {productStats.total} total • {productStats.eligible} loyalty-eligible
          </div>
        </div>
        <div className="widgetCard dashboardStatCard">
          <div className="dashboardStatLabel">Team</div>
          <div className="dashboardStatValue">{userStats.total}</div>
          <div className="dashboardStatHint">
            {userStats.staff} staff • {userStats.managers} managers • {userStats.disabled} disabled
          </div>
        </div>
      </div>

      {analytics ? (
        <div className="dashboardStats dashboardStatsFour">
          <div className="widgetCard dashboardStatCard">
            <div className="dashboardStatLabel">Today orders</div>
            <div className="dashboardStatValue">{analytics.ordersToday}</div>
            <div className="dashboardStatHint">
              {analytics.paidOrdersToday} paid • {analytics.liveQueueCount} live queue
            </div>
          </div>
          <div className="widgetCard dashboardStatCard">
            <div className="dashboardStatLabel">Conversion</div>
            <div className="dashboardStatValue">
              {analytics.conversionPct === null ? "—" : `${analytics.conversionPct}%`}
            </div>
            <div className="dashboardStatHint">Paid orders / today orders</div>
          </div>
          <div className="widgetCard dashboardStatCard">
            <div className="dashboardStatLabel">Avg prep</div>
            <div className="dashboardStatValue">
              {analytics.avgPrepMinutes === null ? "—" : `${analytics.avgPrepMinutes}m`}
            </div>
            <div className="dashboardStatHint">Collected orders today</div>
          </div>
          <div className="widgetCard dashboardStatCard">
            <div className="dashboardStatLabel">Loyalty today</div>
            <div className="dashboardStatValue">{analytics.loyaltyRedemptionsToday}</div>
            <div className="dashboardStatHint">
              {analytics.loyaltyStampsToday} stamps • {analytics.loyaltyRedemptionsToday} redemptions
            </div>
          </div>
        </div>
      ) : null}

      <div className="dashboardRefreshRow">
        <button
          className="btn btn-secondary btnCompact"
          type="button"
          onClick={() => {
            setError("");
            void refresh();
          }}
        >
          Refresh stats
        </button>
      </div>
    </section>
  );
}
