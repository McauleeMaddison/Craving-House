"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSession } from "next-auth/react";

import { store } from "@/lib/store";
import { InstagramIcon } from "@/components/icons/InstagramIcon";

export function HomeActionsClient() {
  const { data, status } = useSession();
  const signedIn = status === "authenticated";

  const displayName = useMemo(() => {
    const user = data?.user as any;
    const name = typeof user?.name === "string" ? user.name.trim() : "";
    const email = typeof user?.email === "string" ? user.email.trim() : "";
    if (name) return name;
    if (email) return email.split("@")[0] || "Account";
    return "Account";
  }, [data?.user]);

  const instagramUrl = useMemo(() => {
    return `https://instagram.com/${store.instagramHandle.replace(/^@/, "")}`;
  }, []);

  return (
    <div className="dashFooter rowWrap">
      <Link className="btn btn-secondary" href="/help">
        Quick guide
      </Link>

      {signedIn ? (
        <Link className="btn" href="/loyalty" title="Account">
          {displayName}
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

