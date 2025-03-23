import { myProvider } from "@javin/shared/lib/ai/models";
import {
  getAllPathsAndDesc,
  getAllPathsAndSummary,
  getPathDetails,
  loadOpenAPIFromJson,
} from "@javin/shared/lib/utils/openapi";
import { generateText, tool } from "ai";
import { z } from "zod";
import defillamaJson from "./defillama-openapi.json";

export const defiLlama = tool({
  description: "Get real-time data from Defi.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("user query ", userQuery);

      const defiLlamaOpenapidata = await loadOpenAPIFromJson(defillamaJson);
      const defiLlamaAllPathsAndDesc = await getAllPathsAndSummary(
        defiLlamaOpenapidata
      );

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
      
        ## How to Process User Queries:
        1. **Match User Query to API Path**:  
           - Analyze the user's question.  
           - Select the API path whose description best matches the intent of the query.  
      
        2. **Retrieve Required Parameters and base url**:  
           - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters and base url. 
           - pass The API path, e.g., '/protocol/{protocol}'
           - If any required parameters are missing, prompt the user for input.  
      
        3. **Construct and Execute API Call**:  
           - Form a complete API URL using the **base URL** as recieved from the getPathParametersAndBaseUrl tool and the retrieved parameters.  
           - Use the **makeApiCall** tool to fetch data.
        
        ## **Final Response Format:**  
        - Always provide a **clear, structured, human-readable answer** to the user.  
        - Do **not** return raw JSON unless explicitly requested.  
        - If no relevant data is found, respond appropriately instead of returning an empty result.  
        `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${defiLlamaAllPathsAndDesc}. `
        ),
        tools: {
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
              const defiLlamaPathsDetails = await getPathDetails(
                defiLlamaOpenapidata,
                path
              );
              return defiLlamaPathsDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from defiLlama API.",
            parameters: z.object({
              url: z.string().describe("The full API query URL."),
              limit: z
                .number()
                .optional()
                .describe("number of items in the response.")
                .default(10),
            }),
            execute: async ({ url, limit }) => {
              try {
                console.log("fetching --- ", url);
                console.log("limit requested --- ", limit);
                const options = {
                  method: "GET",
                  headers: {
                    accept: "application/json",
                  },
                };
                const response = await fetch(url, options);
                if (!response.ok)
                  throw new Error(
                    `API call failed with status ${response.status}`
                  );
                let json = await response.json();
                // if json is an array them clip to only 10 elements
                if (Array.isArray(json) && json.length > limit) {
                  console.log("actual length of responbse ", json.length);
                  json = json.slice(0, limit);
                }
                // else if json is {coins :{}} then only take 10 coins in the json
                else if (json.coins && Object.keys(json.coins).length > limit) {
                  json.coins = Object.fromEntries(
                    Object.entries(json.coins).slice(0, limit)
                  );
                }
                // console.log("Fetched ", url, " response:", json);
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
      console.error("Error in defiLlama:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
