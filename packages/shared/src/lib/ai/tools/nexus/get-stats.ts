import { getStatPageScreenshot } from "../../../utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";

export const getNexusStats = tool({
  description: "Get Nexus blockchain statistics",
  parameters: z.object({}),
  execute: async () => {
    try {
      console.log("fetching Nexus stats ");
      const response = await getStatPageScreenshot(
        "https://explorer.nexus.xyz/stats"
      );

      if (!response) {
        //@ts-ignore
        return "No results found.";
      }
      return response;
    } catch (error: any) {
      console.error("Error in  getNexusStats:", error);
      Sentry.captureException(error);
      return {
        success: false,
        message: "Error in getting  getNexusStats stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
