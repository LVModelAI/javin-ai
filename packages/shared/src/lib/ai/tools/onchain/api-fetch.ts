import { getZerionApiKey } from "../../../utils/utils";
import { makeBlockscoutApiRequest } from "../../../utils/make-blockscout-api-request";
import * as Sentry from "@sentry/nextjs";

export const fetchApi = async ({
  url,
  apiProvider,
}: {
  url: string;
  apiProvider: "zerion" | "blockscout";
}) => {
  try {
    console.log("EXECUTING API FETCH");
    console.log("url is ", url);

    let apiKey;
    if (apiProvider === "blockscout") {
      apiKey = process.env.BLOCKSCOUT_API_KEY;
    } else {
      apiKey = getZerionApiKey();
    }
    if (!apiKey) {
      throw Error(apiProvider + " api key not found");
    }
    console.log("api key is ", apiProvider, " = ", apiKey);

    let apiResult = undefined;

    if (apiProvider === "blockscout") {
      console.log("fetching data ------ ", url);
      const resultString = await makeBlockscoutApiRequest(url);
      const json = JSON.parse(resultString);
      apiResult = json;
      // console.log("apiResult ==== ", apiResult);
    } else {
      const options = {
        method: "GET",
        headers: {
          accept: "application/json",
          authorization: `Basic ${apiKey}`,
        },
      };
      console.log(options);
      console.log("fetching data ------ ", url);
      const response = await fetch(url, options);
      apiResult = await response.json();
    }
    if (!apiResult) {
      //@ts-ignore
      return "No results found.";
    }
    return apiResult;
  } catch (error: any) {
    console.error("Error in onChainQuery while fetching " + url + " : ", error);
    Sentry.captureException(error);

    // Returning error details so AI can adapt its next action
    return {
      success: false,
      message: "Error in making api request.",
      error: error.message || "Unknown error",
    };
  }
};
