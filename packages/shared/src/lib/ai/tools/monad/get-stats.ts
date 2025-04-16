import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const getMonadStats = tool({
  description: "Get Monad Blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Monad Blockchain stats ");
      const response = await getStatPageScreenshot(
        "https://testnet.monadexplorer.com/"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in  getMonadStats:", error);
      Sentry.captureException(error);
      return {
        success: false,
        message: "Error in getting Monad Blockchain stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
