import { SUPPORTED_CURRENCY } from "@/lib/constants";
import { getZerionApiKey } from "@/lib/utils";
import {
  TokenSearchData,
  TokenSearchResponse,
} from "@/types/token-search-response";
import { tool } from "ai";
import { z } from "zod";

const sortOptions = [
  "-market_data.market_cap",
  "market_data.market_cap",
  "-market_data.price.last",
  "market_data.price.last",
  "-market_data.price.percent_change_1d",
  "market_data.price.percent_change_1d",
  "-market_data.price.percent_change_30d",
  "market_data.price.percent_change_30d",
  "-market_data.price.percent_change_90d",
  "market_data.price.percent_change_90d",
  "-market_data.price.percent_change_365d",
  "market_data.price.percent_change_365d",
] as const;

export const searchEvmTokenMarketData = tool({
  description:
    "Search for token and market data for EVM chain providing specific token address or market address",
  parameters: z.object({
    currency: z
      .enum(SUPPORTED_CURRENCY)
      .default("usd")
      .describe("Denominated currency value of returned prices"),
    search_query: z
      .string()
      .optional()
      .describe("Query for a full-text search"),
    token_chain_id: z
      .string()
      .optional()
      .describe("get only fungibles from this chain"),
    token_address: z.string().optional().describe("address of the token"),
    sort_by: z
      .enum(sortOptions)
      .default("-market_data.market_cap")
      .describe("Sort results by (e.g., price, volume_24h_usd)"),
  }),
  execute: async ({
    currency,
    search_query,
    sort_by,
    token_chain_id,
    token_address,
  }): Promise<TokenSearchData[] | string> => {
    const url = new URL("https://api.zerion.io/v1/fungibles");
    url.searchParams.append("currency", currency);
    if (search_query)
      url.searchParams.append("filter[search_query]", search_query);
    if (token_chain_id)
      url.searchParams.append(
        "filter[implementation_chain_id]",
        token_chain_id
      );
    if (token_address)
      url.searchParams.append("filter[implementation_address]", token_address);
    url.searchParams.append("sort", sort_by);
    console.log("url", url.toString());

    const apiKey = getZerionApiKey();
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };

    try {
      const response = await fetch(url.toString(), options);

      const data: TokenSearchResponse = await response.json(); // Parse the response JSON

      if (!data) {
        console.error("API Error Response:", data); // Log API response details
        return "Something went wrong. Please try again";
      }
      if (data.data.length === 0) {
        return "No token found in the market data.";
      }

      // console.log("searchTokenMarketData ", data);
      return data.data;
    } catch (error) {
      // console.error("Error searchTokenMarketData:", error);
      return "Something went wrong. Please try again";
    }
  },
});
