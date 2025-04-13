import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const getVanaStats = tool({
  description: "Get Vana blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching vana stats ");
      const response = await getStatPageScreenshot("https://vanascan.io/stats");

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in getVanaStats:", error);
      Sentry.captureException(error);
      return {
        success: false,
        message: "Error in getting vana stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
