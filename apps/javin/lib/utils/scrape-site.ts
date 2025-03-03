import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";

const FIRECRAWL_API_KEY = process.env.FIRECRAWL_API_KEY;
const FIRECRAWL_API_ENDPOINT = process.env.FIRECRAWL_API_ENDPOINT;
if (!FIRECRAWL_API_KEY || !FIRECRAWL_API_ENDPOINT) {
  throw new Error(
    "Missing required environment variables: FIRECRAWL_API_KEY or FIRECRAWL_API_ENDPOINT"
  );
}

const app = new FirecrawlApp({ apiKey: FIRECRAWL_API_KEY });

export async function scrapeSite(linkToScrape: string) {
  try {
    console.log("scraping link : ", linkToScrape);

    const scrapeResult = (await app.scrapeUrl(linkToScrape, {
      formats: ["markdown", "links"],
    })) as ScrapeResponse;

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`);
    }

    console.log("scrapeResult.markdown----------------", scrapeResult.markdown);
    console.log("scrapeResult.links----------------", scrapeResult.links);
    return {
      pageContent: scrapeResult.markdown,
      pageLinks: scrapeResult.links,
    };
  } catch (error) {
    console.error("Error in scrapeSite:", error);
    throw error; // Re-throw to allow handling by the caller
  }
}
