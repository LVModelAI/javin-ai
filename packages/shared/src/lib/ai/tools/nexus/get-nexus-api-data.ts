import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "@javin/shared/lib/ai/models";
import { getAllPaths, loadOpenAPI } from "@javin/shared/lib/utils/openapi";
import { makeBlockscoutApiRequest } from "@javin/shared/lib/utils/make-blockscout-api-request";
import * as Sentry from "@sentry/nextjs";
import { logInfo } from "@javin/shared/lib/utils/logging";

export const getNexusApiData = tool({
  description: "Get real-time Nexus Chain blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
    limit: z
      .number()
      .optional()
      .default(5)
      .describe("Limit of items you want in response."),
  }),
  execute: async ({
    userQuery,
    limit,
  }: {
    userQuery?: string;
    limit?: number;
  }) => {
    logInfo("getNexusApiData called with limit = " + limit);
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
        You will return the array of the urls to call in the given list of available API endpoints, which can be helpful to answer the user query. Do not modify it in any way. Give the actual query URL, by inserting appropriate values in placeholders. Do not give more than 5 APIS`,
        prompt: JSON.stringify(
          `The list of api endpoints and their summary are ${allPaths} and user Query is ${userQuery}`
        ),
      });
      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);

      console.log(`AI selected the api endpoints as `, apiEndpointsArray);

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        const fullUrl = `https://nexus-new.explorer.caldera.xyz/api/v2${endpoint}`;
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
      console.error("Error in getNexusApiData:", error);
      Sentry.captureException(error);
      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching nexus blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
