import { tool } from "ai";
import { z } from "zod";
import { request, gql } from "graphql-request";

const endpoint = "https://indexer.mainnet.aptoslabs.com/v1/graphql";

// Recursive function to process numbers in the response
const processNumbers = (data: any): any => {
  if (typeof data === "number" && data >= 10_000_000) {
    return data / 10 ** 8;
  } else if (Array.isArray(data)) {
    return data.map(processNumbers);
  } else if (typeof data === "object" && data !== null) {
    return Object.fromEntries(
      Object.entries(data).map(([key, value]) => [key, processNumbers(value)])
    );
  }
  return data;
};

export const getAptosPortfolio = tool({
  description: "Gets portfolio of an Aptos account or wallet.",
  parameters: z.object({
    accountAddress: z.string().describe("The Aptos account address."),
  }),
  execute: async ({ accountAddress }: { accountAddress?: string }) => {
    const ownerAddress = accountAddress;
    try {
      console.log("getAptosPortfolio accountAddress is -- ", ownerAddress);

      const query = gql`
        query MyQuery($ownerAddress: String!) {
          current_fungible_asset_balances(
            where: { owner_address: { _eq: $ownerAddress } }
            limit: 10
          ) {
            amount
            metadata {
              name
              symbol
              decimals
              icon_uri
            }
          }
          current_token_ownerships_v2(
            where: { owner_address: { _eq: $ownerAddress } }
            limit: 10
          ) {
            is_fungible_v2
            current_token_data {
              token_name
              token_properties
              description
              token_uri
            }
            amount
          }
        }
      `;

      const variables = { ownerAddress };
      const data = await request(endpoint, query, variables);
      //   console.log("Fetched data:", data);

      const scaledData = processNumbers(data);
      //   console.log("Scaled data:", scaledData);

      return scaledData;
    } catch (error: any) {
      console.error("Error in getAptosPortfolio:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching aptos blockchain Portfolio.",
        error: error.message || "Unknown error",
      };
    }
  },
});
