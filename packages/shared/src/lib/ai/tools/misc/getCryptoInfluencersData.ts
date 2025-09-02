import { tool } from "ai";
import { z } from "zod";
import { influencer_data } from "@javin/shared/lib/utils/influcencer_data";

export const getCryptoInfluencersData = tool({
  description:
    "This tool allows users to query and retrieve relevant data from a price sheet containing details of 200+ crypto influencers, including their wallet addresses and pricing for promotional deals.",
  parameters: z.object({}),
  execute: async () => {
    return {
      influencer_data,
    };
  },
});
