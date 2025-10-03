// getSmartMoneyDcas.ts
import { tool } from "ai";
import z from "zod";

export const getSmartMoneyDcas = tool({
  description:
    "Fetch Smart Money DCA (Dollar Cost Averaging) strategies on Solana through Jupiter DCA. Reveals systematic accumulation strategies used by Smart Money.",
  parameters: z.object({
    filters: z
      .object({
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
          .optional(),
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
          .optional(),
        dca_created_at: z
          .object({
            from: z.string().optional(),
            to: z.string().optional(),
          })
          .optional(),
        transaction_hash: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional(),
        trader_address: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional(),
        trader_address_label: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional(),
        input_token_symbol: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional(),
        output_token_symbol: z
          .union([z.string(), z.array(z.string()), z.null()])
          .optional(),
        deposit_token_amount: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
        token_spent_amount: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
        output_token_redeemed_amount: z
          .object({ min: z.number().optional(), max: z.number().optional() })
          .optional(),
      })
      .optional(),
    pagination: z
      .object({
        page: z.number().optional().default(1),
        per_page: z.number().optional().default(10),
      })
      .optional(),
    order_by: z
      .array(
        z.object({
          field: z.enum([
            "dca_created_at",
            "dca_updated_at",
            "input_token_symbol",
            "output_token_symbol",
            "deposit_token_amount",
            "token_spent_amount",
            "deposit_value_usd",
            "output_token_redeemed_amount",
          ]),
          direction: z.enum(["ASC", "DESC"]),
        })
      )
      .optional(),
  }),

  execute: async ({ filters, pagination, order_by }) => {
    console.log("Executing getSmartMoneyDcas with params:", {
      filters,
      pagination,
      order_by,
    });

    const apiKey = process.env.NANSEN_API_KEY;
    if (!apiKey) {
      console.log("Nansen API key not found");
      return "Nansen API key not found";
    }

    try {
      const response = await fetch(
        "https://api.nansen.ai/api/v1/smart-money/dcas",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apiKey,
          },
          body: JSON.stringify({
            filters,
            pagination,
            order_by,
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.log("Failed to fetch Smart Money DCA data:", errorText);
        return `Failed to fetch Smart Money DCA data: ${response.status} ${errorText}`;
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.log("Error fetching Smart Money DCA data:", error);
      return `Error fetching Smart Money DCA data: ${error}`;
    }
  },
});
