import { generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import zerionJson from "./zerion-openapi.json";
import { zerionBaseURL } from "./constant";
import { getZerionApiKey } from "../../../utils/utils";
import { ensToAddress } from "../ens-to-address";
import * as Sentry from "@sentry/nextjs";

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
        model: myProvider.languageModel("gpt-4o-mini"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
      
        ## How to Process User Queries:
        1. **Match User Query to API Path**:  
           - Analyze the user's question.  
           - Select the API path whose description best matches the intent of the query.  
      
        2. **Retrieve Required Parameters**:  
           - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
           - pass The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'
           - If any required parameters are missing, prompt the user for input.  
      
        3. **Construct and Execute API Call**:  
           - Form a complete API URL using the **base URL** (${zerionBaseURL}) and the retrieved parameters.  
           - Use the **makeApiCall** tool to fetch data.
        
        ## **Final Response Format:**  
        - Always provide a **clear, structured, human-readable answer** to the user.  
        - Do **not** return raw JSON unless explicitly requested.  
        - If no relevant data is found, respond appropriately instead of returning an empty result.  
        `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${zerionAllPathsAndDesc}. Base URL: ${zerionBaseURL}`
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
      console.error("Error in getEvmOnchainDataUsingZerion:", error);
      Sentry.captureException(error);
      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
