import { tool } from "ai";
import z from "zod";

export const tokenScreener = tool({
  description:
    "Get token screening data across multiple blockchains. Identify trending, newly launched, or fundamentally strong tokens using liquidity, volume, market cap, and smart money metrics. You can get a token's address by providing its symbol and chain name.",
  parameters: z.object({
    chains: z
      .array(
        z.enum([
          "arbitrum",
          "avalanche",
          "base",
          "berachain",
          "blast",
          "bnb",
          "ethereum",
          "goat",
          "hyperevm",
          "iotaevm",
          "linea",
          "mantle",
          "optimism",
          "polygon",
          "ronin",
          "sei",
          "scroll",
          "sonic",
          "unichain",
          "zksync",
          "solana",
          "ton",
          "tron",
          "bitcoin",
          "starknet",
        ])
      )
      .min(1)
      .describe(
        "List of blockchain networks to screen for tokens. Example: ['ethereum', 'base', 'solana']"
      ),

    date: z
      .object({
        from: z
          .string()
          .describe(
            "Start date for token screening, in ISO 8601 format. Example: '2025-07-01'."
          ),
        to: z
          .string()
          .describe(
            "End date for token screening, in ISO 8601 format. Example: '2025-07-07'."
          ),
      })
      .describe("Date range for screening activity."),

    pagination: z
      .object({
        page: z
          .number()
          .default(1)
          .describe("Page number for pagination. Default is 1."),
        per_page: z
          .number()
          .default(10)
          .describe("Number of records to return per page. Default is 10."),
      })
      .optional()
      .describe("Pagination controls for result size and navigation."),

    filters: z
      .object({
        token_address: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional()
          .describe(
            "Filter by one or more token addresses. Can be a single string or an array of addresses."
          ),

        token_symbol: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional()
          .describe(
            "Filter by one or more token symbols. Example: 'PEPE' or ['WIF', 'DEGEN']."
          ),

        only_smart_money: z
          .boolean()
          .default(false)
          .optional()
          .describe(
            "If true, only includes tokens traded by smart money wallets."
          ),

        sectors: z
          .array(z.string())
          .optional()
          .describe(
            "Filter by token sectors such as 'DeFi', 'Memes', 'Gaming', etc."
          ),

        token_age_days: z
          .object({
            min: z.number().optional(),
            max: z.number().optional(),
          })
          .optional()
          .describe(
            "Filter by token age in days. Example: { min: 0, max: 7 } to get tokens launched within the last week."
          ),

        market_cap_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Filter by market capitalization range in USD. Example: { min: 1000000, max: 1000000000 }."
          ),

        liquidity: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Filter by token liquidity range (USD equivalent). Example: { min: 50000, max: 10000000 }."
          ),

        price_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by current token price range in USD."),

        price_change: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by price change percentage range."),

        fdv: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Filter by Fully Diluted Valuation (FDV) range in USD. Example: { min: 1000000, max: 500000000 }."
          ),

        fdv_mc_ratio: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Filter by ratio of FDV to Market Cap. Useful for identifying overvalued or undervalued tokens."
          ),

        nof_buyers: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by number of unique buyers."),

        nof_traders: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by total number of unique traders."),

        nof_sellers: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by number of unique sellers."),

        buy_volume: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by total buy volume range in USD."),

        sell_volume: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by total sell volume range in USD."),

        volume: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by total trading volume range in USD."),

        netflow: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Filter by net inflow range (buy volume - sell volume) in USD."
          ),

        include_smart_money_labels: z
          .array(
            z.enum([
              "Fund",
              "Smart Trader",
              "30D Smart Trader",
              "90D Smart Trader",
              "180D Smart Trader",
            ])
          )
          .optional()
          .describe(
            "Include specific smart money labels in the results. Example: ['Fund', 'Smart Trader']."
          ),

        exclude_smart_money_labels: z
          .array(
            z.enum([
              "Fund",
              "Smart Trader",
              "30D Smart Trader",
              "90D Smart Trader",
              "180D Smart Trader",
            ])
          )
          .optional()
          .describe(
            "Exclude specific smart money labels from the results. Example: ['30D Smart Trader']."
          ),
      })
      .optional()
      .describe("Advanced filters to refine token screening results."),

    order_by: z
      .array(
        z.object({
          field: z
            .enum([
              "chain",
              "token_address",
              "token_symbol",
              "market_cap_usd",
              "volume",
              "holders_count",
              "liquidity",
              "nof_traders",
              "nof_buyers",
              "nof_sellers",
              "nof_buys",
              "nof_sells",
              "price_change",
              "price_usd",
              "netflow",
              "buy_volume",
              "sell_volume",
            ])
            .describe(
              "Field to sort results by. Example: 'liquidity' or 'price_change'."
            ),
          direction: z
            .enum(["ASC", "DESC"])
            .describe(
              "Sort direction: ASC for ascending or DESC for descending."
            ),
        })
      )
      .optional()
      .describe("Sorting configuration for the results."),
  }),

  execute: async (params) => {
    console.log("Executing tokenScreener with params:", params);
    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      console.log("Nansen API key not found");
      return "Nansen API key not found";
    }

    const baseUrl = process.env.NANSEN_BASE_URL;
    if (!baseUrl) {
      console.log("Nansen base URL not found");
      return "Nansen base URL not found";
    }

    const response = await fetch(`${baseUrl}/token-screener`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: apiKey,
      },
      body: JSON.stringify(params),
    });

    if (!response.ok) {
      console.log("Failed to fetch token screener data:", response.statusText);
      return `Failed to fetch token screener data: ${response.statusText}`;
    }

    const data = await response.json();
    console.log("Token screener data:", data);
    return data;
  },
});
