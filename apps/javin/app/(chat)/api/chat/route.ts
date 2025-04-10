import {
  type Message,
  createDataStreamResponse,
  generateObject,
  generateText,
  smoothStream,
  streamText,
  tool,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@javin/shared/lib/ai/models";
import { allTools, getGroupConfig } from "@javin/shared/lib/ai/prompts";
import { logObjects, logInfo } from "@javin/shared/lib/utils/logging";
import {
  decrementRemainingMessageCount,
  deleteChatById,
  getChatById,
  getUser,
  getUserById,
  saveChat,
  saveMessages,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@javin/shared/lib/utils/utils";
import { generateTitleFromUserMessage } from "../../actions";
import { z } from "zod";

type SubgraphResponseInfo = {
  lastPage: boolean;
  subgraphs: SubgraphInfo[];
};

type SubgraphInfo = {
  id: string;
  active: boolean;
  entityVersion: number;
  metadata: {
    id: string;
    displayName: string;
    description: string | null;
    image: string;
    categories: string[] | null;
  };
  createdAt: number;
  updatedAt: number;
  currentSignalledTokens: string;
  currentVersion: {
    id: string;
    subgraphDeployment: {
      id: string;
      queryFeesAmount: string;
      ipfsHash: string;
      stakedTokens: string;
      manifest: {
        id: string;
        network: string;
      };
    };
  };
  owner: {
    id: string;
    metadata: any; // You can replace `any` with a more specific type if needed
    defaultDisplayName: string | null;
    defaultName: string | null;
    ens: string | null;
  };
  queryVolume: number;
};
import * as Sentry from "@sentry/nextjs";

export async function POST(request: Request) {
  logInfo("Received POST request for chat.");

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

  logObjects("Request data:", { id, messages, selectedChatModel, group });
  logObjects("Search group:", group);

  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    console.error("User not authenticated.");
    return new Response("Please login to start chatting!", { status: 401 });
  }
  logObjects("User session:", session.user);

  const { tools: activeTools, systemPrompt } = await getGroupConfig(group);
  logObjects("Group configuration loaded. Active tools:", activeTools);
  // logInfo("System prompt:", systemPrompt);

  const users = await getUserById(session.user.id!);
  const user_info = users[0];
  logObjects("Retrieved user info:", user_info);

  if (user_info.dailyMessageRemaining <= 0) {
    if (user_info.tier === "free") {
      console.warn(`User ${user_info.email} blocked: message limit exceeded`);
      return new Response(
        `Free Tier limit of ${process.env.FREE_USER_MESSAGE_LIMIT} messages/day reached! Upgrade to PRO for more usage and other perks!`,
        { status: 403 }
      );
    } else {
      console.warn(`User ${user_info.email} reached high demand limits.`);
      return new Response(
        `We're experiencing exceptionally high demand. Please hang tight as we work on scaling our systems!`,
        { status: 403 }
      );
    }
  }

  const userMessage = getMostRecentUserMessage(messages);
  if (!userMessage) {
    console.error("No user message found in the request.");
    return new Response("No user message found", { status: 400 });
  }
  logObjects("Most recent user message:", userMessage);

  const chat = await getChatById({ id });
  if (!chat) {
    logInfo("No existing chat found. Generating a new chat title.");
    const title = await generateTitleFromUserMessage({ message: userMessage });
    logInfo("Generated chat title: " + title);
    await saveChat({ id, userId: session.user.id, title });
    logInfo("New chat saved with id: " + id);
  } else {
    logInfo("Existing chat found with id: " + id);
  }

  logInfo("Saving user message to the database.");
  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  logInfo("Preparing to stream text with model: " + selectedChatModel);
  return createDataStreamResponse({
    execute: (dataStream) => {
      logInfo("Starting text stream execution.");

      if (selectedChatModel === "chat-model-reasoning") {
        logInfo(
          "Selected model is 'chat-model-reasoning'; no active tools will be used."
        );
      } else {
        logObjects("Active tools being used:", activeTools);
      }

      const result = streamText({
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
          onChainGraph: tool({
            description: "get on chain data from subgraphs.",
            parameters: z.object({
              userQuery: z.string().describe("User query to be answered."),
            }),
            execute: async ({ userQuery }) => {
              try {
                console.log("user query : ", userQuery);

                // Send initial status update (without steps count and extra details)
                console.log("onChainGraph: initialised");

                const aiResponse = await generateText({
                  model: myProvider.languageModel("chat-model-small"),
                  maxRetries: 3,
                  prompt: `user query : ${userQuery}`,
                  system: `You are a helpful assistant that helps to find data to answer user query using sub graphs.

                  The flow to find data and answer user query is as follows:
                  1. first try to find the top 10 most relevant sub graphs by using the getRelevantSubgraphsInfo tool. based on the user query, form a search query, and pass it to the getRelevantSubgraphsInfo tool. for example if the user query is : What are the top 10 Uniswap v3 pools on Base by volume?, then the searh query should be : uniswap v3 base. it returns the info of the top 10 most relevant subgraphs by name. if the tool did not return and subgraph info, try a different search query. you can try for 3 times. if the tool did not return any sub graph info after 3 tries then return no graphs found and ask user to give more details about the query. 
                  
                  2. using the info of the subgraphs, choose only one sub graph that is most relevant to the user query. if there are multiple sub graphs that are relevant, then choose the one that has the most query volume. if there are multiple sub graphs that have the same query volume, then choose the one that was created most recently. if there are multiple sub graphs that were created most recently, then choose the one that has the most recent updatedAt date. if there are multiple sub graphs that have the same updatedAt date, then choose the one that has the most recent createdAt date.

                
                  `,
                  tools: {
                    getRelevantSubgraphsInfo: tool({
                      description:
                        "get relevant sub graph information by search query.",
                      parameters: z.object({
                        search_query: z.string().describe("search query."),
                      }),
                      execute: async ({ search_query }) => {
                        console.log("search query : ", search_query);
                        const queryUrl = `https://thegraph.com/explorer/api/subgraphs/search?orderBy=Query+Count&orderDirection=desc&search=${search_query}&page=1`;
                        console.log("query url : ", queryUrl);

                        const response = await fetch(queryUrl);
                        const data: SubgraphResponseInfo =
                          await response.json();
                        // console.log("sub graph data : ", data);

                        if (data.subgraphs.length === 0) {
                          return "no graphs found";
                        }
                        // only take top 10 subgraphs
                        const subGraphsData = data.subgraphs
                          .slice(0, 10)
                          .map((subgraph) => {
                            return {
                              id: subgraph.id,
                              displayName: subgraph.metadata.displayName,
                              description: subgraph.metadata.description,
                              catagories: subgraph.metadata.categories,
                              network:
                                subgraph.currentVersion.subgraphDeployment
                                  .manifest.network,
                              queryVolume: subgraph.queryVolume,
                              createdAt: subgraph.createdAt,
                              updatedAt: subgraph.updatedAt,
                            };
                          });
                        console.log("sub graph data : ", subGraphsData[0]);

                        return subGraphsData;
                      },
                    }),

                    getSubgraphSchema: tool({
                      description: "get sub graph schema by sub graph id.",
                      parameters: z.object({
                        subgraphId: z.string().describe("sub graph id."),
                      }),
                      execute: async ({ subgraphId }) => {
                        console.log("getting schema of  : ", subgraphId);
                        const apiKey = process.env.THE_GRAPH_API_KEY;
                        if (!apiKey) {
                          return "API key is not defined";
                        }

                        const queryUrl = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${subgraphId}`;

                        const body = {
                          query:
                            "{ __schema { types { name fields { name type { name kind } } } } }",
                        };
                        const headers = {
                          "Content-Type": "application/json",
                        };
                        const response = await fetch(queryUrl, {
                          method: "POST",
                          headers,
                          body: JSON.stringify(body),
                        });
                        if (!response.ok) {
                          console.error(
                            "Error fetching subgraph schema:",
                            response.statusText
                          );
                          return "Error fetching subgraph schema";
                        }
                        const data = await response.json();

                        //only log first 100 chracters of the response
                        console.log(
                          "sub graph schema data : ",
                          JSON.stringify(data).slice(0, 100)
                        );
                        return "scmema data fetched, but query funtion wil coming soon";
                      },
                    }),
                  },
                  maxSteps: 5,
                });
                console.log("ai response : ", aiResponse.text);
                return aiResponse.text;
              } catch (error) {
                console.error("Error in onChainGraph:", error);
                return error; // Re-throw to allow handling by the caller
              }
            },
          }),
        },
        onStepFinish(event) {
          logInfo("Step finished.");
          logObjects("Step Event:", event);
        },
        onFinish: async ({ response, reasoning }) => {
          logInfo("Stream finished. Response received from model.");
          // logObjects("Response messages:", response.messages);
          // logObjects("Model reasoning:", reasoning);

          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });
              // logObjects(
              //   "Sanitized response messages:",
              //   sanitizedResponseMessages
              // );
              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => ({
                  id: message.id,
                  chatId: id,
                  role: message.role,
                  content: message.content,
                  createdAt: new Date(),
                })),
              });
              logInfo("Response messages saved to database.");
              await decrementRemainingMessageCount(session.user.id);
              logInfo("User's remaining message count decremented.");
            } catch (error) {
              Sentry.captureException(error);
              console.error("Failed to save chat", error);
            }
          }
        },
        experimental_telemetry: {
          isEnabled: true,
          functionId: "stream-text",
        },
      });

      logInfo(
        "Merging streaming result into dataStream with reasoning enabled."
      );
      result.mergeIntoDataStream(dataStream, { sendReasoning: true });
    },
    onError: (error: any) => {
      console.error("Error during text streaming:", error);
      Sentry.captureException(error);
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
    Sentry.captureException(error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}
