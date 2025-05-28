import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import axios from "axios";
import { logObjects } from "@javin/shared/lib/utils/logging";

export const xaiLiveSearch = tool({
  description:
    "Get live search answers using xAI API (e.g., crypto sentiment, latest news).",
  parameters: z.object({
    query: z
      .string()
      .describe("The search query, e.g., 'what is the sentiment on ETH?'"),
  }),
  execute: async ({ query }) => {
    try {
      console.log("xAI Live Search Query:", query);
      const apiKey = process.env.XAI_API_KEY;
      if (!apiKey) {
        throw new Error("XAI_API_KEY is not set in environment variables.");
      }
      const response = await axios.post(
        "https://api.x.ai/v1/chat/completions",
        {
          messages: [{ role: "user", content: query }],
          search_parameters: { mode: "on" },
          model: "grok-3-latest",
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
        }
      );
      logObjects(" -- xai responst ", response.data, response.data);
      return response.data;
    } catch (error: any) {
      console.error("Error in xaiLiveSearch:", error);
      Sentry.captureException(error);
      return { error: error.message || "Unknown error" };
    }
  },
});
