import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPI,
} from "../../../utils/openapi";
import { chains, etherscanBaseURL } from "./constant";
import { ensToAddress } from "../ens-to-address";
import * as Sentry from "@sentry/nextjs";

export const getEvmOnchainDataUsingEtherscan = (modelName: string) =>
  tool({
    description:
      "Get real-time data from Ethereum-based blockchains using Etherscan v2 API.",
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
      console.log("using etherscan v2 ...");
      try {
        console.log(
          `User query for getEvmOnchainDataUsingEtherscan (chainId: ${chainId}):`,
          userQuery
        );
        const apiKey = process.env.ETHERSCAN_API_KEY;
        if (!apiKey) {
          throw new Error("Etherscan API key not found");
        }

        const etherscanOpenapidata = await loadOpenAPI(
          "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
        );
        const etherscanAllPathsAndDesc = await getAllPathsAndDesc(
          etherscanOpenapidata
        );

        const aiAgentResponse = await generateText({
          model: myProvider.languageModel(modelName),
          system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
            
              ## How to Process User Queries:
              1. **Match User Query to API Path**:  
                 - Analyze the user's question.  
                 - Select the API path whose description best matches the intent of the query.  
            
              2. **Retrieve Required Parameters**:  
                 - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
                 - Pass the API path, e.g., '/?module=account&action=balance'
                 - If any required parameters are missing, prompt the user for input.  
            
              3. **Construct and Execute API Call**:  
                 - Form a complete API URL using the **base URL** (${etherscanBaseURL}) + **chainid** + retrieved parameters.  
                 - Use the **makeApiCall** tool to fetch data.
                    
              ## **Final Response Format:**  
              - Always provide a **clear, structured, human-readable answer** to the user.  
              - Do **not** return raw JSON unless explicitly requested.  
              - If no relevant data is found, respond appropriately instead of returning an empty result.  
              `,
          prompt: JSON.stringify(
            `User query: "${userQuery}". Available API paths and descriptions: ${etherscanAllPathsAndDesc}. Base URL: ${etherscanBaseURL}?chainid=${chainId}`
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
                    "The API path, e.g., '/?module=account&action=balance'"
                  ),
              }),
              execute: async ({ path }) => {
                console.log("Fetching parameters for path:", path);
                const etherscanPathsDetails = await getPathDetails(
                  etherscanOpenapidata,
                  path
                );
                return etherscanPathsDetails;
              },
            }),
            makeApiCall: tool({
              description:
                "Fetch real-time blockchain data from Etherscan v2 API.",
              parameters: z.object({
                path: z
                  .string()
                  .describe("The API path with query parameters."),
              }),
              execute: async ({ path }) => {
                try {
                  let etherscanApiChains = [...new Set([chainId, 1, ...chains])];
                  

                  const fetchForChain = async (specificChainId: number) => {
                    const options = {
                      method: "GET",
                      headers: {
                        accept: "application/json",
                      },
                    };
                    const cleanPath = path.startsWith("/?")
                      ? path.slice(2)
                      : path;
                    const fullUrl = `${etherscanBaseURL}?chainid=${specificChainId}&${cleanPath}&apikey=${apiKey}`;

                    console.log("fetching --- ", fullUrl);
                    const response = await fetch(fullUrl, options);
                    if (!response.ok)
                      throw new Error(
                        `API call failed with status ${response.status}`
                      );
                    const json = await response.json();
                    return json;
                  };

                  // Loop through chainIds sequentially and await each fetch
                  for (const chainId of etherscanApiChains) {
                    try {
                      console.log("fetching for chainId:", chainId);
                      const result = await fetchForChain(chainId);

                      if (result.result != null) {
                        console.log(
                          "Results found for chain in etherscan API:",
                          chainId
                        );
                        return result.result; // Return the first valid result
                      }
                    } catch (error) {
                      console.log(
                        `Error fetching data for chainId ${chainId}:`,
                        error
                      );
                      continue; // Continue to the next chainId if there's an error
                    }
                  }

                  // If no valid results are found after all chains, return this:
                  return "No results found.";
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
        console.error("Error in getEvmOnchainDataUsingEtherscan:", error);
        Sentry.captureException(error);
        return {
          success: false,
          message: "Error retrieving API data.",
          error: error.message || "Unknown error",
        };
      }
    },
  });
