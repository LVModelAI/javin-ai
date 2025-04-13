import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@javin/shared/lib/ai/models";
import {
  getAllPaths,
  getAllPathsAndDesc,
  getPathDetails,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "@javin/shared/lib/utils/openapi";
import aptosOpenapiJson from "@javin/shared/lib/utils/aptosscan-openapi.json";
import {
  getAccountTransactionsIds,
  getOwnedCoinsData,
  getFungibleAssetCount,
  getAccountTokensCount,
  getOwnedTokens,
  getTokenData,
  getTokenActivity,
  getTransactionBalanceChange,
  getPortfolio,
} from "@javin/shared/lib/utils/aptosGraphqlFunctions"; // Import the functions you built earlier
import { logObjects } from "@javin/shared/lib/utils/logging";

function scaleLargeNumbers(data: any): any {
  const SCALE_FACTOR = 10n ** 8n; // 10^8 as a BigInt

  if (typeof data === "bigint" && data >= SCALE_FACTOR) {
    return data / SCALE_FACTOR;
  } else if (typeof data === "number" && data >= Number(SCALE_FACTOR)) {
    return data / Number(SCALE_FACTOR);
  } else if (Array.isArray(data)) {
    return data.map(scaleLargeNumbers);
  } else if (typeof data === "object" && data !== null) {
    return Object.fromEntries(
      //@ts-ignore
      Object.entries(data).map(([key, value]) => [
        key,
        scaleLargeNumbers(value),
      ])
    );
  }
  return data;
}

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

export const getAptosScanApiData = tool({
  description:
    "Get real-time Aptos blockchain data about portofolio, tokens, transactions, etc.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("use prompt is -- ", userQuery);
      const aptosOpenapidata = await loadOpenAPIFromJson(aptosOpenapiJson);
      const allPathsAndDesc = await getAllPathsAndDesc(aptosOpenapidata);

      logObjects(" all paths and desc", allPathsAndDesc);

      const aptosBaseUrl = "https://api.aptoscan.com/public/v1.0";

      const aiAgentResponse = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant aptos blockchain data in a user-friendly format.
      
        you have a variety of tools available, using them you can get : the latest transaction block number for a given address, coin and fungible asset information for a given address, the total count of fungible assets for a given address, the total count of tokens held by an account, detailed information of tokens held by an account, , transaction balance change information for a given transaction version,
        based on the user query, see if those tools are helpfull and call the appropriate tool with params.

        if the above tools are not helpful, you can use the below tools to get the required data:
        you have access to public apis  which can be called to get the required data. Available API paths and descriptions: ${allPathsAndDesc}. you need to follow below steps to get the required data:
         1. **Retrieve Required Parameters**:  
           - Use the **getPathParametersAndBaseUrl** tool to fetch all necessary parameters.  
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
          `User query: "${userQuery}".  Base URL: ${aptosBaseUrl}`
        ),
        tools: {
          getAccountTransactionsIds: tool({
            description:
              "Fetches the latest transaction id for a given address.",
            parameters: z.object({
              address: z.string().describe("address of the account"),
              limit: z
                .number()
                .optional()
                .describe("Number of records to fetch"),
              offset: z.number().optional().describe("Offset for pagination"),
            }),
            execute: async ({ address, limit, offset }) => {
              type TransactionId = {
                transaction_version: number;
                __typename: string;
              };

              const txnIds = await getAccountTransactionsIds(
                address,
                limit,
                offset
              );
              console.log("Transaction IDs:", txnIds);

              /*  Transaction IDs: {
                    account_transactions: [
                      {
                        transaction_version: 2541745748,
                        __typename: 'account_transactions'
                      },

              */
              // Fetch transaction details in parallel
              const results = await Promise.all(
                txnIds.account_transactions.map(async (txn: TransactionId) => {
                  console.log("Transaction ID:", txn.transaction_version);
                  const response = await fetch(
                    `${aptosBaseUrl}/transactions/${txn.transaction_version}`,
                    {
                      method: "GET",
                      headers: {
                        accept: "application/json",
                      },
                    }
                  );
                  if (!response.ok) {
                    throw new Error(
                      `API call failed with status ${response.status}`
                    );
                  }
                  return await response.json();
                })
              );

              return results; // or format as needed
            },
          }),

          getOwnedCoinsData: tool({
            description:
              "Fetches coin and fungible asset information for a given address.",
            parameters: z.object({
              ownerAddress: z.string().describe("address of the account"),
              limit: z
                .number()
                .optional()
                .describe("Number of records to fetch"),
              offset: z.number().optional().describe("Offset for pagination"),
            }),
            execute: async ({ ownerAddress, limit, offset }) =>
              await getOwnedCoinsData(ownerAddress, limit, offset),
          }),

          getFungibleAssetCount: tool({
            description:
              "Fetches the total count of fungible assets for a given address.",
            parameters: z.object({
              address: z.string().describe("address of the account"),
            }),
            execute: async ({ address }) =>
              await getFungibleAssetCount(address),
          }),

          getAccountTokensCount: tool({
            description:
              "Fetches the total count of tokens held by an account.",
            parameters: z.object({
              address: z.string().describe("address of the account"),
            }),
            execute: async ({ address }) =>
              await getAccountTokensCount(address),
          }),

          getOwnedTokens: tool({
            description:
              "Fetches detailed information of tokens held by an account.",
            parameters: z.object({
              address: z.string().describe("address of the account"),
              limit: z
                .number()
                .optional()
                .describe("Number of records to fetch"),
              offset: z.number().optional().describe("Offset for pagination"),
            }),
            execute: async ({ address, limit, offset }) =>
              await getOwnedTokens(address, limit, offset),
          }),

          getPathParametersAndBaseUrl: tool({
            description:
              "Retrieve all parameters required for a given API path.",
            parameters: z.object({
              path: z
                .string()
                .describe(
                  "The API path, e.g., '/accounts/{address}/resources'"
                ),
            }),
            execute: async ({ path }) => {
              console.log("Fetching parameters for path:", path);
              const aptosPathDetails = await getPathDetails(
                aptosOpenapidata,
                path
              );
              return aptosPathDetails;
            },
          }),
          makeApiCall: tool({
            description: "Fetch real-time blockchain data from Aptos API.",
            parameters: z.object({
              url: z.string().describe("The full API query URL."),
              path: z
                .string()
                .describe(
                  "The API path, e.g., '/accounts/{address}/resources'"
                ),
            }),
            execute: async ({ url, path }) => {
              try {
                console.log("fetching url : ", url);
                console.log("path is :  ", path);
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
                let processedData = json;
                // const processedData = processNumbers(json);
                // handle decimals
                if (path == "/accounts/{address}/coins") {
                  processedData.data.forEach((element: any) => {
                    element.amount =
                      Number(element.amount) /
                      Math.pow(10, element.coin_decimals);
                  });
                } else if (path === "/coins/{coin_type}") {
                  if (
                    processedData.content &&
                    processedData.content["application/json"]
                  ) {
                    const coinData =
                      processedData.content["application/json"].data;
                    if (coinData && coinData.amount && coinData.decimals) {
                      coinData.amount =
                        Number(coinData.amount) /
                        Math.pow(10, coinData.decimals);
                    }
                  }
                } else {
                  processedData = scaleLargeNumbers(
                    JSON.stringify(processedData)
                  );
                }

                console.log("response from ", url, "---- ", processedData);

                return processedData;
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
