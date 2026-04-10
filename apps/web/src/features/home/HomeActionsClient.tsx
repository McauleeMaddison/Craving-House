"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";

import { store } from "@/lib/store";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

export function HomeActionsClient() {
  const { data, status } = useSession();
  const signedIn = status === "authenticated";

  const instagramUrl = `https://instagram.com/${store.instagramHandle.replace(/^@/, "")}`;

  return (
    <div className="dashFooter rowWrap">
      <Link className="btn btn-secondary" href="/help">
        Quick guide
      </Link>

      {signedIn ? (
        <Link className="btn" href="/loyalty" title="Account">
          My account
        </Link>
      ) : (
        <Link className="btn" href="/signin">
          Sign in
        </Link>
      )}

      <a
        className="btn btn-secondary btnIconOnly"
        href={instagramUrl}
        target="_blank"
        rel="noreferrer"
        aria-label={`Instagram: ${store.instagramHandle}`}
        title={store.instagramHandle}
      >
        <InstagramIcon size={18} />
      </a>
    </div>
  );
}
