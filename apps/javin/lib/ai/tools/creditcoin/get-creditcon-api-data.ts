import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import { getAllPaths, getPathInfo, loadOpenAPI } from "@/lib/utils/openapi";
import { makeBlockscoutApiRequest } from "@/lib/utils/make-blockscout-api-request";

function scaleLargeNumbersInJson(jsonString: string): string {
  return jsonString.replace(/"(\d{10,})"/g, (_match, num) => {
    const scaledNum = (Number(num) / 1e18).toFixed(8) + " (scaled)";
    return `"${scaledNum} (scaled)"`;
  });
}

export const getCreditcoinApiData = tool({
  description: "Get real-time Creditcoin blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
      );
      const allPaths = await getAllPaths(openapidata);
      console.log("use prompt is -- ", userQuery);
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api endpoint"),

        system: `\n
        You will return the array of the  urls to call in the given list of available api endpoints, which can be helpfull to answers user query. Do not modify it in any way. give the actual query url, by inserting appropriates values in placeholders. do not give more than 5 apis`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);

      console.log(`AI selected the api endpoints as `, apiEndpointsArray);

      // the apiEndpointsArray is like
      // apiEndpointsArray = [
      //   '/addresses/0x7492933BB94F79df306FeB86A4ed1927a0a51B31/token-balances',
      //   '/addresses/0x7492933BB94F79df306FeB86A4ed1927a0a51B31/tokens'
      // ]

      // make the api calls
      const requests = limitedApiEndpointsArray.map((endpoint) => {
        const fullUrl = `https://creditcoin.blockscout.com/api/v2${endpoint}`;
        return makeBlockscoutApiRequest(fullUrl); // Return the promise
      });

      const results = await Promise.all(requests); // Wait for all requests to complete
      console.log("API Results:", results);
      // const apiResultString = JSON.stringify(results);
      // const scaledResults = scaleLargeNumbersInJson(apiResultString);
      return results;
    } catch (error: any) {
      console.error("Error in getCreditcoinApiData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching creditcoin blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
