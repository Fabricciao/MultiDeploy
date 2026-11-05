import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";
import { join } from "node:path";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const prod = process.env.NODE_ENV === "production";
// CSP globale (production). 'unsafe-inline' reste nécessaire pour l'hydratation de Next sans nonce ; voir docs/SECURITY.md pour le durcissement par nonce.
const CSP = ["default-src 'self'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'", "img-src 'self' data: blob: https:", "font-src 'self' data:", "media-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co", "object-src 'none'", "base-uri 'self'", "form-action 'self' https://*.supabase.co https://accounts.google.com", "frame-ancestors 'none'"].join("; ");

const config: NextConfig = {
  reactStrictMode: true,
  // Sortie autonome pour l'image Docker (auto-hébergement) ; sans effet sur Vercel.
  output: "standalone",
  outputFileTracingRoot: join(process.cwd(), "..", ".."),
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
          ...(prod ? [{ key: "Content-Security-Policy", value: CSP }, { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }] : []),
        ],
      },
      { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] },
    ];
  },
};

export default withNextIntl(config);
