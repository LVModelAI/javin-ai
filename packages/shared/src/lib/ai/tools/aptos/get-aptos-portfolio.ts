import { getPortfolio } from "@javin/shared/lib/utils/aptosGraphqlFunctions";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

// Recursive function to process numbers in the response
const processNumbers = (data: any): any => {
  if (typeof data === "number" && data >= 10_000_000) {
    return data / 10 ** 8;
  } else if (Array.isArray(data)) {
    return data.map(processNumbers);
  } else if (typeof data === "object" && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, processNumbers(value)])
    );
  }
  return data;
};

export const getAptosPortfolio = tool({
  description: "Gets portfolio of an Aptos account or wallet.",
  parameters: z.object({
    ownerAddress: z
      .string()
      .describe("The Aptos account address, e.g., '0x1234...'"),
    limit: z.number().optional().describe("Number of records to fetch"),
    offset: z.number().optional().describe("Offset for pagination"),
  }),
  execute: async ({
    ownerAddress,
    limit,
    offset,
  }: {
    ownerAddress: string;
    limit?: number;
    offset?: number;
  }) => {
    try {
      console.log("getAptosPortfolio ownerAddress is -- ", ownerAddress);
      const portfolio = await getPortfolio(ownerAddress, limit, offset);
      // console.log("getAptosPortfolio portfolio is -- ", portfolio);
      return portfolio;
    } catch (error: any) {
      console.error("Error in getAptosPortfolio:", error);
      Sentry.captureException(error);
      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching aptos blockchain Portfolio.",
        error: error.message || "Unknown error",
      };
    }
  },
});
