import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// Security headers (Iranian market: E-Namad + Google reCAPTCHA allowed for
// future use; relaxed image sources for product image URLs)
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    // Nonce-free CSP (keeps static rendering + CDN caching; per Next docs).
    // img-src https:/data: for remote product images (ArvanCloud bucket);
    // connect-src https: lets the AI gateway point at any https endpoint.
    value: [
      "default-src 'self'",
      `script-src 'self' 'unsafe-inline'${
        process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : ""
      }`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' blob: data: https:",
      "font-src 'self' data:",
      `connect-src 'self' https:${process.env.NODE_ENV === "development" ? " ws:" : ""}`,
      "frame-ancestors 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  trailingSlash: false,
  // Standalone server.js for the VPS deploy (docs/DEPLOYMENT.md). Vercel
  // builds the app itself — standalone there breaks output tracing
  // (missing .next/next-server.js.nft.json) so it stays off on Vercel.
  ...(process.env.VERCEL ? {} : { output: "standalone" as const }),
  // Admin edits (homepage blocks, products, orders) must show up on the
  // storefront immediately — kill the client Router Cache's 30s hold on
  // dynamic pages so soft navigation always re-fetches fresh RSC payloads.
  experimental: {
    staleTimes: { dynamic: 0 },
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
    ],
  },
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default withNextIntl(nextConfig);
