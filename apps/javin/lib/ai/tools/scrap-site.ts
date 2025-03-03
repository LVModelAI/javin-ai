import { scrapeSite } from "@/lib/utils/scrape-site";
import { tool } from "ai";
import { z } from "zod";

type FirecrawlData = {
  success: string;
  error: string;
  data: {
    markdown: string;
  };
  details: {
    code: string;
    message: string;
  };
};

export const getSiteContent = tool({
  description: "Scrap the website content.",
  parameters: z.object({
    linkToScrape: z.string().describe("Link to be scrapped."),
  }),
  execute: async ({ linkToScrape }) => {
    try {
      console.log("scraping link : ", linkToScrape);

      const response = await scrapeSite(linkToScrape);

      return response;
    } catch (error) {
      console.error("Error in getSiteContent:", error);
      return error; // Re-throw to allow handling by the caller
    }
  },
});
