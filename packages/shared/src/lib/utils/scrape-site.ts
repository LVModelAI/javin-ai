import FirecrawlApp, { ScrapeResponse } from "@mendable/firecrawl-js";
import * as Sentry from "@sentry/nextjs";

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

    // SCRAPING PREPARATION ==================================================
    let waitMilliseconds = 1; //cant put 0, as it will throw error
    if (linkToScrape.includes("solanacompass.com/statistics/staking")) {
      waitMilliseconds = 5000;
    }

    // MAIN SCRAPING LOGIC ==============================
    const scrapeResult = (await app.scrapeUrl(linkToScrape, {
      formats: ["markdown", "links"],
      actions: [{ type: "wait", milliseconds: waitMilliseconds }],
    })) as ScrapeResponse;

    if (!scrapeResult.success) {
      throw new Error(`Failed to scrape: ${scrapeResult.error}`);
    }

    // LINK SPECIFIC FILTERING FOR SCRAPED DATA ==============================
    if (
      scrapeResult.markdown &&
      linkToScrape.includes("solanacompass.com/statistics/staking")
    ) {
      // This is a hack for exclusing any text which comes after the second occurance of the text "Epoch History" in the markdown
      const keyword = "Epoch History";

      // find first occurrence
      const firstIndex = scrapeResult.markdown.indexOf(keyword);
      if (firstIndex !== -1) {
        // find second occurrence, starting just after the first keyword
        const secondIndex = scrapeResult.markdown.indexOf(
          keyword,
          firstIndex + keyword.length
        );
        if (secondIndex !== -1) {
          scrapeResult.markdown = scrapeResult.markdown.substring(
            0,
            secondIndex
          );
        }
      }
    }


    console.log("scrapeResult.markdown----------------", scrapeResult.markdown);
    console.log("scrapeResult.links----------------", scrapeResult.links);
    return {
      pageContent: scrapeResult.markdown,
      pageLinks: scrapeResult.links,
    };
  } catch (error) {
    console.error("Error in scrapeSite:", error);
    Sentry.captureException(error);
    throw error; // Re-throw to allow handling by the caller
  }
}
