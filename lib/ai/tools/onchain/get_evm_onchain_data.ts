import { generateObject, generateText, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../../models";
import {
  getAllPaths,
  getPathInfo,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from "@/lib/utils/openapi";
import zerionJson from "./zerion-openapi.json";
import { etherscanBaseURL, zerionBaseURL } from "./constant";
import { fetchApi } from "./api-fetch";
import { xai } from "@ai-sdk/xai";

export const getEvmOnchainData = tool({
  description: "Get real-time data from Ethereum based blockchains.",
  parameters: z.object({
    userQuery: z.string().describe("Query of user."),
  }),
  execute: async ({ userQuery }: { userQuery?: string }) => {
    try {
      console.log("EXECUTING GET API DOCS");
      console.log("user query ", userQuery);
      const zerionOpenapidata = await loadOpenAPIFromJson(zerionJson);
      const zerionAllPaths = await getAllPaths(zerionOpenapidata);

      const etherscanOpenapidata = await loadOpenAPI(
        "https://raw.githubusercontent.com/PurrProof/etherscan-openapi/refs/heads/main/etherscan-openapi31-bundled.yml"
      );
      const etherscanAllPaths = await getAllPaths(etherscanOpenapidata);

      // choose just the path based on summary from openapi spec
      const { object } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        system: `there are 2 different api providers to fetch information about ethereum based blockchain. one is zerion and other is etherscan. you will just return the name of the api provider and its respective endpoint path in the given list of endpoint path and their summary, which can be helpfull to answers user query. do not modify it in any way.`,
        prompt: `The list of api endpoints and their summary for the api provider zerion is ${zerionAllPaths} and for the api provider etherscan is ${etherscanAllPaths} and user Query is ${userQuery}`,
        output: "array",
        schema: z.object({
          apiProvider: z.enum(["zerion", "etherscan"]),
          apiPath: z.string(),
        }),
      });
      // console.log("OBJECT IS ", object);

      const allResponses = await Promise.all(
        object.map(async (obj) => {
          let apiEndpointName = obj.apiPath;
          // console.log("apiEndpointName is ", apiEndpointName);
          if (
            apiEndpointName.startsWith('"') &&
            apiEndpointName.endsWith('"')
          ) {
            apiEndpointName = apiEndpointName.slice(1, -1);
          }
          let baseUrl = "";
          switch (obj.apiProvider) {
            case "etherscan":
              baseUrl = etherscanBaseURL;
              break;
            case "zerion":
              baseUrl = zerionBaseURL;
              break;
            default:
              break;
          }
          const url = `${baseUrl}${apiEndpointName}`;
          console.log(`AI selected the api endpoint as ${url}`);

          const apiEndpointInfo = await getPathInfo(
            obj.apiProvider === "zerion"
              ? zerionOpenapidata
              : etherscanOpenapidata,
            apiEndpointName
          );
          if (apiEndpointInfo) {
            // console.log("found api info for = ", url, apiEndpointInfo);
          }
          const apiEndpointInfoString = JSON.stringify(apiEndpointInfo);

          // generate actual url with apropriate params to query.
          const { object: urlToCall } = await generateObject({
            model: myProvider.languageModel("chat-model-small"),
            system: `you will be provided with the openapi spec of an api. use the spec to the best of your knowledge to return a url with parameters which will fetch the neccesary information which is requested in the user query. dont fetch too many transactions in one go untill and unless asked for, limit it to fetch only 5 recent transaction.`,
            prompt: `The url = ${url}. The api openapi spec = ${apiEndpointInfoString}. User query = ${userQuery}`,
            schema: z.object({
              apiUrl: z.string(),
            }),
          });

          console.log("urlToCall = ", urlToCall);

          const result = await fetchApi({
            url: urlToCall.apiUrl,
            apiProvider: obj.apiProvider,
          });
          console.log("summarizeing the response...");
          // summarize the response
          const { text } = await generateText({
            model: myProvider.languageModel("chat-model-small"),
            system: `you will be provided with the response from a ethereum based blockchain api. summarize the response. do not modify it in any way.`,
            prompt: `User query was = ${userQuery}. The api was = ${url}. The api response is = ${JSON.stringify(
              result
            )}.`,
          });

          console.log("summarised text --- ", text);

          return { apiEndpointName: apiEndpointName, result: text };
        })
      );

      // console.log("allResponses is ", allResponses);
      //   const allResponsesString = JSON.stringify(allResponses);

      return {
        success: true,
        result: allResponses,
      };
    } catch (error: any) {
      console.error("Error in getEvmOnchainData:", error);

      // Returning error details so AI can adapt its next action
      return {
        success: false,
        message: "Error retrieving API documentation.",
        error: error.message || "Unknown error",
      };
    }
  },
});
