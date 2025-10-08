// flowIntelligence.ts
import { tool } from "ai";
import z from "zod";

/**
 * Get TGM Flow Intelligence Data
 * - Aggregated inflows, outflows, and net flows for a token
 * - Broken down by holder segments: Exchanges, Smart Traders, Public Figures, Whales, Top PnL, Fresh Wallets
 * - Timeframe options: 5m, 1h, 6h, 12h, 1d, 7d
 */
export const flowIntelligence = tool({
  description:
    "This tool provides comprehensive flow intelligence analytics, including inflows, outflows, and net flows for a specific token, broken down by various holder segments (Exchanges, Smart Money, Public Figures, Whales) with time-based statistics and trends. It can be used for identifying accumulation/distribution patterns across different holder segments.",

  parameters: z.object({
    chain: z
      .enum([
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
        "plasma",
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
      ])
      .describe("Blockchain to query, for example ethereum, base, solana."),
    token_address: z
      .string()
      .describe("Token contract address on the selected chain."),

    timeframe: z
      .enum(["5m", "1h", "6h", "12h", "1d", "7d"])
      .default("1d")
      .describe("Time window to aggregate flows: 5m, 1h, 6h, 12h, 1d, or 7d."),

    // Optional filters per segment
    filters: z
      .object({
        // Public Figure
        public_figure_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Net flow in USD for Public Figures."),
        public_figure_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Average absolute flow in USD for Public Figures."),
        public_figure_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Unique Public Figure wallet count."),

        // Top PnL
        top_pnl_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Net flow in USD for Top PnL wallets."),
        top_pnl_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Average absolute flow in USD for Top PnL wallets."),
        top_pnl_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Unique Top PnL wallet count."),

        // Whale
        whale_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Net flow in USD for Whales."),
        whale_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Average absolute flow in USD for Whales."),
        whale_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Unique Whale wallet count."),

        // Smart Trader
        smart_trader_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Net flow in USD for Smart Traders."),
        smart_trader_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Average absolute flow in USD for Smart Traders."),
        smart_trader_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Unique Smart Trader wallet count."),

        // Exchange
        exchange_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Net flow in USD for Exchanges."),
        exchange_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Average absolute flow in USD for Exchanges."),
        exchange_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Unique Exchange wallet count."),

        // Fresh Wallets
        fresh_wallets_net_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe("Inflow in USD for fresh wallets within the timeframe."),
        fresh_wallets_avg_flow_usd: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional()
          .describe(
            "Average absolute inflow in USD for fresh wallets all time."
          ),
        fresh_wallets_wallet_count: z
          .object({
            min: z.number().int().optional(),
            max: z.number().int().optional(),
          })
          .optional()
          .describe("Fresh wallets count placeholder."),
      })
      .optional()
      .describe("Optional filters to constrain segment flows and counts."),
  }),

  execute: async ({ chain, token_address, timeframe, filters }) => {
    console.log("Executing flowIntelligence with params:", {
      chain,
      token_address,
      timeframe,
      filters,
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
      const response = await fetch(`${baseUrl}/tgm/flow-intelligence`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apiKey,
        },
        body: JSON.stringify({
          chain,
          token_address,
          timeframe,
          filters,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Failed to fetch Flow Intelligence data:", errorText);
        return `Failed to fetch Flow Intelligence data: ${response.status} ${errorText}`;
        // No throws. Return string error to the caller.
      }

      const data = await response.json();
      console.log("Flow Intelligence data:", data);
      return data;
    } catch (error) {
      console.log("Error fetching Flow Intelligence data:", error);
      return `Error fetching Flow Intelligence data: ${error}`;
    }
  },
});
