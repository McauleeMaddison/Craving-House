"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

import { AppHeader } from "@/components/nav/AppHeader";

function isPortal(pathname: string | null | undefined) {
  return Boolean(pathname && (pathname.startsWith("/staff") || pathname.startsWith("/manager")));
}

export function AppChrome() {
  const pathname = usePathname();
  const portal = isPortal(pathname);

  useEffect(() => {
    document.documentElement.dataset.shell = portal ? "portal" : "public";
    return () => {
      delete document.documentElement.dataset.shell;
    };
  }, [portal]);

  return <AppHeader />;
}
