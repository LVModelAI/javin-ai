import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const getFlowStats = tool({
  description: "Get Flow blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Flow stats ");
      const response = await getStatPageScreenshot(
        "https://evm.flowscan.io/stats"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in getFlowStats:", error);
      Sentry.captureException(error);
      return {
        success: false,
        message: "Error in getting Flow stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
