import { tool } from "ai";
import z from "zod";

export const getSmartMoneyHoldings = tool({
  description:
    "Retrieve aggregated token balances held by smart traders and funds across multiple blockchains. This tool provides insights into what tokens are being accumulated by sophisticated market participants, excluding whales, large holders, and influencers to focus specifically on trading expertise.",
  parameters: z.object({
    // Chains to analyze
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

    // Filters
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
      .describe("Smart Money categories to include."),
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
      .describe("Smart Money categories to exclude."),

    includeStablecoins: z.boolean().optional().default(false),
    includeNativeTokens: z.boolean().optional().default(false),

    tokenAddress: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenSymbol: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenSectors: z.array(z.string()).optional(),

    // Numeric and integer filters
    valueUsd: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    balance24hPercentChange: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    holdersCount: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    shareOfHoldingsPercent: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenAgeDays: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    marketCapUsd: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),

    // Sorting and pagination
    orderBy: z
      .array(
        z.object({
          field: z.enum([
            "chain",
            "token_address",
            "token_symbol",
            "value_usd",
            "balance_24h_percent_change",
            "holders_count",
            "share_of_holdings_percent",
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
    includeStablecoins,
    includeNativeTokens,
    tokenAddress,
    tokenSymbol,
    tokenSectors,
    valueUsd,
    balance24hPercentChange,
    holdersCount,
    shareOfHoldingsPercent,
    tokenAgeDays,
    marketCapUsd,
    orderBy,
    page,
    perPage,
  }) => {
    console.log("Executing getSmartMoneyHoldings with params:", {
      chains,
      includeSmartMoneyLabels,
      excludeSmartMoneyLabels,
      includeStablecoins,
      includeNativeTokens,
      tokenAddress,
      tokenSymbol,
      tokenSectors,
      valueUsd,
      balance24hPercentChange,
      holdersCount,
      shareOfHoldingsPercent,
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
        include_stablecoins: includeStablecoins,
        include_native_tokens: includeNativeTokens,
        token_address: tokenAddress,
        token_symbol: tokenSymbol,
        token_sectors: tokenSectors,
        value_usd: valueUsd,
        balance_24h_percent_change: balance24hPercentChange,
        holders_count: holdersCount,
        share_of_holdings_percent: shareOfHoldingsPercent,
        token_age_days: tokenAgeDays,
        market_cap_usd: marketCapUsd,
      },
      pagination: { page, per_page: perPage },
      order_by: orderBy,
    };

    const baseUrl = process.env.NANSEN_BASE_URL;
    if (!baseUrl) {
      console.log("Nansen base URL not found");
      return "Nansen base URL not found";
    }

    const response = await fetch(`${baseUrl}/smart-money/holdings`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Failed to fetch Smart Money holdings data:", errorText);
      return `Failed to fetch Smart Money holdings data: ${response.status} ${errorText}`;
    }

    const data = await response.json();
    console.log("Smart Money holdings data:", data);
    return data;
  },
});
