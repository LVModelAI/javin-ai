import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getAllPathsAndDesc,
  getPathDetails,
  getPathInfo,
  loadOpenAPI,
} from "../../../utils/openapi";

function scaleLargeNumbersInJson(jsonString: string): string {
  return jsonString.replace(/"(\d{10,})"/g, (_match, num) => {
    const scaledNum = (Number(num) / 1e18).toFixed(8) + " (scaled)";
    return `"${scaledNum} (scaled)"`;
  });
}

export const getAptosApiData = tool({
  description: "Get real-time Aptos blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("use prompt is -- ", userQuery);
      const aptosOpenapidata = await loadOpenAPI(
        "https://fullnode.mainnet.aptoslabs.com/v1/spec.yaml"
      );
      const allPathsAndDesc = await getAllPathsAndDesc(aptosOpenapidata);

      const aptosBaseUrl = "https://api.mainnet.aptoslabs.com/v1";

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("gpt-4o-mini"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant aptos blockchain data in a user-friendly format.
      
        ## How to Process User Queries:
        1. **Match User Query to API Path**:  
           - Analyze the user's question.  
           - Select the API path whose description best matches the intent of the query.  
      
        2. **Retrieve Required Parameters**:  
           - Use the **getPathParameters** tool to fetch all necessary parameters.  
           - pass The API path, e.g., '/accounts/{address}'
           - If any required parameters are missing, prompt the user for input.
           - make sure to use all the parameters needed to get user answer for the API path like limit, offset, etc.  
      
        3. **Construct and Execute API Call**:  
           - Form a complete API URL using the **base URL** (${aptosBaseUrl}) and the retrieved parameters.  
           - Use the **makeApiCall** tool to fetch data.
        
        ## **Final Response Format:**  
        - Always provide a **clear, structured, human-readable answer** to the user.  
        - Do **not** return raw JSON unless explicitly requested.  
        - If no relevant data is found, respond appropriately instead of returning an empty result.  
        `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${allPathsAndDesc}. Base URL: ${aptosBaseUrl}`
        ),
        tools: {
          getPathParameters: tool({
            description:
              "Retrieve all parameters required for a given API path.",
            parameters: z.object({
              path: z
                .string()
                .describe("The API path, e.g., '/accounts/{address}'"),
            }),
            execute: async ({ path }) => {
              console.log("Fetching parameters for path:", path);
              const aptosPathDetails = await getPathDetails(
                aptosOpenapidata,
                path
              );
              // console.log("aptosPathDetails", aptosPathDetails[0].parameters);
              return aptosPathDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from Aptos API.",
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
                  },
                };
                const response = await fetch(url, options);
                if (!response.ok)
                  throw new Error(
                    `API call failed with status ${response.status}`
                  );
                const json = await response.json();
                console.log("Fetched API response");
                return json; // Return parsed JSON data for further processing
              } catch (error) {
                console.error("Error fetching aptos API data:", error);
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
      console.error("Error in getAptosApiData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching aptos blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
