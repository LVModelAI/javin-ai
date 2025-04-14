import { app } from "./firecrawlapp";
import * as Sentry from "@sentry/nextjs";

export async function crawlSite(linkToCrawl: string) {
  try {
    console.log("crawling link : ", linkToCrawl);

    const crawlResponse = await app.crawlUrl("https://firecrawl.dev", {
      limit: 100,
      scrapeOptions: {
        formats: ["markdown"],
      },
    });

    if (!crawlResponse.success) {
      throw new Error(`Failed to crawl: ${crawlResponse.error}`);
    }

    console.log(crawlResponse.data);
    return crawlResponse.data;
  } catch (error) {
    console.error("Error in crawlSite:", error);
    Sentry.captureException(error);
    throw error; // Re-throw to allow handling by the caller
  }
}
