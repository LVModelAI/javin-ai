import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getPathDetails,
  loadOpenAPI,
} from "../../../utils/openapi";
import { chainIdToBlockscoutUrl, supportedChainsAndId } from "./constant";
import { ensToAddress } from "../ens-to-address";
import { makeBlockscoutApiRequest } from "../../../utils/make-blockscout-api-request";
import * as Sentry from "@sentry/nextjs";

export const getEvmOnchainDataUsingBlockscout = (modelName: string) =>
  tool({
    description:
      "Get real-time data from Ethereum-based blockchains using Blockscout API v2.",
    parameters: z.object({
      userQuery: z.string().describe("Query of user."),
      chainId: z.number().describe("The blockchain chain ID.").default(1), // default to Ethereum Mainnet
    }),
    execute: async ({
      userQuery,
      chainId = 1, // default to Ethereum Mainnet
    }: {
      userQuery?: string;
      chainId?: number;
    }) => {
      console.log("using blockscout api v2 ...");
      try {
        console.log(
          `User query for getEvmOnchainDataUsingBlockscout (chainId: ${chainId}):`,
          userQuery
        );
        const apiKey = process.env.BLOCKSCOUT_API_KEY;
        if (!apiKey) {
          throw new Error("Blockscout API key not found");
        }

        // Get Blockscout base URL for this chain
        const blockscoutBaseUrl = chainIdToBlockscoutUrl[chainId];
        if (!blockscoutBaseUrl) {
          throw new Error(
            `Blockscout explorer not available for chain ID ${chainId}. Supported chains: ${Object.keys(chainIdToBlockscoutUrl).join(", ")}`
          );
        }

        const blockscoutOpenapidata = await loadOpenAPI(
          "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
        );
        const blockscoutAllPaths = await getAllPaths(blockscoutOpenapidata);

        const aiAgentResponse = await generateText({
          model: myProvider.languageModel(modelName),
          temperature: 1,
          system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
            
              ## How to Process User Queries:
              1. **Match User Query to API Path**:  
                 - Analyze the user's question.  
                 - Select the API path whose summary best matches the intent of the query.  
            
              2. **Retrieve Required Parameters**:  
                 - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
                 - Pass the API path, e.g., '/addresses/{hash}/transactions'
                 - If any required parameters are missing, prompt the user for input.  
                 - Replace placeholders in the path with actual values (e.g., {hash} with an actual address hash)
            
              3. **Construct and Execute API Call**:  
                 - Form a complete API URL using the **base URL** (${blockscoutBaseUrl}/api/v2) + the API endpoint path.  
                 - Use the **makeApiCall** tool to fetch data.
                    
              ## **Final Response Format:**  
              - Always provide a **clear, structured, human-readable answer** to the user.  
              - Do **not** return raw JSON unless explicitly requested.  
              - If no relevant data is found, respond appropriately instead of returning an empty result.  

              if user is asking about a transaction, and the transaction is not found on this chain, ask the user to specify the chain on which the he is asking about.
              `,
          prompt: JSON.stringify(
            `User query: "${userQuery}". Available API paths and summaries: ${blockscoutAllPaths}. Base URL: ${blockscoutBaseUrl}/api/v2`
          ),
          tools: {
            ensToAddress: ensToAddress,
            getPathParametersAndBaseUrl: tool({
              description:
                "Retrieve all parameters required for a given API path.",
              parameters: z.object({
                path: z
                  .string()
                  .describe(
                    "The API path, e.g., '/addresses/{hash}/transactions'"
                  ),
              }),
              execute: async ({ path }) => {
                console.log("Fetching parameters for path:", path);
                const blockscoutPathsDetails = await getPathDetails(
                  blockscoutOpenapidata,
                  path
                );
                return blockscoutPathsDetails;
              },
            }),
            makeApiCall: tool({
              description:
                "Fetch real-time blockchain data from Blockscout API v2.",
              parameters: z.object({
                path: z
                  .string()
                  .describe("The API endpoint path (e.g., '/addresses/0x.../transactions')."),
              }),
              execute: async ({ path }) => {
                try {
                  // Ensure path starts with /
                  const cleanPath = path.startsWith("/") ? path : `/${path}`;
                  const fullUrl = `${blockscoutBaseUrl}/api/v2${cleanPath}`;

                  console.log("fetching --- ", fullUrl);
                  const resultString = await makeBlockscoutApiRequest(fullUrl);
                  const json = JSON.parse(resultString);

                  console.log("Fetched API response:", json);

                  // Handle empty results
                  if (!json || (Array.isArray(json) && json.length === 0)) {
                    console.log(
                      "No data found for this query, try a different chain or query"
                    );
                    return "No data found for this query, try a different chain or query";
                  }

                  // Handle items array (common in Blockscout responses)
                  if (json.items && Array.isArray(json.items)) {
                    // Remove input field from transaction items if present
                    if (json.items.length > 0 && json.items[0]?.input) {
                      const cleanedItems = json.items.map((item: any) => {
                        const { input, ...cleanedItem } = item;
                        return cleanedItem;
                      });
                      console.log("Cleaned API response:", cleanedItems);
                      return { ...json, items: cleanedItems };
                    }
                    return json;
                  }

                  // Handle direct array responses
                  if (Array.isArray(json) && json[0]?.input) {
                    const cleanedResults = json.map((item: any) => {
                      const { input, ...cleanedItem } = item;
                      return cleanedItem;
                    });
                    console.log("Cleaned API response:", cleanedResults);
                    return cleanedResults;
                  }

                  return json;
                } catch (error) {
                  console.error("Error fetching API data:", error);
                  Sentry.captureException(error);
                  return { error: "Failed to fetch data from the API." };
                }
              },
            }),
          },
          maxSteps: 5,
        });

        console.log(`AI response is `, aiAgentResponse.text);
        return aiAgentResponse.text;
      } catch (error: any) {
        console.error("Error in getEvmOnchainDataUsingBlockscout:", error);
        Sentry.captureException(error);
        return {
          success: false,
          message: "Error retrieving API data.",
          error: error.message || "Unknown error",
        };
      }
    },
  });
