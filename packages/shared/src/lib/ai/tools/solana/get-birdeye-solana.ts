import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import { groq } from "@ai-sdk/groq";
import { translateTransactions } from "../translate-transactions";
// @ts-ignore
import birdEyeOpenApiSPec from "./birdeye-openapi.json";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

export const getEvmOnchainDataUsingEtherscan = tool({
  description: "Get real-time data from Solana using Birdeye.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    console.log("using solana birdeye ...");
    try {
      console.log("User query:", userQuery);

      const etherscanOpenapidata = await loadOpenAPIFromJson(
        birdEyeOpenApiSPec
      );
      const etherscanAllPathsAndDesc = await getAllPathsAndDesc(
        etherscanOpenapidata
      );

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
            
              ## How to Process User Queries:
              1. **Match User Query to API Path**:  
                 - Analyze the user's question.  
                 - Select the API path whose description best matches the intent of the query.  
            
              2. **Retrieve Required Parameters**:  
                 - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
                 - pass The API path, e.g., '/?module=account&action=balance'
                 - If any required parameters are missing, prompt the user for input.  
            
              3. **Construct and Execute API Call**:  
                 - Form a complete API URL using the **base URL** (${BIRDEYE_BASE_URL}) and the retrieved parameters.  
                 - Use the **makeApiCall** tool to fetch data.
                    
              ## **Final Response Format:**  
              - Always provide a **clear, structured, human-readable answer** to the user.  
              - Do **not** return raw JSON unless explicitly requested.  
              - If no relevant data is found, respond appropriately instead of returning an empty result.  
              `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${etherscanAllPathsAndDesc}. Base URL: ${BIRDEYE_BASE_URL}`
        ),
        tools: {
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
            description: "Fetch real-time blockchain data from etherscan API.",
            parameters: z.object({
              url: z.string().describe("The full API query URL."),
            }),
            execute: async ({ url }) => {
              try {
                const options = (chain: string) => ({
                  method: "GET",
                  headers: {
                    accept: "application/json",
                    "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
                    "x-chain": chain, // Send one chain at a time
                  },
                });
                const fullUrl = `${url}`;
                console.log("fetching --- ", fullUrl);
                const response = await fetch(fullUrl, options("solana"));
                if (!response.ok)
                  throw new Error(
                    `API call failed with status ${response.status}`
                  );
                const json = await response.json();
                console.log("Fetched API response:", json);
                return json; // Return parsed JSON data for further processing
              } catch (error) {
                console.error("Error fetching API data:", error);
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
      return {
        success: false,
        message: "Error retrieving API data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
