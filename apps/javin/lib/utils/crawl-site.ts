import FirecrawlApp from "@mendable/firecrawl-js";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;
if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
  throw new Error(
    "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
  );
}

const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

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
    throw error; // Re-throw to allow handling by the caller
  }
}
