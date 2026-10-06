import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/teile/meine",
        "/teile/anfrage",
        "/teile/twint-freigabe",
        "/teile/bestaetigen",
        "/api",
      ],
    },
    ...(process.env.APP_ORIGIN
      ? { sitemap: `${process.env.APP_ORIGIN}/sitemap-teile.xml` }
      : {}),
  };
}
