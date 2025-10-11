import { tool } from "ai";
import { z } from "zod";
import {
  filterAndLimitPortfolio,
  getZerionApiKey,
} from "@javin/shared/lib/utils/utils";
import {
  SUPPORTED_CURRENCY,
  zerionBaseURL,
} from "@javin/shared/lib/utils/constants";
import { logInfo, logObjects } from "@javin/shared/lib/utils/logging";
import * as Sentry from "@sentry/nextjs";

/* -------------------------------------------------------------------------- */
/*                                 Type Definitions                           */
/* -------------------------------------------------------------------------- */

export type PortfolioData = {
  type: "portfolio";
  id: string;
  currency: string;
  attributes: {
    positions_distribution_by_type: {
      wallet: number;
      deposited: number;
      borrowed: number;
      locked: number;
      staked: number;
    };
    positions_distribution_by_chain: {
      [key: string]: number | undefined;
    };
    total: {
      positions: number | null;
    };
    changes: {
      absolute_1d: number;
      percent_1d: number;
    };
  };
};

export type PortfolioResponse = {
  links: {
    self: string;
  };
  data: PortfolioData;
};

/* ---------- New Types for /positions API ---------- */

export type PositionItem = {
  type: string;
  id: string;
  attributes: {
    name: string;
    position_type: string;
    quantity: {
      int: string;
      decimals: number;
      float: number;
      numeric: string;
    };
    value: number;
    price: number;
    changes: {
      absolute_1d: number;
      percent_1d: number;
    };
    fungible_info: {
      name: string;
      symbol: string;
      icon?: {
        url: string;
      };
      implementations?: Array<{
        chain_id: string;
        address: string;
        decimals: number;
      }>;
    };
  };
  relationships: {
    chain: {
      data: {
        type: string;
        id: string;
      };
    };
  };
};

export type PositionsResponse = {
  links: {
    self: string;
  };
  data: PositionItem[];
};

/* ---------- Existing Birdeye Type (unchanged) ---------- */

export type TokenItem = {
  address: string;
  decimals: number;
  balance: number;
  uiAmount: number;
  chainId: string;
  name: string;
  symbol: string;
  logoURI?: string;
  icon?: string;
  priceUsd: number;
  valueUsd: number;
};

export type BirdeyePortfolioResponse = {
  success: boolean;
  data: {
    wallet: string;
    totalUsd: number;
    items: TokenItem[];
  };
};

/* -------------------------------------------------------------------------- */
/*                              Tool Definition                               */
/* -------------------------------------------------------------------------- */

export const getEvmMultiChainWalletPortfolio = tool({
  description:
    "Fetch both the summary and detailed multi-chain wallet portfolio of a given wallet address across all EVM chains.",
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
  }): Promise<
    | {
        summary: PortfolioData;
        positions: Array<{
          id: string;
          chain: string;
          name: string;
          symbol: string;
          value: number;
          quantity: number;
          price: number;
          percent_change_1d: number;
          icon?: string;
        }>;
        currency: string;
      }
    | string
  > => {
    const apiKey = getZerionApiKey();
    const headers = {
      accept: "application/json",
      authorization: `Basic ${apiKey}`,
    };

    logInfo(
      `Fetching portfolio (summary + positions) for wallet ${wallet_address}`
    );

    try {
      const summaryUrl = `${zerionBaseURL}/wallets/${wallet_address}/portfolio?currency=${currency}`;
      const positionsUrl = `${zerionBaseURL}/wallets/${wallet_address}/positions/?filter[positions]=only_simple&filter[trash]=only_non_trash&sort=value&currency=${currency}`;

      logInfo("Summary URL: " + summaryUrl);
      logInfo("Positions URL: " + positionsUrl);

      // Fetch both in parallel
      const [summaryRes, positionsRes] = await Promise.all([
        fetch(summaryUrl, { method: "GET", headers }),
        fetch(positionsUrl, { method: "GET", headers }),
      ]);

      const [summaryData, positionsData]: [
        PortfolioResponse,
        PositionsResponse
      ] = await Promise.all([summaryRes.json(), positionsRes.json()]);

      logObjects(
        `summaryData from getEvmMultiChainWalletPortfolio of wallet ${wallet_address}`,
        summaryData
      );
      logObjects(
        `positionsData from getEvmMultiChainWalletPortfolio of wallet ${wallet_address}`,
        positionsData
      );

      if (!summaryData?.data?.attributes) {
        return "No results found. Check address and try again.";
      }

      if (summaryData?.data?.attributes?.total?.positions === 0) {
        return "Wallet has no balances.";
      }

      // Filter + limit summary
      const filteredSummary = filterAndLimitPortfolio(summaryData.data);

      // Extract clean positions array
      const detailedPositions =
        positionsData?.data?.map((p) => ({
          id: p.id,
          chain: p.relationships?.chain?.data?.id,
          name: p.attributes?.fungible_info?.name,
          symbol: p.attributes?.fungible_info?.symbol,
          value: p.attributes?.value,
          quantity: p.attributes?.quantity?.float,
          price: p.attributes?.price,
          percent_change_1d: p.attributes?.changes?.percent_1d,
          icon: p.attributes?.fungible_info?.icon?.url,
        })) || [];

      return {
        summary: filteredSummary,
        positions: detailedPositions,
        currency,
      };
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      Sentry.captureException(error);
      return "Failed to fetch wallet portfolio";
    }
  },
});
