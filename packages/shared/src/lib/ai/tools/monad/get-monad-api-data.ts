import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPathDetails,
  loadOpenAPIFromJson,
} from "../../../utils/openapi";
import monadJson from "./monad-opanapi.json";
import { makeBlockVisionApiRequest } from "@javin/shared/lib/utils/make-blockvision-api-request";
import * as Sentry from "@sentry/nextjs";

export const getMonadApiData = tool({
  description: "Get real-time Monad blockchain data.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({
    userQuery,
    limit,
  }: {
    userQuery?: string;
    limit?: number;
  }) => {
    try {
      console.log("use prompt is -- ", userQuery);
      const openapidata = await loadOpenAPIFromJson(monadJson);
      const allPaths = await getAllPathDetails(openapidata);
      // console.log("allPaths", allPaths);
      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api path"),
        system: `\n
        You will return the array of the  urls to call in the given list of available api paths, which can be helpfull to answers user query. Do not modify it in any way. give the actual query path of the api, do not clip the path, by inserting appropriates values in placeholders. do not give more than 5 apis`,
        prompt: JSON.stringify(
          `The list the api path details are ${JSON.stringify(
            allPaths
          )} and user Query is ${userQuery}`
        ),
      });
      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 5);

      console.log(
        `AI selected the api endpoints as `,
        limitedApiEndpointsArray
      );

      const requests = limitedApiEndpointsArray.map(async (endpoint) => {
        const fullUrl = `https://api.blockvision.org${endpoint}`;
        const t = await makeBlockVisionApiRequest(fullUrl);
        // console.log("t is ", t);
        return t;
      });

      const results = await Promise.all(requests);

      return results;
    } catch (error: any) {
      console.error("Error in getMonadApiData:", error);
      Sentry.captureException(error);
      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error fetching Monad blockchain data.",
        error: error.message || "Unknown error",
      };
    }
  },
});
