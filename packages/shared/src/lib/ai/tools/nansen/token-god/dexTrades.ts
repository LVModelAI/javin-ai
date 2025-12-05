// dexTrades.ts
import { tool } from "ai";
import z from "zod";

export const dexTrades = tool({
  description:
    "Fetches individual DEX trading transactions for a specific token. Includes Smart Money label filters, trade direction (buy/sell), token pair details, and USD valuation of each trade.",
  parameters: z.object({
    chain: z.enum([
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
      "ton",
      "tron",
      "starknet",
    ]),
    token_address: z
      .string()
      .describe(
        "Address of the token to fetch DEX trades for. this should be the token address not the token symbol"
      ),
    only_smart_money: z
      .boolean()
      .default(false)
      .describe("If true, returns only DEX trades made by Smart Money wallets"),
    date: z.object({
      from: z
        .string()
        .describe("Start date in ISO 8601 format (e.g., 2025-07-01)"),
      to: z.string().describe("End date in ISO 8601 format (e.g., 2025-07-07)"),
    }),
    pagination: z
      .object({
        page: z.number().default(1),
        per_page: z.number().default(50),
      })
      .optional()
      .describe("Pagination parameters for paging through DEX trade results"),
    filters: z
      .object({
        include_smart_money_labels: z
          .array(
            z.enum([
              "30D Smart Trader",
              "90D Smart Trader",
              "180D Smart Trader",
              "Fund",
              "Smart Trader",
              "Public Figure",
              "Exchange",
              "Whale",
              "BananaGun Bot User",
              "Top Maestro Bot User",
              "Top BananaGun Bot User",
              "Maestro Bot User",
              "Early MAGIC Miner",
              "First Mover LP",
              "First Mover Staking",
              "Profitable LP",
              "Smart HL Perps Trader",
            ])
          )
          .optional()
          .describe(
            "Include only trades involving counterparties with these Smart Money labels"
          ),
        exclude_smart_money_labels: z
          .array(
            z.enum([
              "30D Smart Trader",
              "90D Smart Trader",
              "180D Smart Trader",
              "Fund",
              "Smart Trader",
              "Public Figure",
              "Exchange",
              "Whale",
              "BananaGun Bot User",
              "Top Maestro Bot User",
              "Top BananaGun Bot User",
              "Maestro Bot User",
              "Early MAGIC Miner",
              "First Mover LP",
              "First Mover Staking",
              "Profitable LP",
              "Smart HL Perps Trader",
            ])
          )
          .optional()
          .describe(
            "Exclude trades involving counterparties with these Smart Money labels"
          ),

        block_timestamp: z
          .object({
            from: z
              .union([z.string(), z.null()])
              .optional()
              .describe(
                "Start date-time inclusive, example 2025-01-01T00:00:00Z"
              ),
            to: z
              .union([z.string(), z.null()])
              .optional()
              .describe(
                "End date-time inclusive, example 2025-01-31T23:59:59Z"
              ),
          })
          .optional()
          .describe("Date range filter for trade timestamps"),

        transaction_hash: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional()
          .describe("Filter by one or more transaction hashes"),

        action: z
          .enum(["BUY", "SELL"])
          .optional()
          .describe("Filter trades by action type (BUY or SELL)"),
        trader_address: z
          .string()
          .optional()
          .describe("Filter trades by specific trader wallet address"),
        trader_address_label: z
          .string()
          .optional()
          .describe("Filter trades by trader label, e.g., 'High Gas Consumer'"),
        token_name: z
          .string()
          .optional()
          .describe("Filter by token name (e.g., 'USDC')"),
        token_amount: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by traded token amount range"),
        traded_token_name: z
          .string()
          .optional()
          .describe("Filter by traded token name (e.g., 'DAI')"),
        traded_token_amount: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter by traded token amount range"),
        estimated_value_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter trades by estimated USD value range"),
        estimated_swap_price_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Filter trades by estimated swap price range (in USD)"),
      })
      .optional(),
    order_by: z
      .array(
        z.object({
          field: z.enum([
            "block_timestamp",
            "transaction_hash",
            "trader_address",
            "trader_address_label",
            "token_address",
            "action",
            "token_name",
            "token_amount",
            "traded_token_address",
            "traded_token_name",
            "traded_token_amount",
            "estimated_swap_price_usd",
            "estimated_value_usd",
          ]),
          direction: z.enum(["ASC", "DESC"]),
        })
      )
      .optional()
      .describe(
        "Custom sort order (e.g., [{ field: 'block_timestamp', direction: 'DESC' }])"
      ),
  }),

  execute: async ({
    chain,
    token_address,
    only_smart_money,
    date,
    pagination,
    filters,
    order_by,
  }) => {
    console.log("Executing dexTrades with params:", {
      chain,
      token_address,
      only_smart_money,
      date,
      pagination,
      filters,
      order_by,
    });

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

    try {
      const response = await fetch(`${baseUrl}/tgm/dex-trades`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey,
        },
        body: JSON.stringify({
          chain,
          token_address,
          only_smart_money,
          date,
          pagination,
          filters,
          order_by,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Failed to fetch dexTrades data:", errorText);
        return `Failed to fetch dexTrades data: ${response.status} ${errorText}`;
      }

      const data = await response.json();
      console.log("DEX Trades data:", data);
      return data;
    } catch (error) {
      console.log("Error fetching dexTrades data:", error);
      return `Error fetching dexTrades data: ${error}`;
    }
  },
});
