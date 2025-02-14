import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";

import { myProvider } from "@/lib/ai/models";
import { systemPrompt } from "@/lib/ai/prompts";
import {
  deleteChatById,
  getChatById,
  getMessageCount,
  incrementMessageCount,
  getUserTier,
  saveChat,
  saveMessages,
  getUser,
} from "@/lib/db/queries";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";
import { webSearch } from "@/lib/ai/tools/web-search";
import { getMultiChainWalletPortfolio } from "@/lib/ai/tools/birdeye/wallet-portfolio-multi-chain";
import { User } from "next-auth";
import { searchTokenMarketData } from "@/lib/ai/tools/birdeye/search-token-market-data";
import { getUserSession, isLoggedIn } from "@/app/(auth)/actions";
import { getUserWalletAddress } from "@/lib/ai/tools/birdeye/get-user-wallet-address";

export const maxDuration = 60;

export async function POST(request: Request) {
  const {
    id,
    messages,
    selectedChatModel,
  }: { id: string; messages: Array<Message>; selectedChatModel: string } =
    await request.json();

  const loggedIn = await isLoggedIn();
  console.log("loggedIn", loggedIn);
  if (!loggedIn) {
    return new Response("Unauthorized", { status: 401 });
  }

  const session = await getUserSession();
  console.log("session", session);

  if (!session || !session.parsedJWT || !session.parsedJWT.sub) {
    return new Response("Unauthorized", { status: 401 });
  }

  console.log("user infor ", session.parsedJWT.ctx);
  if (
    session.parsedJWT.ctx.tier == "free" &&
    session.parsedJWT.ctx.messageCount >=
      Number(process.env.FREE_USER_MESSAGE_LIMIT!)
  ) {
    console.log("totmsg ", session.parsedJWT.ctx.messageCount);
    return new Response("You have reached your free plan messages limit", {
      status: 403,
    });
  }

  const userMessage = getMostRecentUserMessage(messages);

  if (!userMessage) {
    return new Response("No user message found", { status: 400 });
  }

  const chat = await getChatById({ id });

  if (!chat) {
    const title = await generateTitleFromUserMessage({ message: userMessage });
    await saveChat({ id, userId: session.parsedJWT.ctx.id, title });
  }

  await saveMessages({
    messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
  });

  return createDataStreamResponse({
    execute: (dataStream) => {
      const result = streamText({
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt({ selectedChatModel }),
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning"
            ? []
            : [
                "getMultiChainWalletPortfolio",
                "webSearch",
                "searchTokenMarketData",
                "getUserWalletAddress",
              ],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: {
          webSearch,
          getMultiChainWalletPortfolio,
          searchTokenMarketData,
          getUserWalletAddress,
        },
        onFinish: async ({ response, reasoning }) => {
          if (session.parsedJWT.ctx.id) {
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
              await incrementMessageCount(session.parsedJWT.ctx.id);
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
    onError: (error) => {
      console.log(error);
      return "Oops, an error occured!";
    },
  });
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return new Response("Not Found", { status: 404 });
  }

  const session = await getUserSession();

  if (!session || !session.parsedJWT.ctx.id) {
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.parsedJWT.ctx.id) {
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
