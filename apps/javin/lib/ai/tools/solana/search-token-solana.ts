import { transformBirdeyeToTokenSearchResponse } from "@/lib/utils";
import {
  BirdeyeTokenData,
  BirdeyeTokenSearchResponse,
  TokenSearchData,
} from "@/types/token-search-response";
import { tool } from "ai";
import { z } from "zod";

const sortByOptions = [
  "fdv",
  "marketcap",
  "liquidity",
  "price",
  "price_change_24h_percent",
  "trade_24h",
  "trade_24h_change_percent",
  "buy_24h",
  "buy_24h_change_percent",
  "sell_24h",
  "sell_24h_change_percent",
  "unique_wallet_24h",
  "unique_view_24h_change_percent",
  "last_trade_unix_time",
  "volume_24h_usd",
  "volume_24h_change_percent",
] as const;

const targetOptions = ["all", "token", "market"] as const;

const sortTypeOptions = ["asc", "desc"] as const;

export const searchSolanaTokenMarketData = tool({
  description:
    "Search for token and market data for solana chain providing specific token address or market address",
  parameters: z.object({
    address: z.string().describe("the solana token address"),
  }),
  execute: async ({ address }): Promise<TokenSearchData[] | string> => {
    try {
      const response = await fetch(
        `https://public-api.birdeye.so/defi/token_overview?address=${address}`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
            "x-chain": "solana",
          },
        }
      );

      const apiData: BirdeyeTokenSearchResponse = await response.json();
      if (!apiData) {
        console.error("API Error Response:", apiData); // Log API response details
        return "Something went wrong. Please try again";
      }

      if (Object.keys(apiData.data).length === 0) {
        console.warn("No token found in the market data.");
        return [];
      }

      const tokenSearchResponse =
        transformBirdeyeToTokenSearchResponse(apiData);

      return tokenSearchResponse.data;
    } catch (error) {
      // console.error("Error searchTokenMarketData:", error);
      return "Something went wrong. Please try again";
    }
  },
});
