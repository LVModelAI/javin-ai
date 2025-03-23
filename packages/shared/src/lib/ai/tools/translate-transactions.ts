import {
  getAllPaths,
  getAllPathsAndDesc,
  loadOpenAPI,
  loadOpenAPIFromJson,
} from  "../../utils/openapi";
import { generateObject, tool } from "ai";
import { z } from "zod";
import { myProvider } from "../models";

export const novesSupportedChains = [
  "arbitrum",
  "arbitrum-nova",
  "artela",
  "astar",
  "avalanche",
  "avalanche-fuji",
  "base",
  "berachain-bartio",
  "blast",
  "bsc",
  "camp-testnet",
  "camp-testnet-v2",
  "celo",
  "chiliz",
  "core",
  "cronos",
  "degen",
  "eth",
  "eth-holesky",
  "eth-sepolia",
  "ethxy-testnet",
  "fantom",
  "flow-evm",
  "fluent-devnet",
  "fraxtal",
  "fuse",
  "gelato-testnet-arbitrum-blueberry",
  "gelato-testnet-optimism-raspberry",
  "gelato-testnet-polygon-blackberry",
  "gnosis",
  "ink",
  "ink-sepolia",
  "kava-evm",
  "lightlink",
  "linea",
  "lukso",
  "manta-pacific",
  "mantle",
  "matchain",
  "metal",
  "metis",
  "mode",
  "moonbeam",
  "moonriver",
  "morph",
  "morph-holesky-testnet",
  "movement-mevm",
  "optimism",
  "orderly-network",
  "plume-devnet",
  "polygon",
  "polygon-zkevm",
  "pulsechain",
  "rari",
  "rollux",
  "rollux-testnet",
  "scroll",
  "sophon-testnet",
  "superposition-testnet",
  "superseed-sepolia",
  "taiko-katla",
  "telos",
  "xai",
  "xdc",
  "zetachain-evm",
  "zetachain-evm-testnet",
  "zksync-era",
  "zora",
] as const;

export const translateTransactions = tool({
  description:
    "Translate raw blockchain transactions into human-friendly, enriched form.",
  parameters: z.object({
    transactionDetails: z.string().describe("Details of the transaction."),
    chain: z
      .enum(novesSupportedChains)
      .describe("Evm chain name")
      .default("eth"),
    userQuery: z.string().describe("query of the user"),
  }),
  execute: async ({ transactionDetails, chain, userQuery }) => {
    const novesApiKey = process.env.NOVES_API_KEY;
    if (!novesApiKey) {
      console.log(" NOVES_API_KEY not found!!");
      return "failed to summarize transaction";
    }
    try {
      console.log("getting txn summary...");
      const openapidata = await loadOpenAPI(
        "https://translate.noves.fi/swagger/v1/swagger.json"
      );
      const novesOpenapidata = await loadOpenAPIFromJson(openapidata);
      const novesAllPathsAndDesc = await getAllPathsAndDesc(novesOpenapidata);

      // console.log("transaction data is  ----------- ", transactionDetails);

      const { object: apiEndpointsArray } = await generateObject({
        model: myProvider.languageModel("chat-model-small"),
        output: "array",
        schema: z.string().describe("the api endpoint"),
        system: `\n
        You are provided the list of Translate APIs endpoints. The Translate APIs categorize transactions, standardizing them across chains and across protocols to produce a rich set of data that allows you to translate the transactions in to human readable format. They readily support accounting and finance scenarios, along with any system that benefits from structured and tagged data.supported chains are ${novesSupportedChains}. use these chain names in the query url.`,
        prompt: JSON.stringify(
          `The list of api endpoints and their descriptions are ${novesAllPathsAndDesc} and user Query is ${userQuery} and the chain is ${chain} and the transaction details are ${transactionDetails}`
        ),
      });

      // only take 3 endpoints to avoid rate limiting
      const limitedApiEndpointsArray = apiEndpointsArray.slice(0, 3);

      console.log(
        `AI selected the api endpoints as `,
        limitedApiEndpointsArray
      );

      const options = {
        method: "GET",
        headers: { accept: "application/json", apiKey: novesApiKey! },
      };

      // make the api calls
      const requests = limitedApiEndpointsArray.map((endpoint) => {
        const fullUrl = `https://translate.noves.fi${endpoint}`;
        return fetch(fullUrl, options); // Return the promise
      });

      const results = await Promise.all(
        requests.map(async (request) => {
          try {
            const response = await request;
            const json = await response.json();
            console.log("API Response:", json);
            return json;
          } catch (error) {
            console.error("Error parsing API response:", error);
            return null;
          }
        })
      );

      console.log("Final parsed results:", results);
      return results;
    } catch (error) {
      console.error("Error in summarizing transactions:", error);
      return error; // Re-throw to allow handling by the caller
    }
  },
});
