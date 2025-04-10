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
import {
  chunkSchemaFromIntrospection,
  embedAndStoreChunks,
  queryRelevantSchemaChunksWithBoosting,
  schemaExists,
} from "@/lib/pinecone";
import { getIntrospectionQuery } from "graphql";

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

                // create 3 variations of the search query
                const { object: search_query_array_obj } = await generateObject(
                  {
                    model: myProvider.languageModel("chat-model-small"),
                    schema: z.object({
                      search_query_array: z
                        .array(z.string())
                        .length(3)
                        .describe("search query variations"),
                    }),
                    system: `You are a subgraph name generator.

Given a user question, return 3 short search queries (1-3 words each) that match likely subgraph names or protocol names.

The results will be used to search on The Graph's explorer for the most relevant subgraphs. Keep names crisp and specific to the protocol, project, or tool mentioned in the user query.
.

                  For example if user query is "What are the top 10 Uniswap v3 pools on Base by volume?"
                  The search queries could be:
                  1. "Uniswap v3 Base "
                  2. "Uniswap v3  "
                  3. "Uniswap "`,
                    prompt: `Create 3 variations of the search query for the following user query.
                  User query: ${userQuery}`,
                  }
                );
                const search_query_array =
                  search_query_array_obj.search_query_array;
                console.log("search query : ", search_query_array);

                let subGraphsData: any[] = [];

                // search for subgraphs using the search query untill we find data
                let i = 0;
                while (
                  subGraphsData.length == 0 &&
                  i < search_query_array.length
                ) {
                  const searchQuery = search_query_array[i];
                  console.log("search query : ", searchQuery);
                  const searchQueryUrl = `https://thegraph.com/explorer/api/subgraphs/search?orderBy=Query+Count&orderDirection=desc&search=${searchQuery}&page=1;`;
                  console.log("search query names : ", searchQueryUrl);

                  const queryResponse = await fetch(searchQueryUrl);
                  const data: SubgraphResponseInfo = await queryResponse.json();
                  // console.log("sub graph data : ", data);

                  if (data.subgraphs.length == 0) {
                    console.log("no sub graph found");
                    i++;
                    continue;
                  }

                  // only take top 10 subgraphs
                  subGraphsData = data.subgraphs
                    .slice(0, 10)
                    .map((subgraph) => {
                      return {
                        id: subgraph.id,
                        displayName: subgraph.metadata.displayName,
                        description: subgraph.metadata.description,
                        catagories: subgraph.metadata.categories,
                        network:
                          subgraph.currentVersion.subgraphDeployment.manifest
                            .network,
                        queryVolume: subgraph.queryVolume,
                        createdAt: subgraph.createdAt,
                        updatedAt: subgraph.updatedAt,
                      };
                    });
                }

                if (subGraphsData.length == 0) {
                  return "No subgraph found for the given query, please try again";
                }
                // console.log("sub graph data : ", subGraphsData[0]);

                //chose the best subgraph
                const { object: bestSubgraphIdObj } = await generateObject({
                  model: myProvider.languageModel("chat-model-small"),
                  schema: z.object({
                    bestSubgraphId: z.string().describe("best subgraph id"),
                    displayName: z.string().describe("display name"),
                  }),
                  system: `You are a subgraph evaluator.

Select the best subgraph from the list below based on:
- How well it matches the user question
- Its query volume (higher is better)
- Network relevance

Return the best subgraph ID and its displayName.
.`,
                  prompt: `User query: ${userQuery}
                  Subgraph data: ${JSON.stringify(subGraphsData)}
                  `,
                });
                // const bestSubgraphId = bestSubgraphIdObj.bestSubgraphId;
                const bestSubgraphId =
                  "GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM";
                console.log(
                  "best subgraph id : ",
                  bestSubgraphIdObj.displayName
                );
                console.log("getting schema of  : ", bestSubgraphId);

                // Chunk and embed schema if not already in Pinecone
                const alreadyExists = await schemaExists(bestSubgraphId);
                if (!alreadyExists) {
                  //get schema from sub graph
                  const apiKey = process.env.THE_GRAPH_API_KEY;
                  if (!apiKey) {
                    return "API key is not defined";
                  }

                  const queryUrl = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${bestSubgraphId}`;
                  console.log("schema query url : ", queryUrl);

                  const body = {
                    query: getIntrospectionQuery(),
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
                  const schemaJson = await response.json();
                  if (!schemaJson || schemaJson.errors) {
                    console.error("Introspection error:", schemaJson.errors);
                    throw new Error(
                      "Invalid introspection result. GraphQL returned errors."
                    );
                    throw new Error(
                      "Invalid introspection result. GraphQL returned errors."
                    );
                  }

                  if (!schemaJson.data) {
                    throw new Error(
                      "Invalid introspection result: missing data property."
                    );
                  }

                  // Chunk and embed the schema
                  const chunks = await chunkSchemaFromIntrospection(
                    schemaJson.data
                  );
                  await embedAndStoreChunks(bestSubgraphId, chunks);
                  console.log("Stored schema chunks in Pinecone.");
                } else {
                  console.log("Schema chunks already exist in Pinecone.");
                }

                // Step 4: Query Pinecone for relevant schema chunks
                const relevantSchema =
                  await queryRelevantSchemaChunksWithBoosting(
                    bestSubgraphId,
                    userQuery
                  );
                // console.log(
                //   "Relevant schema chunks from Pinecone:",
                //   relevantSchema
                // );

                // Step 5: Generate GraphQL query using the relevant schema
                const { object: queryObj } = await generateObject({
                  model: myProvider.languageModel("chat-model-small"),
                  schema: z.object({
                    query: z.string().describe("graphql query"),
                  }),
                  system: `You are a GraphQL expert agent.

Using the schema and examples provided, generate a **valid GraphQL query** that answers the user query. Use the schema types, field names, and arguments. Make sure the query includes filters, ordering, and pagination if relevant.

DO NOT hallucinate fields that don't exist in the schema.

Format the output as a valid GraphQL query string.
.`,
                  prompt: ` Relevant schema chunks:
${relevantSchema}

Examples:

User: What are the top 10 pools by volume?
Query:
{
  pools(first: 10, orderBy: volumeUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    volumeUSD
  }
}

User: What is the highest TVL on Aerodrome?
Query:
{
  pools(first: 5, orderBy: totalValueLockedUSD, orderDirection: desc) {
    id
    token0 { symbol }
    token1 { symbol }
    totalValueLockedUSD
  }
}

Now generate a GraphQL query for:
User: ${userQuery}
`,
                });
                const query = queryObj.query;
                console.log("graphql query make by agent: ", query);
                // Step 6: Fetch data from the subgraph using the generated GraphQL query

                console.log("getting data of  : ", bestSubgraphId);
                const apiKey = process.env.THE_GRAPH_API_KEY;
                if (!apiKey) {
                  return "API key is not defined";
                }

                const queryUrl = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${bestSubgraphId}`;
                console.log("data query url : ", queryUrl);
                // console.log("graphql query : ", query);
                const body = {
                  query: query,
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
                    "Error fetching subgraph data:",
                    response.statusText
                  );
                  return "Error fetching subgraph data";
                }
                const dataJson = await response.json();
                // console.log("data json : ", dataJson);

                return dataJson;
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
