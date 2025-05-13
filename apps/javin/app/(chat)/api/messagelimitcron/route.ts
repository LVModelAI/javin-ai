import { resetRemainingMessageCountForEveryone } from "@/lib/db/queries";
import * as Sentry from "@sentry/nextjs";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", {
      status: 401,
    });
  }
  try {
    await resetRemainingMessageCountForEveryone();
    return new Response("Success");
  } catch (error) {
    Sentry.captureException(error);
    console.log(error);
    return new Response("Failed to reset message count", {
      status: 500,
    });
  }
}
