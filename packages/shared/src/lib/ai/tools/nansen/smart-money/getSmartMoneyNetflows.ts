import { tool } from "ai";
import z from "zod";

export const getSmartMoneyNetflow = tool({
  description:
    "Analyze net capital flows (inflows vs outflows) from smart traders and funds across different time periods. This tool helps identify which tokens are experiencing net accumulation or distribution by smart money.",
  parameters: z.object({
    // Core parameters
    chains: z
      .array(
        z.enum([
          "all",
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
        ])
      )
      .describe("Chains to include in the analysis."),

    // Smart money filters
    includeSmartMoneyLabels: z
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
      .describe("Smart money categories to include."),
    excludeSmartMoneyLabels: z
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
      .describe("Smart money categories to exclude."),

    // Token filters
    tokenAddress: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional()
      .describe("Token address or symbol filter."),
    includeStablecoins: z.boolean().optional().default(false),
    includeNativeTokens: z.boolean().optional().default(false),
    tokenSector: z
      .array(z.string())
      .optional()
      .describe("Token sector filter."),

    // Numeric range filters
    traderCount: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Trader count range filter."),
    tokenAgeDays: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Token age range filter in days."),
    marketCapUsd: z
      .object({
        min: z.number().optional(),
        max: z.number().optional(),
      })
      .optional()
      .describe("Market cap range filter in USD."),

    // Sorting and pagination
    orderBy: z
      .array(
        z.object({
          field: z.enum([
            "chain",
            "token_address",
            "token_symbol",
            "net_flow_24h_usd",
            "net_flow_7d_usd",
            "net_flow_30d_usd",
            "token_sectors",
            "trader_count",
            "token_age_days",
            "market_cap_usd",
          ]),
          direction: z.enum(["ASC", "DESC"]),
        })
      )
      .optional(),
    page: z.number().optional().default(1),
    perPage: z.number().optional().default(10),
  }),

  execute: async ({
    chains,
    includeSmartMoneyLabels,
    excludeSmartMoneyLabels,
    tokenAddress,
    includeStablecoins,
    includeNativeTokens,
    tokenSector,
    traderCount,
    tokenAgeDays,
    marketCapUsd,
    orderBy,
    page,
    perPage,
  }) => {
    console.log("Executing getSmartMoneyNetflow with params:", {
      chains,
      includeSmartMoneyLabels,
      excludeSmartMoneyLabels,
      tokenAddress,
      includeStablecoins,
      includeNativeTokens,
      tokenSector,
      traderCount,
      tokenAgeDays,
      marketCapUsd,
      orderBy,
      page,
      perPage,
    });

    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      console.log("Nansen API key not found");
      return "Nansen API key not found";
    }

    const body = {
      chains,
      filters: {
        include_smart_money_labels: includeSmartMoneyLabels,
        exclude_smart_money_labels: excludeSmartMoneyLabels,
        token_address: tokenAddress,
        include_stablecoins: includeStablecoins,
        include_native_tokens: includeNativeTokens,
        token_sector: tokenSector,
        trader_count: traderCount,
        token_age_days: tokenAgeDays,
        market_cap_usd: marketCapUsd,
      },
      pagination: { page, per_page: perPage },
      order_by: orderBy,
    };

    const response = await fetch(
      "https://api.nansen.ai/api/v1/smart-money/netflow",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey: apiKey,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Failed to fetch Smart Money netflow data:", errorText);
      return `Failed to fetch Smart Money netflow data: ${response.status} ${errorText}`;
    }

    const data = await response.json();
    return data;
  },
});
