import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@javin/shared/lib/ai/models";
import { getAllPaths, loadOpenAPI } from "@javin/shared/lib/utils/openapi";
import { makeBlockscoutApiRequest } from "@javin/shared/lib/utils/make-blockscout-api-request";
import * as Sentry from "@sentry/nextjs";

export const getZetaApiData = tool({
  description: "Get real-time Zeta Chain blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
    limit: z.number().optional().default(5),
  }),
  execute: async ({
    userQuery,
    limit,
  }: {
    userQuery?: string;
    limit?: number;
  }) => {
    // console.log("getZetaApiData called with limi = ", limit);
    try {
      const openapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/blockscout/blockscout-api-v2-swagger/main/swagger.yaml"
      );
      const allPaths = await getAllPaths(openapidata);
      console.log("use prompt is -- ", userQuery);
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("gpt-5-mini-2025-08-07"),
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

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        const fullUrl = `https://zetachain.blockscout.com/api/v2${endpoint}`;
        // const fullUrl = `https://zetachain.blockscout.com/api/v2/addresses/0x12a9D4bC92C2D9C0AA511D7C0D5c3e30B7D592C5/transactions`;
        const t = await makeBlockscoutApiRequest(fullUrl);
        const tob = JSON.parse(t);
        if (tob.items) {
          tob.items = tob.items.slice(0, limit);
        }
        // console.log("tob is ", tob);
        const ts = JSON.stringify(tob);
        return ts;
      });

      const results = await Promise.all(requests);

      return results;
    } catch (error: any) {
      console.error("Error in getZetaApiData:", error);
      Sentry.captureException(error);
      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching zetachain blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
