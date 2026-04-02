import type { MetadataRoute } from "next";

import { getConfiguredPublicUrl } from "@/lib/public-url";

export default function robots(): MetadataRoute.Robots {
  const publicUrl = getConfiguredPublicUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: publicUrl ? `${publicUrl.origin}/sitemap.xml` : undefined,
    host: publicUrl?.host
  };
}
