import { tool } from "ai";
import { z } from "zod";
import {
  PortfolioData,
  PortfolioResponse,
} from "@javin/shared/types/wallet-actions-response";
import {
  filterAndLimitPortfolio,
  getZerionApiKey,
} from "@javin/shared/lib/utils/utils";
import { SUPPORTED_CURRENCY } from "@javin/shared/lib/utils/constants";
import { logInfo, logObjects } from "@javin/shared/lib/utils/logging";
import * as Sentry from "@sentry/nextjs";

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
    logInfo(
      "fetching portfoio of using tool getEvmMultiChainWalletPortfolio - " +
        wallet_address
    );
    try {
      const url = `https://api.zerion.io/v1/wallets/${wallet_address}/portfolio?currency=${currency}`;
      logInfo("url is " + url);
      const response = await fetch(url, options);
      const portfolioData: PortfolioResponse = await response.json();
      logObjects(
        "portfolioData from getEvmMultiChainWalletPortfolio of wallet " +
          wallet_address,
        portfolioData
      );
      if (!portfolioData || !portfolioData?.data?.attributes) {
        return "No results found. Check address and try again.";
      }

      if (portfolioData?.data?.attributes?.total?.positions == 0) {
        return "Wallet has no balances.";
      }

      // filter for tokens with < 1 usd and only show top 10
      const filteredPortfolio = filterAndLimitPortfolio(portfolioData.data);

      return { ...filteredPortfolio, currency };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      Sentry.captureException(error);
      return "Failed to fetch wallet portfolio";
    }
  },
});
