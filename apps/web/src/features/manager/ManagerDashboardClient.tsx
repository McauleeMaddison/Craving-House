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

function minutesSince(iso: string) {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / 60000));
}

export function ManagerDashboardClient() {
  const [orders, setOrders] = useState<StaffOrderDto[]>([]);
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [users, setUsers] = useState<UserDto[]>([]);

  const [error, setError] = useState("");

  async function refresh() {
    const [o, p, u] = await Promise.all([
      apiGetJson<{ orders: StaffOrderDto[] }>("/api/staff/orders"),
      apiGetJson<{ products: ProductDto[] }>("/api/manager/products"),
      apiGetJson<{ users: UserDto[] }>("/api/manager/users")
    ]);

    if (!o.ok) return setError(o.status === 401 ? "Sign in as manager." : o.error);
    if (!p.ok) return setError(p.status === 401 ? "Sign in as manager." : p.error);
    if (!u.ok) return setError(u.status === 401 ? "Sign in as manager." : u.error);

    setError("");
    setOrders(o.data.orders);
    setProducts(p.data.products);
    setUsers(u.data.users);
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
    <section className="u-mt-12">
      {error ? <p className="muted u-danger">{error}</p> : null}

      <div className="grid-4">
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Orders</div>
          <div className="u-fw-900 u-fs-18 u-mt-6">{orders.length}</div>
          <div className="muted u-fs-12 u-mt-6">Active queue items</div>
        </div>
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Queue split</div>
          <div className="u-fw-900 u-fs-16 u-mt-6">
            {orderStats.received} received • {orderStats.accepted} accepted • {orderStats.ready} ready
          </div>
          <div className="muted u-fs-12 u-mt-6">
            Oldest: {orderStats.oldestIso ? `${minutesSince(orderStats.oldestIso)} min ago` : "—"}
          </div>
        </div>
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Menu</div>
          <div className="u-fw-900 u-fs-16 u-mt-6">
            {productStats.active}/{productStats.total} active
          </div>
          <div className="muted u-fs-12 u-mt-6">{productStats.eligible} loyalty-eligible</div>
        </div>
        <div className="surface surfaceInset u-pad-16">
          <div className="muted u-fs-12">Users</div>
          <div className="u-fw-900 u-fs-16 u-mt-6">
            {userStats.staff} staff • {userStats.managers} managers
          </div>
          <div className="muted u-fs-12 u-mt-6">{userStats.disabled} disabled</div>
        </div>
      </div>

      <div className="rowWrap u-mt-10">
        <button
          className="btn btn-secondary"
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
