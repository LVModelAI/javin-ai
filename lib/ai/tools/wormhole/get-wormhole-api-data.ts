import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "@/lib/utils/openapi";
import { makeBlockscoutApiRequest } from "@/lib/utils/make-blockscout-api-request";

function scaleLargeNumbersInJson(jsonString: string): string {
  return jsonString.replace(/"(\d{15,})"/g, (_match, num) => {
    const scaledNum = (Number(num) / 1e18).toFixed(8) + " (scaled)";
    return `"${scaledNum} (scaled)"`;
  });
}

export const getWormholeApiData = tool({
  description: "Get real-time Wormhole data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      const openapidata = await loadOpenAPI(
        "https://api.wormholescan.io/swagger.json"
      );
      const wormholeOpenapidata = await loadOpenAPIFromJson(openapidata);
      const wormholeAllPaths = await getAllPaths(wormholeOpenapidata);

      console.log("use prompt is -- ", userQuery);
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api endpoint"),
        system: `\n
        You will return the array of the  urls to call in the given list of available api endpoints, which can be helpfull to answers user query. Do not modify it in any way. give the actual query url, by inserting appropriates values in placeholders do not use. do not user deprecated apis. use /api/v1/operations for looking up addresses `,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${wormholeAllPaths} and user Query is ${userQuery}`
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
        const fullUrl = `https://api.wormholescan.io${endpoint}`;
        return makeBlockscoutApiRequest(fullUrl); // Return the promise
      });

      const results = await Promise.all(requests); // Wait for all requests to complete

      const { text } = await generateText({
        model: myProvider.languageModel("chat-model-small"),
        system: `you will be provided with the response from wormhole. summarize the response. do not modify it in any way.`,
        prompt: `User query was = ${userQuery}. The apis were = ${limitedApiEndpointsArray}. The api response is = ${JSON.stringify(
          results
        )}.`,
      });

      return { result: text };
      // console.log("API Results:", results);
      // const apiResultString = JSON.stringify(results);
      // const scaledResults = scaleLargeNumbersInJson(apiResultString);
      return results;
    } catch (error: any) {
      console.error("Error in getWormholeApiData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching Wormhole blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
