"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { store } from "@/lib/store";

function isAdminRole(role: unknown) {
  return role === "staff" || role === "manager";
}

export function AppFooter() {
  const pathname = usePathname();
  const isPortal = pathname?.startsWith("/staff") || pathname?.startsWith("/manager");
  const { data } = useSession();
  const role = (data?.user as any)?.role;
  const showAdmin = isAdminRole(role);

  if (isPortal) return null;

  const instagramUrl = `https://instagram.com/${store.instagramHandle.replace(/^@/, "")}`;

  return (
    <footer className="appFooter">
      <div className="container appFooterInner muted">
        <div className="appFooterRow">
          © {new Date().getFullYear()} {store.name} • {store.addressLine} • {store.postcodeLine}
        </div>
        <nav className="appFooterRow" aria-label="Footer">
          <a
            className="appFooterLink appFooterLinkIcon"
            href={instagramUrl}
            target="_blank"
            rel="noreferrer"
            aria-label={`Instagram: ${store.instagramHandle}`}
          >
            <span className="appFooterIcon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path
                  d="M7.2 2h9.6A5.2 5.2 0 0 1 22 7.2v9.6A5.2 5.2 0 0 1 16.8 22H7.2A5.2 5.2 0 0 1 2 16.8V7.2A5.2 5.2 0 0 1 7.2 2Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                />
                <path
                  d="M17.35 6.65h.01"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </svg>
            </span>
            <span>{store.instagramHandle}</span>
          </a>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/privacy">
            Privacy
          </Link>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/terms">
            Terms
          </Link>
          <span aria-hidden="true">•</span>
          <Link className="appFooterLink" href="/contact">
            Contact
          </Link>
          {showAdmin ? (
            <>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/staff">
                Staff
              </Link>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/manager">
                Manager
              </Link>
              <span aria-hidden="true">•</span>
              <Link className="appFooterLink" href="/setup">
                Setup
              </Link>
            </>
          ) : null}
        </nav>
      </div>
    </footer>
  );
}
