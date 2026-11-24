import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Paths served by Rails (keep in sync with docker/Caddyfile). In production Caddy routes
// these; in development Next.js proxies them so the browser still sees a single origin and
// the API client can use the relative base URL /api/v1 with no CORS.
const RAILS_PATHS = ["/api/:path*", "/rails/active_storage/:path*"];

const nextConfig: NextConfig = {
  // Required by apps/web/Dockerfile: produces .next/standalone with a minimal server.js.
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    if (process.env.NODE_ENV !== "development") return [];
    const api = process.env.API_INTERNAL_URL ?? "http://127.0.0.1:4081";
    return RAILS_PATHS.map((source) => ({ source, destination: `${api}${source.replace("/:path*", "")}/:path*` }));
  },
};

export default createNextIntlPlugin("./src/i18n/request.ts")(nextConfig);
