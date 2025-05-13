import {
  type Message,
  createDataStreamResponse,
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
  saveToolTracking,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@javin/shared/lib/utils/utils";
import { generateTitleFromUserMessage } from "../../actions";
import * as Sentry from "@sentry/nextjs";
import { v4 as uuidv4 } from "uuid";

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
        tools: allTools,
        onStepFinish(event) {
          logInfo("Step finished.");
          // logObjects("Step Event:", event);
        },
        onFinish: async ({ response, reasoning }) => {
          logInfo("Stream finished. Response received from model.");
          logObjects("Response messages:", response);
          logObjects("Model reasoning:", reasoning);

          if (session.user?.id) {
            try {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });
              logObjects(
                "Sanitized response messages:",
                sanitizedResponseMessages
              );
              const dateOfMessageCreation = new Date();
              await saveToolTracking({
                toolTrackingData: {
                  id: uuidv4(),
                  userPrompt: userMessage.content,
                  aiResponse:
                    sanitizedResponseMessages[
                      sanitizedResponseMessages.length - 1
                    ].role == "assistant"
                      ? sanitizedResponseMessages[
                          sanitizedResponseMessages.length - 1
                          // @ts-ignore
                        ].content[0].text
                      : "Couldnt capture",
                  toolsCalled: sanitizedResponseMessages
                    .filter((a) => a.role === "tool")
                    .flatMap((b) =>
                      b.content
                        .filter((c) => c.type === "tool-result")
                        .map((c) => ({
                          toolName: c.toolName,
                          toolResponse: c.result,
                        }))
                    ),
                  toolsCalledNames: sanitizedResponseMessages
                    .filter((a) => a.role === "tool")
                    .map((b, index) => ({
                      stepNumber: index,
                      toolsCalled: b.content
                        .filter((c) => c.type === "tool-result")
                        .map((c) => c.toolName),
                    }))
                    .filter((entry) => entry.toolsCalled.length > 0),
                  createdAt: dateOfMessageCreation,
                },
              });
              await saveMessages({
                messages: sanitizedResponseMessages.map((message) => ({
                  id: message.id,
                  chatId: id,
                  role: message.role,
                  content: message.content,
                  createdAt: dateOfMessageCreation,
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
