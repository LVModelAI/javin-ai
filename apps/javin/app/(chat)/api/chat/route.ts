import {
  type Message,
  createDataStreamResponse,
  generateText,
  smoothStream,
  streamText,
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

  logObjects("Request data:", { id, messages, selectedChatModel, group }, true);
  logObjects("Search group:", group, true);

  const session = await auth();
  if (!session || !session.user || !session.user.id) {
    console.error("User not authenticated.");
    return new Response("Please login to start chatting!", { status: 401 });
  }
  logObjects("User session:", session.user, true);

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
    execute: async (dataStream) => {
      logInfo("Starting text stream execution.");
      if (selectedChatModel !== "sentient-dobby-unhinged") {
        // NORMAL FLOW
        const result = streamText({
          model: myProvider.languageModel(selectedChatModel),
          system: systemPrompt,
          messages,
          maxSteps: 5,
          experimental_activeTools:
            selectedChatModel === "chat-model-reasoning"
              ? []
              : [...activeTools],
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          tools: allTools,
          onStepFinish(event) {
            logInfo("Step finished.");
            logObjects("Step Event:", event);
          },
          onFinish: async ({ response, reasoning }) => {
            logInfo("Stream finished. Response received from model.");
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
        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      } else {
        // GENERATE SUMMARY FROM DOBBY
        logInfo("Going into the Dobby flow");
        const result = await generateText({
          model: myProvider.languageModel("chat-model-small"),
          system: systemPrompt,
          messages,
          maxSteps: 5,
          tools: allTools,
          experimental_activeTools: [...activeTools],
          experimental_generateMessageId: generateUUID,
          onStepFinish(event) {
            logInfo("Step finished.");
            logObjects("Step Event:", event);
          },
          // TODO SUPPORT STREAMING OF TOOL RESULT
          // onStepFinish(event) {
          //   console.log("onStepFinish");
          //   console.log("toolCalls ", event.toolCalls);
          //   console.log("toolResults ", event.toolResults);
          //   const chunkData = {
          //     id: generateUUID(),
          //     role: "assistant",
          //     toolInvocations: event.toolCalls.map((call, idx) => ({
          //       toolName: call.toolName,
          //       toolCallId: call.toolCallId,
          //       state: "result",
          //       args: call.args,
          //       result: event.toolResults[idx] || null,
          //     })),
          //   };
          //   dataStream.write(`0:${JSON.stringify(chunkData)}\n`);
          // },
        });

        // Set up the system prompt and user message for summarization.
        const summarizationSystemPrompt = `
          You are a helpful assistant that will convert the text given in your own words.
          Do not reduce the information in the text. 
          Just speak like it's yours.
          Never mention that you're rewriting anything.
          Format the output correctly so that it is easy to read.
          \n\n The text is:\n\n${result.text}`;

        const summaryResult = streamText({
          model: myProvider.languageModel(selectedChatModel),
          prompt: summarizationSystemPrompt,
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
          onFinish: async ({ response, reasoning }) => {
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
            logInfo("Response messages saved to database.");
            await decrementRemainingMessageCount(session.user.id);
            logInfo("User's remaining message count decremented.");
          },
        });

        logInfo("merging into datastream");
        summaryResult.mergeIntoDataStream(dataStream);
      }
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
