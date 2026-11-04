import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  serverExternalPackages: ["sharp", "playwright-core"],
  experimental: { serverActions: { bodySizeLimit: "40mb" } },
  async headers() {
    return [
      {
        // pages intégrables dans l'iframe d'un site d'agence : pas de X-Frame-Options (le reste des en-têtes est conservé)
        source: "/:locale(fr|he|en)/embed/:path*",
        headers: [{ key: "X-Content-Type-Options", value: "nosniff" }, { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }, { key: "Content-Security-Policy", value: "frame-ancestors *" }],
      },
      {
        source: "/((?!fr/embed|he/embed|en/embed).*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(self), geolocation=(self)" },
        ],
      },
    ];
  },
};

export default withNextIntl(config);
