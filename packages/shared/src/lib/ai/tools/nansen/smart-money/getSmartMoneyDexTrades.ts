import { tool } from "ai";
import z from "zod";

export const getSmartMoneyDexTrades = tool({
  description:
    "Access real-time DEX trading activity from smart traders and funds over the last 24 hours. This tool provides granular transaction-level data showing exactly what sophisticated traders are buying and selling on decentralized exchanges.",
  parameters: z.object({
    // Chains
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
          // "solana",
        ])
      )
      .describe("Chains to include in the analysis."),

    // Smart money labels
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

    // Token and trader filters
    chain: z.union([z.string(), z.array(z.string()), z.null()]).optional(),
    transactionHash: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    traderAddress: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    traderAddressLabel: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenBoughtAddress: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenSoldAddress: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenBoughtSymbol: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),
    tokenSoldSymbol: z
      .union([z.string(), z.array(z.string()), z.null()])
      .optional(),

    // Numeric range filters
    tokenBoughtAmount: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenSoldAmount: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenBoughtAgeDays: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenSoldAgeDays: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenBoughtMarketCap: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tokenSoldMarketCap: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),
    tradeValueUsd: z
      .object({ min: z.number().optional(), max: z.number().optional() })
      .optional(),

    // Sorting and pagination
    orderBy: z
      .array(
        z.object({
          field: z.enum([
            "chain",
            "block_timestamp",
            "transaction_hash",
            "trader_address",
            "trader_address_label",
            "token_bought_address",
            "token_sold_address",
            "token_bought_amount",
            "token_sold_amount",
            "token_bought_symbol",
            "token_sold_symbol",
            "token_bought_age_days",
            "token_sold_age_days",
            "token_bought_market_cap",
            "token_sold_market_cap",
            "trade_value_usd",
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
    chain,
    transactionHash,
    traderAddress,
    traderAddressLabel,
    tokenBoughtAddress,
    tokenSoldAddress,
    tokenBoughtSymbol,
    tokenSoldSymbol,
    tokenBoughtAmount,
    tokenSoldAmount,
    tokenBoughtAgeDays,
    tokenSoldAgeDays,
    tokenBoughtMarketCap,
    tokenSoldMarketCap,
    tradeValueUsd,
    orderBy,
    page,
    perPage,
  }) => {
    console.log("Executing getSmartMoneyDexTrades with params:", {
      chains,
      includeSmartMoneyLabels,
      excludeSmartMoneyLabels,
      chain,
      transactionHash,
      traderAddress,
      traderAddressLabel,
      tokenBoughtAddress,
      tokenSoldAddress,
      tokenBoughtSymbol,
      tokenSoldSymbol,
      tokenBoughtAmount,
      tokenSoldAmount,
      tokenBoughtAgeDays,
      tokenSoldAgeDays,
      tokenBoughtMarketCap,
      tokenSoldMarketCap,
      tradeValueUsd,
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
        chain,
        transaction_hash: transactionHash,
        trader_address: traderAddress,
        trader_address_label: traderAddressLabel,
        token_bought_address: tokenBoughtAddress,
        token_sold_address: tokenSoldAddress,
        token_bought_symbol: tokenBoughtSymbol,
        token_sold_symbol: tokenSoldSymbol,
        token_bought_amount: tokenBoughtAmount,
        token_sold_amount: tokenSoldAmount,
        token_bought_age_days: tokenBoughtAgeDays,
        token_sold_age_days: tokenSoldAgeDays,
        token_bought_market_cap: tokenBoughtMarketCap,
        token_sold_market_cap: tokenSoldMarketCap,
        trade_value_usd: tradeValueUsd,
      },
      pagination: { page, per_page: perPage },
      order_by: orderBy,
    };

    const baseUrl = process.env.NANSEN_BASE_URL;
    if (!baseUrl) {
      console.log("Nansen base URL not found");
      return "Nansen base URL not found";
    }

    const response = await fetch(`${baseUrl}/smart-money/dex-trades`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: apiKey,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.log("Failed to fetch Smart Money DEX trades data:", errorText);
      return `Failed to fetch Smart Money DEX trades data: ${response.status} ${errorText}`;
    }

    const data = await response.json();
    console.log("Smart Money DEX trades data:", data);
    return data;
  },
});
