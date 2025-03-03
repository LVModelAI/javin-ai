function scaleLargeNumbersInJson(jsonString: string): string {
  return jsonString.replace(/"(\d{15,})"/g, (_match, num) => {
    const scaledNum = (Number(num) / 1e18).toFixed(8) + " (scaled)";
    return `"${scaledNum} (scaled)"`;
  });
}

export const makeBlockscoutApiRequest = async (url: string) => {
  const apiKey = process.env.BLOCKSCOUT_API_KEY;
  if (!apiKey) {
    throw Error("blockscout api key not found");
  }
  const options = {
    method: "GET",
    headers: {
      accept: "application/json",
      authorization: `Basic ${apiKey}`,
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
    const result = scaleLargeNumbersInJson(apiResultString);
    return result;
  } catch (error: any) {
    console.error("Error in making api call:", error);

    // Returning error details so AI can adapt its next action
    throw new Error("Error in making api call:", error);
  }
};
