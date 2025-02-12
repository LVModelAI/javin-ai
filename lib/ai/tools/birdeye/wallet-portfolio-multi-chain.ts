import { tool } from "ai";
import { z } from "zod";
import { birdeye_supported_chains } from "@/lib/constants";

export const getMultiChainWalletPortfolio = tool({
  description:
    "Fetch the multi-chain wallet portfolio of a given wallet address across all supported chains.",
  parameters: z.object({
    wallet_address: z.string().describe("wallet address of user"),
  }),
  execute: async ({ wallet_address }: { wallet_address: string }) => {
    const options = (chain: string) => ({
      method: "GET",
      headers: {
        accept: "application/json",
        "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
        "x-chain": chain, // Send one chain at a time
      },
    });

    try {
      const portfolioData: Record<string, any> = {};

      for (const chain of birdeye_supported_chains) {
        const response = await fetch(
          `https://public-api.birdeye.so/v1/wallet/token_list?wallet=${wallet_address}`,
          options(chain)
        );
        const chainData = await response.json();
        portfolioData[chain] = chainData;
      }

      // console.log("portfolio ------------ ", portfolioData);
      return portfolioData;
    } catch (error) {
      console.error("Error fetching wallet portfolio:", error);
      throw new Error("Failed to fetch wallet portfolio");
    }
  },
});
