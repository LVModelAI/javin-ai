import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@javin/shared/lib/ai/models";
import {
  getAllPathsAndDesc,
  getPathDetails,
  loadOpenAPIFromJson,
} from "@javin/shared/lib/utils/openapi";
import birdEyeOpenApiSPec from "@javin/shared/lib/ai/tools/solana/birdeye_openapi.json";
import { snsToAddress } from "@javin/shared/lib/ai/tools/solana/sns-to-address";

const BIRDEYE_BASE_URL = "https://public-api.birdeye.so";

export const getSolanaOnchainDataUsingBirdeye = tool({
  description: "Get real-time data from Solana using Birdeye.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    console.log("using solana birdeye ...");
    try {
      console.log("User query:", userQuery);

      const solanaBirdeyeOpenapidata = await loadOpenAPIFromJson(
        birdEyeOpenApiSPec
      );
      const solanaBirdeyeAllPathsAndDesc = await getAllPathsAndDesc(
        solanaBirdeyeOpenapidata
      );

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("gpt-5-mini-2025-08-07"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
            
              ## How to Process User Queries:
              1. **Match User Query to API Path**:  
                 - Analyze the user's question.  
                 - Select the API path whose description best matches the intent of the query.  
            
              2. **Retrieve Required Parameters**:  
                 - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
                 - If any required parameters are missing, prompt the user for input.  

              4. **SNS lookup**:
                 - If user enters a SNS name (Solana Name Service), like somename.sol or someName.someChain.sol then use the snsToAddress tool to get the corresponding address. Use this address for further queries. Use this tools to get the actual address so that you can pass it to other tools.
            
              3. **Construct and Execute API Call**:  
                 - Form a complete API URL using the **base URL** (${BIRDEYE_BASE_URL}) and the retrieved parameters.  
                 - Use the **makeApiCall** tool to fetch data.
                 - Put the wallet address in the url. Not the domain name of solana name service. Use the Sns lookup tool to get the address.
                    
              ## **Final Response Format:**  
              - Always provide a **clear, structured, human-readable answer** to the user.  
              - Do **not** return raw JSON unless explicitly requested.  
              - If no relevant data is found, respond appropriately instead of returning an empty result.  
              `,
        prompt: JSON.stringify(
          `User query: "${userQuery}". Available API paths and descriptions: ${solanaBirdeyeAllPathsAndDesc}. Base URL: ${BIRDEYE_BASE_URL}`
        ),
        tools: {
          snsToAddress: snsToAddress,
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
              const solanaBirdeyePathsDetails = await getPathDetails(
                solanaBirdeyeOpenapidata,
                path
              );
              return solanaBirdeyePathsDetails;
            },
          }),
          makeApiCall: tool({
            description:
              "Fetch real-time blockchain data from solana Birdeye API.",
            parameters: z.object({
              url: z.string().describe("The full API query URL."),
              limit: z
                .number()
                .describe("The limit for the number of results.")
                .default(10),
            }),
            execute: async ({ url, limit }) => {
              try {
                const options = (chain: string) => ({
                  method: "GET",
                  headers: {
                    accept: "application/json",
                    "X-API-KEY": process.env.BIRDEYE_API_KEY as string,
                    "x-chain": chain,
                  },
                });
                const fullUrl = `${url}`;
                console.log("fetching --- ", fullUrl);
                const response = await fetch(fullUrl, options("solana"));
                if (!response.ok)
                  throw new Error(
                    `API call failed with status ${response.status}`
                  );
                const respObj = await response.json();
                // console.log("Fetched API response:", respObj);
                if (respObj.data.solana?.length > limit) {
                  // used to limit txn_lists
                  console.log(
                    `found ${respObj.data.solana.length} results. truncating to ${limit} results`
                  );
                  respObj.data.solana = respObj.data.solana.slice(0, limit);
                }
                return respObj;
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
      console.error("Error in getSolanaOnchainDataUsingBirdeye:", error);
      return {
        success: false,
        message: "Error retrieving API data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
