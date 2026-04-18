"use client";

import Link from "next/link";

export function HomeActionsClient() {
  return (
    <nav className="dashFooter dashFooterSingle" aria-label="Home quick actions">
      <Link className="btn btn-secondary" href="/help">
        Help
      </Link>
    </nav>
  );
}
