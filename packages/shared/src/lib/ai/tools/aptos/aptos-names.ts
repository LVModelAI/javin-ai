import { tool } from "ai";
import { z } from "zod";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

// You can use AptosConfig to choose which network to connect to
const config = new AptosConfig({ network: Network.MAINNET });
// Aptos is the main entrypoint for all functions
const aptos = new Aptos(config);

export const aptosNames = tool({
  description: "Get Aptos address for an Aptos name",
  parameters: z.object({
    aptosName: z.string().describe("The Aptos name to get the address for"),
  }),
  execute: async ({ aptosName }) => {
    try {
      console.log("fetching Aptos names ");

      console.log("network", Network.MAINNET);
      // Fetch the Aptos name
      const lowerCaseAptosName = aptosName.toLowerCase();
      const nameOwnerAddress = await aptos.getOwnerAddress({
        name: lowerCaseAptosName,
      });
      console.log("nameOwnerAddress", nameOwnerAddress);

      if (!nameOwnerAddress) {
        return "Failed to fetch Aptos name";
      }

      const addressHex =
        "0x" +
        Array.from(nameOwnerAddress.data)
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("");

      console.log("Address in 0x format:", addressHex);

      return addressHex;
    } catch (error: any) {
      console.error("Error in aptosNames:", error);
      return {
        success: false,
        message: "Error in getting aptosnames.",
        error: error.message || "Unknown error",
      };
    }
  },
});
