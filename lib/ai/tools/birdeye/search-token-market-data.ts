import { tool } from "ai";
import { z } from "zod";

export const searchTokenMarketData = tool({
  description:
    "Search for token and market data for any chain providing specific token address or market address",
  parameters: z.object({
    chain: z.string().default("all").describe("Blockchain network to query"),
    keyword: z.string().describe("Token  address to search for"),
    target: z
      .string()
      .default("token")
      .describe("Search target type (token, market, etc.)"),
    sort_by: z
      .string()
      .default("price")
      .describe("Sort results by (e.g., price, volume_24h_usd)"),
    sort_type: z
      .string()
      .default("desc")
      .describe("Sorting order (asc or desc)"),
    verify_token: z
      .boolean()
      .optional()
      .describe("Filter for verified tokens (Solana only)"),
    markets: z
      .string()
      .optional()
      .describe("Comma-separated list of markets to filter (Solana only)"),
    offset: z.number().default(0).describe("Pagination offset"),
    limit: z
      .number()
      .min(1)
      .max(1)
      .default(1)
      .describe("Number of results to return"),
  }),
  execute: async ({
    chain,
    keyword,
    target,
    sort_by,
    sort_type,
    verify_token,
    markets,
    offset,
    limit,
  }) => {
    const url = new URL("https://public-api.birdeye.so/defi/v3/search");
    url.searchParams.append("chain", chain);
    url.searchParams.append("keyword", keyword);
    url.searchParams.append("target", target);
    url.searchParams.append("sort_by", sort_by);
    url.searchParams.append("sort_type", sort_type);
    if (verify_token)
      url.searchParams.append("verify_token", String(verify_token));
    if (markets) url.searchParams.append("markets", markets);
    url.searchParams.append("offset", offset.toString());
    url.searchParams.append("limit", limit.toString());
    console.log("sdfa", url.toString());
    try {
      const response = await fetch(url.toString(), {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
        },
      });

      const data = await response.json(); // Parse the response JSON

      if (!data) {
        console.error("API Error Response:", data); // Log API response details
        throw new Error("Failed to searchTokenMarketData");
      }

      console.log("searchTokenMarketData ", data);
      return data;
    } catch (error) {
      // console.error("Error searchTokenMarketData:", error);
      throw new Error("Failed to searchTokenMarketData");
    }
  },
});
