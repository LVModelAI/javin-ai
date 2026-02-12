import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";

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
};

export default withSentryConfig(nextConfig, {
// For all available options, see:
// https://www.npmjs.com/package/@sentry/webpack-plugin#options

  org: "lvmodels",
  project: "javin-api",

// Only print logs for uploading source maps in CI
  silent: !process.env.CI,

// For all available options, see:
// https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

// Upload a larger set of source maps for prettier stack traces (increases build time)
  widenClientFileUpload: true,

// Route browser requests to Sentry through a Next.js rewrite to circumvent ad-blockers.
// This can increase your server load as well as your hosting bill.
// Note: Check that the configured route will not match with your Next.js middleware, otherwise reporting of client-
// side errors will fail.
  tunnelRoute: "/monitoring",

// Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

// Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
// See the following for more information:
// https://docs.sentry.io/product/crons/
// https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
});