import * as Sentry from "@sentry/nextjs";

export async function register() {
  await import("./sentry.server.config");
}

export const onRequestError = (err: unknown, req: Request) => {
  const url = req.url || "";

  const isLocalhost =
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("::1");

  if (isLocalhost) return;

  // Skip known AI quota error
  if (
    err instanceof Error &&
    err.name === "AI_RetryError" &&
    err.message.includes("You exceeded your current quota")
  ) {
    return;
  }

  Sentry.captureException(err);
};
