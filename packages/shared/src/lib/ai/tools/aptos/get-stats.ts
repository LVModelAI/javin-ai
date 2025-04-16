import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const getAptosStats = tool({
  description: "Get Aptos blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Aptos stats ");
      const response = await getStatPageScreenshot(
        "https://explorer.aptoslabs.com/?network=mainnet"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in getAptosStats:", error);
      Sentry.captureException(error);
      return {
        success: false,
        message: "Error in getting aptos stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
