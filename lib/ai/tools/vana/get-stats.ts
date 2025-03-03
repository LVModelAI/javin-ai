import { getStatPageScreenshot } from "@/lib/utils/get-stat-page-sceenshot";
import { tool } from "ai";
import { z } from "zod";

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

      return {
        success: false,
        message: "Error in getting vana stats.",
        error: error.message || "Unknown error",
      };
    }
  },
});
