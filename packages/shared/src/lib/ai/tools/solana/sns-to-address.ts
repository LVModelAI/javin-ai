import { logInfo } from "@javin/shared/lib/utils/logging";
import { tool } from "ai";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { Connection, clusterApiUrl, PublicKey } from "@solana/web3.js";
import { getDomainKey, NameRegistryState } from "@bonfida/spl-name-service";

// Create a connection
const conn = new Connection(
  process.env.SOLANA_QUICKNODE_RPC_ENDPOINT as string,
  {
    commitment: "confirmed",
  }
);

/**
 * Resolve a .sol domain to its owner address.
 * @param domain The domain name, with or without the ".sol" suffix.
 * @returns The base58-encoded owner address.
 */
async function resolveSNS(domain: string) {
  if (process.env.SOLANA_QUICKNODE_RPC_ENDPOINT === undefined) {
    throw new Error("SOLANA_QUICKNODE_RPC_ENDPOINT is not defined");
  }
  // strip .sol if present
  const name = domain.replace(/\.sol$/, "");

  // derive the SNS name account PDA
  const { pubkey: nameAccount } = await getDomainKey(name);
  // fetch the on-chain registry data
  const registry = await NameRegistryState.retrieve(conn, nameAccount);
  // registry.owner is a PublicKey
  return registry.registry.owner.toBase58();
}

export const snsToAddress = tool({
  description: "Get the address corresponding to SNS",
  parameters: z.object({
    snsName: z.string().describe("the sns name"),
  }),
  execute: async ({ snsName }) => {
    try {
      logInfo("Resolving SNS to address " + snsName);
      const address = await resolveSNS(snsName);
      logInfo("Resolved SNS to address " + snsName + " is " + address);
      return { snsName: snsName, address: address };
    } catch (error) {
      logInfo("Error resolving SNS: " + error);
      Sentry.captureException(error);
      return error;
    }
  },
});
