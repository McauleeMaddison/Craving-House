import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = process.env.NEXTAUTH_URL ?? "http://localhost:3000";
  const now = new Date();
  return [
    { url: `${baseUrl}/`, lastModified: now },
    { url: `${baseUrl}/menu`, lastModified: now },
    { url: `${baseUrl}/cart`, lastModified: now },
    { url: `${baseUrl}/checkout`, lastModified: now },
    { url: `${baseUrl}/loyalty`, lastModified: now },
    { url: `${baseUrl}/orders`, lastModified: now },
    { url: `${baseUrl}/feedback`, lastModified: now },
    { url: `${baseUrl}/signin`, lastModified: now },
    { url: `${baseUrl}/privacy`, lastModified: now },
    { url: `${baseUrl}/terms`, lastModified: now },
    { url: `${baseUrl}/contact`, lastModified: now }
  ];
}

