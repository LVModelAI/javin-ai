import * as Sentry from "@sentry/nextjs";

export const makeBlockVisionApiRequest = async (url: string) => {
  const apiKey = process.env.BLOCKVISION_API_KEY;
  if (!apiKey) {
    throw Error("blockvision api key not found");
  }
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      "x-api-key": apiKey,
    },
  };

  try {
    console.log("fetching data ------ ", url);
    const response = await fetch(url, options);

    const apiResult = await response.json();
    if (!apiResult) {
      //@ts-ignore
      return "No results found.";
    }
    const apiResultString = JSON.stringify(apiResult);
    // const result = scaleLargeNumbersInJson(apiResultString);
    return apiResultString;
  } catch (error: any) {
    console.error("Error in making api call:", url, error);
    Sentry.captureException(error);
    // Returning error details so AI can adapt its next action
    throw new Error("Error in making api call:", error);
  }
};
