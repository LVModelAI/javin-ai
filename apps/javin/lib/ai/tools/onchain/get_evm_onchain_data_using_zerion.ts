import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getAllPathsAndDesc,
  getAllPathsUrl,
  getPathDetails,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "@/lib/utils/openapi";
import zerionJson from "./zerion-openapi.json";
import { etherscanBaseURL, zerionBaseURL } from "./constant";
import { getZerionApiKey } from "@/lib/utils";
import { groq } from "@ai-sdk/groq";
import { translateTransactions } from "../translate-transactions";

export const getEvmOnchainDataUsingZerion = tool({
  description: "Get real-time data from Ethereum based blockchains.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("user query ", userQuery);
      const apiKey = getZerionApiKey();
      if (!apiKey) {
        throw Error("zerion api key not found");
      }

      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPathsAndDesc = await getAllPathsAndDesc(zerionOpenapidata);

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
      
        ## How to Process User Queries:
        1. **Match User Query to API Path**:  
           - Analyze the user's question.  
           - Select the API path whose description best matches the intent of the query.  
      
        2. **Retrieve Required Parameters**:  
           - Use the **getPathParameters** tool to fetch all necessary parameters.  
           - pass The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'
           - If any required parameters are missing, prompt the user for input.  
      
        3. **Construct and Execute API Call**:  
           - Form a complete API URL using the **base URL** (${zerionBaseURL}) and the retrieved parameters.  
           - Use the **makeApiCall** tool to fetch data.
        
        4. **translate Data Output to human readable format**:  
          - use the **translateTransactions** tool to transalte the transaction in a human friendly format.  
          - Always return **human-readable information** instead of raw JSON.  


        ## **Final Response Format:**  
        - Always provide a **clear, structured, human-readable answer** to the user.  
        - Do **not** return raw JSON unless explicitly requested.  
        - If transactions are involved, ensure they are **translated for readability** by using translateTransactions.  
        - If no relevant data is found, respond appropriately instead of returning an empty result.  
        `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${zerionAllPathsAndDesc}. Base URL: ${zerionBaseURL}`
        ),
        tools: {
          getPathParameters: tool({
            description:
              "Retrieve all parameters required for a given API path.",
            parameters: z.object({
              path: z
                .string()
                .describe(
                  "The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'"
                ),
            }),
            execute: async ({ path }) => {
              console.log("Fetching parameters for path:", path);
              const zerionPathsDetails = await getPathDetails(
                zerionOpenapidata,
                path
              );
              return zerionPathsDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from Zerion API.",
            parameters: z.object({
              url: z.string().describe("The full API query URL."),
            }),
            execute: async ({ url }) => {
              try {
                console.log("fetching --- ", url);
                const options = {
                  method: "GET",
                  headers: {
                    accept: "application/json",
                    authorization: `Basic ${apiKey}`,
                  },
                };
                const response = await fetch(url, options);
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
          translateTransactions,
        },
        maxSteps: 5,
      });

      console.log(`AI response is `, aiAgentResponse.text);
      return aiAgentResponse.text;
    } catch (error: any) {
      console.error("Error in getEvmOnchainDataUsingZerion:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
