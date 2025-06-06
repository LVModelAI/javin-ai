import { tool } from "ai";
import { z } from "zod";
import { tavily } from "@tavily/core";
import * as Sentry from "@sentry/nextjs";
import { logInfo } from "../../utils/logging";
import { SearchGroupId } from "../../utils/utils";

function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, "%20");
}
async function isValidImageUrl(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
    });

    clearTimeout(timeout);

    return (
      response.ok &&
      (response.headers.get("content-type")?.startsWith("image/") ?? false)
    );
  } catch (error) {
    Sentry.captureException(error);
    return false;
  }
}

type webSearchToolInitParams = {
  mode?: SearchGroupId;
}


export const webSearch = ({ mode }: webSearchToolInitParams) => tool({
  description:
    "Search the web for information with multiple queries, max results and search depth.",
  parameters: z.object({
    queries: z.array(
      z.string().describe("Array of search queries to look up on the web.")
    ),
    maxResults: z.array(
      z
        .number()
        .describe("Array of maximum number of results to return per query.")
        .default(10)
    ),
    topics: z.array(
      z
        .enum(["general", "news"])
        .describe("Array of topic types to search for.")
        .default("general")
    ),
    searchDepth: z.array(
      z
        .enum(["basic", "advanced"])
        .describe("Array of search depths to use.")
        .default("basic")
    ),
    exclude_domains: z
      .array(z.string())
      .describe("A list of domains to exclude from all search results.")
      .default([]),
  }),
  execute: async ({
    queries,
    maxResults,
    topics,
    searchDepth,
    exclude_domains,
  }: {
    queries: string[];
    maxResults: number[];
    topics: ("general" | "news")[];
    searchDepth: ("basic" | "advanced")[];
    exclude_domains?: string[];
  }) => {
    logInfo("Running websearch ...")
    const apiKey = process.env.TAVILY_API_KEY;
    const tvly = tavily({ apiKey });
    const includeImageDescriptions = true;

    // domain filtering based on mode
    console.log("here 1")
    const { includeFromTool, excludeFromTool } = getIncludeAndExcludeDomainsBasedOnMode(mode)
    const combinedExcludeDomains = [
      ...(exclude_domains ?? []),
      ...(excludeFromTool ?? []),
    ];

    console.log("exluding domains: ", combinedExcludeDomains);
    console.log("including domains: ", includeFromTool ?? []);

    console.log("here 2")
    // Execute searches in parallel
    const searchPromises = queries.map(async (query, index) => {
      const data = await tvly.search(query, {
        topic: topics[index] || topics[0] || "general",
        days: topics[index] === "news" ? 7 : undefined,
        maxResults: maxResults[index] || maxResults[0] || 10,
        searchDepth: searchDepth[index] || searchDepth[0] || "basic",
        includeAnswer: true,
        includeImages: false,
        includeImageDescriptions: false,
        excludeDomains: combinedExcludeDomains,
        includeDomains: includeFromTool ?? [],
      });

      return {
        query,
        results: data.results.map((obj: any) => ({
          url: obj.url,
          title: obj.title,
          content: obj.content,
          raw_content: obj.raw_content,
          published_date:
            topics[index] === "news" ? obj.published_date : undefined,
        })),
        images: includeImageDescriptions
          ? await Promise.all(
            data.images.map(
              async ({
                url,
                description,
              }: {
                url: string;
                description?: string;
              }) => {
                const sanitizedUrl = sanitizeUrl(url);
                const isValid = await isValidImageUrl(sanitizedUrl);

                return isValid
                  ? {
                    url: sanitizedUrl,
                    description: description ?? "",
                  }
                  : null;
              }
            )
          ).then((results) =>
            results.filter(
              (
                image
              ): image is {
                url: string;
                description: string;
              } =>
                image !== null &&
                typeof image === "object" &&
                typeof image.description === "string" &&
                image.description !== ""
            )
          )
          : await Promise.all(
            data.images.map(async ({ url }: { url: string }) => {
              const sanitizedUrl = sanitizeUrl(url);
              return (await isValidImageUrl(sanitizedUrl))
                ? sanitizedUrl
                : null;
            })
          ).then((results) =>
            results.filter((url): url is string => url !== null)
          ),
      };
    });

    const searchResults = await Promise.all(searchPromises);

    return {
      searches: searchResults,
    };
  },
});


const getIncludeAndExcludeDomainsBasedOnMode = (mode?: SearchGroupId) => {
  if (mode === "nexus") {
    return {
      excludeFromTool: [
        "nexusxp2p.com",
        "nexus.io",
        "nexus - wiki.org",
        "nexusapi.cloud",
        "nexuschain.io",
        "https://www.linkedin.com/company/nexusblockchain"
      ],
      includeFromTool: ["nexus.xyz"],
    };
  } else {
    return {
      excludeFromTool: [],
      includeFromTool: [],
    };
  }
}