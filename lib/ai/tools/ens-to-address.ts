import { multichainEnsLookup } from "@/lib/utils/multichain-ens-lookup";
import { tool } from "ai";
import { z } from "zod";

export const ensToAddress = tool({
  description: "Get the address corresponding to ENS",
  parameters: z.object({
    ensName: z.string().describe("the ens name"),
  }),
  execute: async ({ ensName }) => {
    const address = await multichainEnsLookup(ensName);
    console.log("address for ens is --- ", address);
    return address;
  },
});
