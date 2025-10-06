// whoBoughtSold.ts
import { tool } from "ai";
import z from "zod";

export const whoBoughtSold = tool({
  description:
    "This tool fetches Who Bought/Sold data for a specific token to identify which wallets are net buyers or sellers within a selected time range. Includes Smart Money label filtering and trade volume insights.",
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
      "solana",
      "ton",
      "tron",
      "starknet",
    ]),
    token_address: z.string().describe("Address of the token to analyze"),
    buy_or_sell: z
      .enum(["BUY", "SELL"])
      .default("BUY")
      .describe("Whether to retrieve buyers or sellers"),
    date: z.object({
      from: z
        .string()
        .describe("Start date in ISO 8601 format (e.g., 2025-10-01)"),
      to: z.string().describe("End date in ISO 8601 format (e.g., 2025-10-03)"),
    }),
    pagination: z
      .object({
        page: z.number().default(1),
        per_page: z.number().default(50),
      })
      .optional()
      .describe("Pagination parameters"),
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
          .optional(),
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
          .optional(),
        address: z.string().optional(),
        address_label: z.string().optional(),
        bought_volume_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
        sold_volume_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
        trade_volume_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
      })
      .optional(),
    order_by: z
      .array(
        z.object({
          field: z.enum([
            "bought_volume_usd",
            "sold_volume_usd",
            "token_trade_volume",
            "trade_volume_usd",
            "bought_token_volume",
            "sold_token_volume",
          ]),
          direction: z.enum(["ASC", "DESC"]),
        })
      )
      .optional(),
  }),

  execute: async ({
    chain,
    token_address,
    buy_or_sell,
    date,
    pagination,
    filters,
    order_by,
  }) => {
    console.log("Executing whoBoughtSold with params:", {
      chain,
      token_address,
      buy_or_sell,
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
      const response = await fetch(`${baseUrl}/tgm/who-bought-sold`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey,
        },
        body: JSON.stringify({
          chain,
          token_address,
          buy_or_sell,
          date,
          pagination,
          filters,
          order_by,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Failed to fetch whoBoughtSold data:", errorText);
        return `Failed to fetch data: ${response.status} ${errorText}`;
      }

      const data = await response.json();
      console.log("Who Bought/Sold data:", data);
      return data;
    } catch (error) {
      console.log("Error fetching whoBoughtSold data:", error);
      return `Error fetching whoBoughtSold data: ${error}`;
    }
  },
});
