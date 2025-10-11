import { multichainEnsLookup } from "@javin/shared/lib/utils/multichain-ens-lookup";
import { tool } from "ai";
import { z } from "zod";
import { logInfo } from "@javin/shared/lib/utils/logging";

export const ensToAddress = tool({
  description: "Get the address corresponding to ENS",
  parameters: z.object({
    ensName: z.string().describe("the ens name"),
  }),
  execute: async ({ ensName }) => {
    const address = await multichainEnsLookup(ensName);
    logInfo(`Address resolved for ens:${ensName} is ${address}`);
    return { ensName: ensName, address: address };
  },
});
