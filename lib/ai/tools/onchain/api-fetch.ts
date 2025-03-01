import { getZerionApiKey } from "@/lib/utils";

export const fetchApi = async ({
  url,
  apiProvider,
}: {
  url: string;
  apiProvider: "zerion" | "etherscan";
}) => {
  try {
    console.log("EXECUTING API FETCH");
    console.log("url is ", url);

    let apiKey;
    if (apiProvider === "etherscan") {
      apiKey = process.env.ETHERSCAN_API_KEY;
    } else {
      apiKey = getZerionApiKey();
    }
    if (!apiKey) {
      throw Error(apiProvider + " api key not found");
    }
    console.log("api key is ", apiProvider, " = ", apiKey);

    let apiResult = undefined;

    if (apiProvider === "etherscan") {
      url = url.replace(/apikey=[^&]+/, ``);
      url = url + `&apikey=${apiKey}`;
      console.log("fetching data ------ ", url);
      const response = await fetch(`${url}`);
      const t = await response.json();
      apiResult = t.result;
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

    // Returning error details so AI can adapt its next action
    return {
      success: false,
      message: "Error in making api request.",
      error: error.message || "Unknown error",
    };
  }
};
