// app/(chat)/api/chat/route.ts
import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@javin/shared/lib/ai/models";
import { allTools, getGroupConfig } from "@javin/shared/lib/ai/prompts";
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
  const session = await auth();
  const { tools: activeTools, systemPrompt } = await getGroupConfig(group);

  if (!session || !session.user || !session.user.id) {
    return new Response("Please login to start chatting!", { status: 401 });
  }
  console.log("user session ", session.user);
  const users = await getUserById(session.user.id!);
  const user_info = users[0];

  if (user_info.dailyMessageRemaining <= 0) {
    if (user_info.tier === "free") {
      console.warn(`User ${user_info.email} blocked: message limit exceeded`);

      return new Response(
        `Free Tier limit of ${process.env.FREE_USER_MESSAGE_LIMIT} messages/day reached! Upgrade to PRO for more usage and other perks!`,
        {
          status: 403,
        }
      );
    } else {
      return new Response(
        `We're experiencing exceptionally high demand. Please hang tight as we work on scaling our systems!`,
        {
          status: 403,
        }
      );
    }
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
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt,
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning" ? [] : [...activeTools],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: allTools,
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
              await decrementRemainingMessageCount(session.user.id);
            } catch (error) {
              Sentry.captureException(error);
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
