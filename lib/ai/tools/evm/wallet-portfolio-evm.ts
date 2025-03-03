import { tool } from "ai";
import { z } from "zod";
import {
  PortfolioData,
  PortfolioResponse,
} from "@/types/wallet-actions-response";
import { filterAndLimitPortfolio, getZerionApiKey } from "@/lib/utils";
import { SUPPORTED_CURRENCY } from "@/lib/constants";

export const getEvmMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet portfolio of a given wallet address across all EVM  chains.",
  parameters: z.object({
    wallet_address: z
      .string()
      .min(1, "Wallet address is required")
      .describe("EVM wallet address of user starting with '0x'"),
    currency: z
      .enum(SUPPORTED_CURRENCY)
      .default("usd")
      .describe("Denominated currency value of returned prices"),
  }),
  execute: async ({
    wallet_address,
    currency,
  }: {
    wallet_address: string;
    currency: string;
  }): Promise<PortfolioData | string> => {
    const apiKey = getZerionApiKey();
    const options = {
      method: "GET",
      headers: {
        accept: "application/json",
        authorization: `Basic ${apiKey}`,
      },
    };
    console.log("fetching portfoio of -", wallet_address);
    try {
      const response = await fetch(
        `https://api.zerion.io/v1/wallets/${wallet_address}/portfolio?currency=${currency}`,
        options
      );

      const portfolioData: PortfolioResponse = await response.json();
      if (!portfolioData || !portfolioData.data.attributes) {
        //@ts-ignore
        return "No results found. Check address and try again.";
      }

      if (portfolioData.data.attributes.total.positions == 0) {
        //@ts-ignore
        return "Wallet has no balances.";
      }

      // filter for tokens with < 1 usd and only show top 10
      const filteredPortfolio = filterAndLimitPortfolio(portfolioData.data);

      return { ...filteredPortfolio, currency };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      return "Failed to fetch wallet portfolio";
    }
  },
});
