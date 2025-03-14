// app/(chat)/api/chat/route.ts
import {
  type Message,
  createDataStreamResponse,
  generateText,
  smoothStream,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@javin/shared/lib/ai/models";
import { getGroupConfig } from "@javin/shared/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  getUser,
  incrementMessageCount,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  getZerionApiKey,
  sanitizeResponseMessages,
} from "@javin/shared/lib/utils/utils";

import * as allTools from "@javin/shared/lib/ai/tools/tools";
import { generateTitleFromUserMessage } from "../../actions";
import { tavily } from "@tavily/core";
import { generateObject, tool } from "ai";
import { z } from "zod";
import Exa from "exa-js";
import { openai } from "@ai-sdk/openai";
import { loadOpenAPIFromJson } from "@javin/shared/lib/utils/openapi";
import { zerionBaseURL } from "@javin/shared/lib/ai/tools/onchain/constant";
import { getAllPathsAndDesc } from "@javin/shared/lib/utils/openapi";
import { getPathDetails } from "@javin/shared/lib/utils/openapi";
import zerionJson from "@javin/shared/lib/ai/tools/onchain/zerion-openapi.json";
import { multichainEnsLookup } from "@javin/shared/lib/utils/multichain-ens-lookup";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
    group,
  }: {
    id: string;
    messages: Array<Message>;
    selectedChatModel: string;
    group: any;
  } = await request.json();

  console.log("search groupe", group);
  console.log("model", selectedChatModel);
  const session = await auth();
  const { tools: activeTools, systemPrompt } = await getGroupConfig(group);

  if (!session || !session.user || !session.user.id) {
    return new Response("Please login to start chatting!", { status: 401 });
  }
  const users = await getUser(session.user.email!);
  const user_info = users[0];
  console.log("user infor ", session.user);
  if (
    user_info.tier == "free" &&
    user_info.messageCount >= Number(process.env.FREE_USER_MESSAGE_LIMIT!)
  ) {
    // console.log("totmsg ", user_info.messageCount);
    return new Response(
      "Message limit reached!  Upgrade to PRO for more usage and other perks!",
      {
        status: 403,
      }
    );
  }
  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.user.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        onChunk: (chunk) => {
          // console.log("chunk ------------------------ ", chunk);
        },
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt,
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning" ? [] : [...activeTools],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: {
          ...allTools,
          deepSearch: tool({
            description:
              "Perform a reasoned web and on-chain search with multiple steps and sources.",
            parameters: z.object({
              topic: z
                .string()
                .describe("The main topic or question to answer"),
              depth: z
                .enum(["basic", "advanced"])
                .describe("Search depth level")
                .default("basic"),
            }),
            execute: async ({
              topic,
              depth,
            }: {
              topic: string;
              depth: "basic" | "advanced";
            }) => {
              console.log("deepsearch topic ", topic);
              console.log("deepsearch depth ", depth);
              const apiKey = process.env.TAVILY_API_KEY;
              const tvly = tavily({ apiKey });
              const exa = new Exa(process.env.EXA_API_KEY as string);

              // Send initial plan status update (without steps count and extra details)
              dataStream.writeMessageAnnotation({
                type: "search_update",
                data: {
                  id: "search-plan-initial", // unique id for the initial state
                  type: "plan",
                  status: "running",
                  title: "Research Plan",
                  message: "Creating search plan...",
                  timestamp: Date.now(),
                  overwrite: true,
                },
              });

              console.log("generating search plan");
              // Now generate the search plan
              const { object: searchPlan } = await generateObject({
                //@ts-ignore
                model: openai("gpt-4"),
                temperature: 0,
                schema: z.object({
                  search_queries: z
                    .array(
                      z.object({
                        query: z.string(),
                        rationale: z.string(),
                        source: z.enum(["web", "zerion", "x", "ens", "all"]),
                        priority: z.number().min(1).max(5),
                      })
                    )
                    .max(12),
                  required_analyses: z
                    .array(
                      z.object({
                        type: z.string(),
                        description: z.string(),
                        importance: z.number().min(1).max(5),
                      })
                    )
                    .max(8),
                }),
                prompt: `Create a focused search plan for the topic: "${topic}". 
                        
                        Today's date and day of the week: ${new Date().toLocaleDateString(
                          "en-US",
                          {
                            weekday: "long",
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          }
                        )}
                
                        Keep the plan concise but comprehensive, with:
                        - 1-5 targeted search queries (each can use web, zerion, x (Twitter), or all sources)
                        - 1-3 key analyses to perform
                        - Prioritize the most important aspects to investigate
                        
                        Available sources:
                        - "web": General web search
                        - "zerion": Search through Zerion for on-chain data
                        - "ens": Search for ENS names, like name.eth and get corresponding addresses. pass the ens name as query
                        - "x": Search through X/Twitter for relevant tweets
                        
                        Ensure each search query has a clear rationale and priority level.
                        
                        Do not use floating numbers, use whole numbers only in the priority field!!
                        Do not keep the numbers too low or high, make them reasonable in between.
                        Do not use 0 or 1 in the priority field, use numbers between 2 and 4.
                        Ensure the total number of steps (searches + analyses) does not exceed 20.`,
              });

              console.log("search plan ", searchPlan);

              // Generate IDs for all steps based on the plan
              const generateStepIds = (plan: typeof searchPlan) => {
                // Generate an array of search steps.
                const searchSteps = plan.search_queries.flatMap(
                  (query, index) => {
                    if (query.source === "all") {
                      return [
                        { id: `search-web-${index}`, type: "web", query },
                        {
                          id: `search-zerion-${index}`,
                          type: "zerion",
                          query,
                        },
                        { id: `search-x-${index}`, type: "x", query },
                      ];
                    }
                    if (query.source === "x") {
                      return [{ id: `search-x-${index}`, type: "x", query }];
                    }
                    if (query.source === "ens") {
                      return [
                        { id: `search-ens-${index}`, type: "ens", query },
                      ];
                    }
                    const searchType =
                      query.source === "zerion" ? "zerion" : "web";
                    return [
                      {
                        id: `search-${searchType}-${index}`,
                        type: searchType,
                        query,
                      },
                    ];
                  }
                );
                console.log("search steps ", searchSteps);

                // Generate an array of analysis steps.
                const analysisSteps = plan.required_analyses.map(
                  (analysis, index) => ({
                    id: `analysis-${index}`,
                    type: "analysis",
                    analysis,
                  })
                );

                return {
                  planId: "search-plan",
                  searchSteps,
                  analysisSteps,
                };
              };

              const stepIds = generateStepIds(searchPlan);
              let completedSteps = 0;
              const totalSteps =
                stepIds.searchSteps.length + stepIds.analysisSteps.length;

              // Complete plan status
              dataStream.writeMessageAnnotation({
                type: "search_update",
                data: {
                  id: stepIds.planId,
                  type: "plan",
                  status: "completed",
                  title: "Search Plan",
                  plan: searchPlan,
                  totalSteps: totalSteps,
                  message: "Search plan created",
                  timestamp: Date.now(),
                  overwrite: true,
                },
              });

              const searchResults = [];
              let searchIndex = 0; // Add index tracker

              // Execute searches
              for (const step of stepIds.searchSteps) {
                // Send running annotation for this search step
                dataStream.writeMessageAnnotation({
                  type: "search_update",
                  data: {
                    id: step.id,
                    type: step.type,
                    status: "running",
                    title:
                      step.type === "web"
                        ? `Searching the web for "${step.query.query}"`
                        : step.type === "zerion"
                        ? `Searching the blockchain for "${step.query.query}"`
                        : step.type === "x"
                        ? `Searching X/Twitter for "${step.query.query}"`
                        : step.type === "ens"
                        ? `Searching for you in the blockchain"`
                        : `Analyzing ${step.query.query}`,
                    query: step.query.query,
                    message: `Searching ${step.query.source} sources...`,
                    timestamp: Date.now(),
                  },
                });

                if (step.type === "web") {
                  const webResults = await tvly.search(step.query.query, {
                    searchDepth: depth,
                    includeAnswer: true,
                    maxResults: Math.min(6 - step.query.priority, 10),
                  });
                  console.log(
                    "web results ",
                    webResults.results[0].content.slice(0, 100)
                  );

                  searchResults.push({
                    type: "web",
                    query: step.query,
                    results: webResults.results.map((r) => ({
                      source: "web",
                      title: r.title,
                      url: r.url,
                      content: r.content,
                    })),
                  });
                  completedSteps++;
                } else if (step.type === "zerion") {
                  // use another smaller model to fetch the data from zerion
                  const userQuery = step.query.query;
                  console.log("searching zerion for query ", userQuery);
                  const apiKey = getZerionApiKey();
                  if (!apiKey) {
                    throw Error("zerion api key not found");
                  }

                  const zerionOpenapidata = await loadOpenAPIFromJson(
                    zerionJson
                  );
                  const zerionAllPathsAndDesc = await getAllPathsAndDesc(
                    zerionOpenapidata
                  );

                  const aiAgentResponse = await generateText({
                    model: myProvider.languageModel("gpt-4o-mini"),
                    system: `You are an intelligent API assistant. Your job is to process user queries and provide the most relevant blockchain data in a user-friendly format.
                    
                      ## How to Process User Queries:
                      1. **Match User Query to API Path**:  
                         - Analyze the user's question.  
                         - Select the API path whose description best matches the intent of the query.  
                    
                      2. **Retrieve Required Parameters**:  
                         - Use the **getPathParameters** tool to fetch all necessary parameters.  
                         - pass The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'
                         - If any required parameters are missing, prompt the user for input.  
                    
                      3. **Construct and Execute API Call**:  
                         - Form a complete API URL using the **base URL** (${zerionBaseURL}) and the retrieved parameters.  
                         - Use the **makeApiCall** tool to fetch data.
                      
                      ## **Final Response Format:**  
                      - Always provide a **clear, structured, human-readable answer** to the user.  
                      - Do **not** return raw JSON unless explicitly requested.  
                      - If no relevant data is found, respond appropriately instead of returning an empty result. 
                       
                      `,
                    prompt: JSON.stringify(
                      `User query: "${userQuery}". Available API paths and descriptions: ${zerionAllPathsAndDesc}. Base URL: ${zerionBaseURL}`
                    ),
                    tools: {
                      getPathParameters: tool({
                        description:
                          "Retrieve all parameters required for a given API path.",
                        parameters: z.object({
                          path: z
                            .string()
                            .describe(
                              "The API path, e.g., '/v1/wallets/{address}/charts/{chart_period}'"
                            ),
                        }),
                        execute: async ({ path }) => {
                          console.log("Fetching parameters for path:", path);
                          const zerionPathsDetails = await getPathDetails(
                            zerionOpenapidata,
                            path
                          );
                          return zerionPathsDetails;
                        },
                      }),
                      makeApiCall: tool({
                        description:
                          "Fetch real-time blockchain data from Zerion API.",
                        parameters: z.object({
                          url: z.string().describe("The full API query URL."),
                        }),
                        execute: async ({ url }) => {
                          try {
                            console.log("fetching --- ", url);
                            const options = {
                              method: "GET",
                              headers: {
                                accept: "application/json",
                                authorization: `Basic ${apiKey}`,
                              },
                            };
                            const response = await fetch(url, options);
                            if (!response.ok)
                              throw new Error(
                                `API call failed with status ${response.status}`
                              );
                            const json = await response.json();
                            // console.log("Fetched API response:", json);
                            return json; // Return parsed JSON data for further processing
                          } catch (error) {
                            console.error("Error fetching API data:", error);
                            return {
                              error: "Failed to fetch data from the API.",
                            };
                          }
                        },
                      }),
                    },
                    maxSteps: 5,
                  });

                  console.log(`AI response is `, aiAgentResponse.text);

                  searchResults.push({
                    type: "zerion",
                    query: step.query,
                    results: [
                      {
                        source: "zerion" as const,
                        title: userQuery,
                        url: "",
                        content: aiAgentResponse.text,
                        tweetId: "zerion",
                      },
                    ],
                  });
                  completedSteps++;
                } else if (step.type === "x") {
                  // Extract tweet ID from URL
                  const extractTweetId = (url: string): string | null => {
                    const match = url.match(
                      /(?:twitter\.com|x\.com)\/\w+\/status\/(\d+)/
                    );
                    return match ? match[1] : null;
                  };

                  const xResults = await exa.searchAndContents(
                    step.query.query,
                    {
                      type: "neural",
                      useAutoprompt: true,
                      numResults: step.query.priority,
                      text: true,
                      highlights: true,
                      includeDomains: ["twitter.com", "x.com"],
                    }
                  );

                  // Process tweets to include tweet IDs
                  const processedTweets = xResults.results
                    .map((result) => {
                      const tweetId = extractTweetId(result.url);
                      return {
                        source: "x" as const,
                        title: result.title || result.author || "Tweet",
                        url: result.url,
                        content: result.text || "",
                        tweetId: tweetId || undefined,
                      };
                    })
                    .filter((tweet) => tweet.tweetId); // Only include tweets with valid IDs

                  searchResults.push({
                    type: "x",
                    query: step.query,
                    results: processedTweets,
                  });
                  completedSteps++;
                } else if (step.type === "ens") {
                  const address = await multichainEnsLookup(step.query.query);
                  searchResults.push({
                    type: "ens",
                    query: step.query,
                    results: [
                      {
                        source: "ens" as const,
                        title: step.query.query,
                        url: "",
                        content: address,
                      },
                    ],
                  });
                  completedSteps++;
                }

                // Send completed annotation for the search step
                dataStream.writeMessageAnnotation({
                  type: "search_update",
                  data: {
                    id: step.id,
                    type: step.type,
                    status: "completed",
                    title:
                      step.type === "web"
                        ? `Searched the web for "${step.query.query}"`
                        : step.type === "zerion"
                        ? `Searched the blockchain for "${step.query.query}"`
                        : step.type === "x"
                        ? `Searched X/Twitter for "${step.query.query}"`
                        : step.type === "ens"
                        ? `Found you in the blockchain`
                        : `Analysis of ${step.query.query} complete`,
                    query: step.query.query,
                    results: searchResults[
                      searchResults.length - 1
                    ].results.map((r) => {
                      return { ...r };
                    }),
                    message: `Found ${
                      searchResults[searchResults.length - 1].results.length
                    } results`,
                    timestamp: Date.now(),
                    overwrite: true,
                  },
                });

                searchIndex++; // Increment index
              }

              // Perform analyses
              let analysisIndex = 0; // Add index tracker

              for (const step of stepIds.analysisSteps) {
                dataStream.writeMessageAnnotation({
                  type: "search_update",
                  data: {
                    id: step.id,
                    type: "analysis",
                    status: "running",
                    title: `Analyzing ${step.analysis.type}`,
                    analysisType: step.analysis.type,
                    message: `Analyzing ${step.analysis.type}...`,
                    timestamp: Date.now(),
                  },
                });

                const { object: analysisResult } = await generateObject({
                  //@ts-ignore
                  model: openai("gpt-4"),
                  temperature: 0.5,
                  schema: z.object({
                    findings: z.array(
                      z.object({
                        insight: z.string(),
                        evidence: z.array(z.string()),
                        confidence: z.number().min(0).max(1),
                      })
                    ),
                    implications: z.array(z.string()),
                    limitations: z.array(z.string()),
                  }),
                  prompt: `Perform a ${
                    step.analysis.type
                  } analysis on the search results. ${step.analysis.description}
                            Consider all sources and their reliability.
                            Search results: ${JSON.stringify(searchResults)}`,
                });

                dataStream.writeMessageAnnotation({
                  type: "search_update",
                  data: {
                    id: step.id,
                    type: "analysis",
                    status: "completed",
                    title: `Analysis of ${step.analysis.type} complete`,
                    analysisType: step.analysis.type,
                    findings: analysisResult.findings,
                    message: `Analysis complete`,
                    timestamp: Date.now(),
                    overwrite: true,
                  },
                });

                analysisIndex++; // Increment index
              }

              // After all analyses are complete, send running state for gap analysis
              dataStream.writeMessageAnnotation({
                type: "search_update",
                data: {
                  id: "gap-analysis",
                  type: "analysis",
                  status: "running",
                  title: "Research Gaps and Limitations",
                  analysisType: "gaps",
                  message: "Analyzing search gaps and limitations...",
                  timestamp: Date.now(),
                },
              });

              // Final progress update
              const finalProgress = {
                id: "search-progress",
                type: "progress" as const,
                status: "completed" as const,
                message: `Research complete`,
                completedSteps: totalSteps + (depth === "advanced" ? 2 : 1),
                totalSteps: totalSteps + (depth === "advanced" ? 2 : 1),
                isComplete: true,
                timestamp: Date.now(),
              };

              dataStream.writeMessageAnnotation({
                type: "search_update",
                data: {
                  ...finalProgress,
                  overwrite: true,
                },
              });

              return {
                plan: searchPlan,
                results: searchResults,
              };
            },
          }),
        },
        onFinish: async ({ response, reasoning }) => {
          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });

              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => {
                  return {
                    id: message.id,
                    chatId: id,
                    role: message.role,
                    content: message.content,
                    createdAt: new Date(),
                  };
                }),
              });
              await incrementMessageCount(session.user.id);
            } catch (error) {
              console.error("Failed to save chat");
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
      });

      result.mergeIntoDataStream(dataStream, {
        sendReasoning: true,
      });
    },
    onError: (error: any) => {
      console.log(error);
      return "Oops, something went wrong!. Please try again in new chat";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
