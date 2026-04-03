import Link from "next/link";

import { MenuClient } from "@/features/menu/MenuClient";

export default function MenuPage() {
  return (
    <main className="container page">
      <div className="u-flex-between-wrap">
        <Link className="btn btn-secondary" href="/cart">
          Go to cart
        </Link>
      </div>
      <MenuClient />
    </main>
  );
}
