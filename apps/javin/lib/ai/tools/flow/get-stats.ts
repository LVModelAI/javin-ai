import { getStatPageScreenshot } from "@/lib/utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";

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

      return {
        success: false,
        message: "Error in getting Flow stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
