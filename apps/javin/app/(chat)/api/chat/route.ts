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

function encodeInternalSpacesOnly(query: string) {
  // Extract leading/trailing spaces
  const leading = query.match(/^ */)?.[0] ?? "";
  const trailing = query.match(/ *$/)?.[0] ?? "";

  // Trim internal part and encode only internal spaces
  const middle = query.trim().replace(/ /g, "%20");

  return `${leading}${middle}${trailing}`;
}

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

  // logObjects("Request data:", { id, messages, selectedChatModel, group });
  // logObjects("Search group:", group);

  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    console.error("User not authenticated.");
    return new Response("Please login to start chatting!", { status: 401 });
  }
  // logObjects("User session:", session.user);

  const { tools: activeTools, systemPrompt } = await getGroupConfig(group);
  // logObjects("Group configuration loaded. Active tools:", activeTools);
  // logInfo("System prompt:", systemPrompt);

  const users = await getUserById(session.user.id!);
  const user_info = users[0];
  // logObjects("Retrieved user info:", user_info);

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
  // logObjects("Most recent user message:", userMessage);

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

  // check if the selected model is a legacy model
  let modelToUse = selectedChatModel;
  if (selectedChatModel === "chat-model-small") {
    logInfo("Legacy model ID detected. Switching to 'gpt-4o-mini'.");
    modelToUse = "gpt-4o-mini";
  }
  if (selectedChatModel === "chat-model-large") {
    logInfo("Legacy model ID detected. Switching to 'gpt-4o'.");
    modelToUse = "gpt-4o";
  }

  logInfo("Preparing to stream text with model: " + modelToUse);
  return createDataStreamResponse({
    execute: (dataStream) => {
      logInfo("Starting text stream execution.");

      if (modelToUse === "chat-model-reasoning") {
        logInfo(
          "Selected model is 'chat-model-reasoning'; no active tools will be used."
        );
      } else {
        logObjects("Active tools being used:", activeTools);
      }

      const result = streamText({
        model: myProvider.languageModel(modelToUse),
        system: systemPrompt,
        messages,
        maxSteps: 5,
        experimental_activeTools:
          modelToUse === "chat-model-reasoning" ? [] : [...activeTools],
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
                logObjects("user query : ", userQuery);

                // Send initial status update (without steps count and extra details)
                logInfo("onChainGraph: initialised");

                // create 3 variations of the search query
                const { object: search_query_array_obj } = await generateObject(
                  {
                    model: myProvider.languageModel("gpt-4o"),
                    schema: z.object({
                      search_query_array: z
                        .array(z.string())
                        .length(3)
                        .describe("search query variations"),
                    }),
                    system: `You are a protocol name finder. 
                    find the  protocol or chain name from the user query , and make 3 variations of it , based on version, chains, etc. 
                    do not add any metrics or other details.
                    only include the protocol name and chain name and version in the search query.
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
                logObjects("search query : ", search_query_array);

                let subGraphsData: any[] = [];

                // search for subgraphs using the search query untill we find data
                let i = 0;
                while (
                  subGraphsData.length == 0 &&
                  i < search_query_array.length
                ) {
                  const searchQuery = search_query_array[i];
                  logObjects("search query : ", searchQuery);
                  //remove spaces from the start and end of the query
                  const trimmedQuery = searchQuery.trim();
                  // Encode spaces in the middle of the query
                  const encodedQuery = encodeInternalSpacesOnly(trimmedQuery);
                  const searchQueryUrl = `https://thegraph.com/explorer/api/subgraphs/search?orderBy=Query+Count&orderDirection=desc&search=${encodedQuery}&page=1`;

                  logObjects("search query names : ", searchQueryUrl);

                  const queryResponse = await fetch(searchQueryUrl);
                  const data: SubgraphResponseInfo = await queryResponse.json();
                  // logObjects("sub graph data : ", data);

                  if (data.subgraphs.length == 0) {
                    logInfo("no sub graph found");
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
                logObjects("sub graph data : ", subGraphsData);

                //chose the best subgraph
                const { object: bestSubgraphIdObj } = await generateObject({
                  model: myProvider.languageModel("gpt-4o"),
                  schema: z.object({
                    bestSubgraphId: z.string().describe("best subgraph id"),
                  }),
                  system: `You are a subgraph evaluator.

Select the best subgraph from the list below based on:
- How well it matches the user question
- Its query volume (higher is better)
- Network relevance

Return the best subgraph ID 
.`,
                  prompt: `User query: ${userQuery}
                  Subgraph data: ${JSON.stringify(subGraphsData)}
                  `,
                });
                const bestSubgraphId = bestSubgraphIdObj.bestSubgraphId;
                logObjects("best subgraph id : ", bestSubgraphId);
                const bestSubgraph = subGraphsData.find(
                  (subgraph) => subgraph.id === bestSubgraphId
                );
                if (!bestSubgraph) {
                  return "No subgraph found for the given query, please try again";
                }
                logObjects("best subgraph : ", bestSubgraph.displayName);
                // const bestSubgraphId =
                //   "GENunSHWLBXm59mBSgPzQ8metBEp9YDfdqwFr91Av1UM";

                logObjects("getting schema of  : ", bestSubgraphId);

                // Chunk and embed schema if not already in Pinecone
                const alreadyExists = await schemaExists(bestSubgraphId);
                if (!alreadyExists) {
                  //get schema from sub graph
                  const apiKey = process.env.THE_GRAPH_API_KEY;
                  if (!apiKey) {
                    return "API key is not defined";
                  }

                  const queryUrl = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${bestSubgraphId}`;
                  logObjects("schema query url : ", queryUrl);

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
                  logInfo("Stored schema chunks in Pinecone.");
                } else {
                  logInfo("Schema chunks already exist in Pinecone.");
                }

                // Step 4: Query Pinecone for relevant schema chunks
                const relevantSchema =
                  await queryRelevantSchemaChunksWithBoosting(
                    bestSubgraphId,
                    userQuery
                  );
                // logObjects(
                //   "Relevant schema chunks from Pinecone:",
                //   relevantSchema
                // );

                // Step 5: Generate GraphQL query using the relevant schema
                const { object: queryObj } = await generateObject({
                  model: myProvider.languageModel("gpt-4o"),
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
                logObjects("graphql query make by agent: ", query);
                // Step 6: Fetch data from the subgraph using the generated GraphQL query

                logObjects("getting data of  : ", bestSubgraphId);
                const apiKey = process.env.THE_GRAPH_API_KEY;
                if (!apiKey) {
                  return "API key is not defined";
                }

                const queryUrl = `https://gateway.thegraph.com/api/${apiKey}/subgraphs/id/${bestSubgraphId}`;
                logObjects("data query url : ", queryUrl);
                // logObjects("graphql query : ", query);
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
                // logObjects("data json : ", dataJson);

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
          // logObjects("Step Event:", event);
        },
        onFinish: async ({ response, reasoning }) => {
          // logInfo("Stream finished. Response received from model.");
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
