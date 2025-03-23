import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@javin/shared/lib/ai/models";
import {
  getAccountTransactionsData,
  getOwnedCoinsData,
  getFungibleAssetCount,
  getAccountTokensCount,
  getOwnedTokens,
  getTokenData,
  getTokenActivity,
  getTransactionBalanceChange,
} from "./aptosGraphqlFunctions"; // Import the functions you built earlier

// Utility to call respective functions
export const getAptosGraphqlData = tool({
  description: "Fetches data from Aptos to answer user queries.",
  parameters: z.object({
    userQuery: z.string().describe("The user query."),
  }),

  execute: async ({ userQuery }) => {
    try {
      console.log("User query is -- ", userQuery);

      // Step 2: Ask the AI agent to select the best tool to fetch the data.
      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `You are an intelligent API assistant. Your job is to process user queries and call the relevant tool to fetch the data from Aptos. 
        Choose the appropriate tool from the list and provide the required parameters.`,
        prompt: `User query: "${userQuery}".`,
        tools: {
          getAccountTransactionsData: tool({
            description:
              "Fetches the latest transaction block number for a given address.",
            parameters: z.object({
              address: z.string(),
              limit: z.number().optional(),
              offset: z.number().optional(),
            }),
            execute: async ({ address, limit, offset }) =>
              await getAccountTransactionsData(address, limit, offset),
          }),

          getOwnedCoinsData: tool({
            description:
              "Fetches coin and fungible asset information for a given address.",
            parameters: z.object({
              ownerAddress: z.string(),
              limit: z.number().optional(),
              offset: z.number().optional(),
            }),
            execute: async ({ ownerAddress, limit, offset }) =>
              await getOwnedCoinsData(ownerAddress, limit, offset),
          }),

          getFungibleAssetCount: tool({
            description:
              "Fetches the total count of fungible assets for a given address.",
            parameters: z.object({
              address: z.string(),
            }),
            execute: async ({ address }) =>
              await getFungibleAssetCount(address),
          }),

          getAccountTokensCount: tool({
            description:
              "Fetches the total count of tokens held by an account.",
            parameters: z.object({
              address: z.string(),
            }),
            execute: async ({ address }) =>
              await getAccountTokensCount(address),
          }),

          getOwnedTokens: tool({
            description:
              "Fetches detailed information of tokens held by an account.",
            parameters: z.object({
              address: z.string(),
              limit: z.number().optional(),
              offset: z.number().optional(),
            }),
            execute: async ({ address, limit, offset }) =>
              await getOwnedTokens(address, limit, offset),
          }),

          getTokenData: tool({
            description: "Fetches .",
            parameters: z.object({
              tokenDataId: z.string(),
            }),
            execute: async ({ tokenDataId }) => await getTokenData(tokenDataId),
          }),

          getTokenActivity: tool({
            description: "Fetches token activity data for a given token ID.",
            parameters: z.object({
              tokenDataId: z.string(),
              limit: z.number().optional(),
              offset: z.number().optional(),
            }),
            execute: async ({ tokenDataId, limit, offset }) =>
              await getTokenActivity(tokenDataId, limit, offset),
          }),

          getTransactionBalanceChange: tool({
            description:
              "Fetches transaction balance change information for a given transaction version.",
            parameters: z.object({
              txnVersion: z.string(),
            }),
            execute: async ({ txnVersion }) =>
              await getTransactionBalanceChange(txnVersion),
          }),
        },
        maxSteps: 5,
      });

      return aiAgentResponse.text;
    } catch (error: any) {
      console.error("Error in fetching data:", error);
      return {
        success: false,
        message: "Error fetching data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
