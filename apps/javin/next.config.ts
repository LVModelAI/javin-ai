import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const KEYV_OPTIONAL_ADAPTER_PACKAGES = [
  "@keyv/redis",
  "@keyv/mongo",
  "@keyv/sqlite",
  "@keyv/postgres",
  "@keyv/mysql",
  "@keyv/etcd",
  "@keyv/offline",
  "@keyv/tiered",
] as const;

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@keyv/redis",
    "@keyv/mongo",
    "@keyv/sqlite",
    "@keyv/postgres",
    "@keyv/mysql",
    "@keyv/etcd",
    "@keyv/offline",
    "@keyv/tiered",
    "keyv",
    "cacheable-request",
    "got",
  ],
  webpack: (config, { isServer }) => {
    if (isServer) {
      const optionalAdapters = new Set<string>(KEYV_OPTIONAL_ADAPTER_PACKAGES);
      const existingExternals = config.externals ?? [];
      const externalsArray = Array.isArray(existingExternals)
        ? existingExternals
        : [existingExternals];

      config.externals = [
        ...externalsArray,
        (
          context: { request?: string },
          callback: (err?: unknown, result?: unknown) => void
        ) => {
          const request = context.request;
          if (request && optionalAdapters.has(request)) {
            return callback(null, `commonjs ${request}`);
          }
          callback();
        },
      ];
    }

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**", // Allows all external image sources
      },
    ],
  },
};

export default withSentryConfig(withBundleAnalyzer(nextConfig), {
  org: "lvmodel",
  project: "javascript-nextjs",
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: "/monitoring",
  disableLogger: true,
  automaticVercelMonitors: true,
});
