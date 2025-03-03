// app/(chat)/api/chat/route.ts
import {
  type Message,
  createDataStreamResponse,
  smoothStream,
  streamText,
} from "ai";
import { auth } from "@/app/(auth)/auth";
import { myProvider } from "@/lib/ai/models";
import { getGroupConfig, systemPrompt } from "@/lib/ai/prompts";
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
  sanitizeResponseMessages,
} from "@/lib/utils";

import { generateTitleFromUserMessage } from "../../actions";
import { webSearch } from "@/lib/ai/tools/web-search";
import { getSolanaChainWalletPortfolio } from "@/lib/ai/tools/solana/wallet-portfolio-solana";
import { getEvmMultiChainWalletPortfolio } from "@/lib/ai/tools/evm/wallet-portfolio-evm";
import { searchSolanaTokenMarketData } from "@/lib/ai/tools/solana/search-token-solana";
import { searchEvmTokenMarketData } from "@/lib/ai/tools/evm/search-token-evm";
import { getSiteContent } from "@/lib/ai/tools/scrap-site";
import { getVanaStats } from "@/lib/ai/tools/vana/get-stats";
import { getVanaApiData } from "@/lib/ai/tools/vana/get-vana-api-data";
import { getCreditcoinStats } from "@/lib/ai/tools/creditcoin/get-stats";
import { getCreditcoinApiData } from "@/lib/ai/tools/creditcoin/get-creditcon-api-data";
import { getEvmOnchainDataUsingZerion } from "@/lib/ai/tools/onchain/get_evm_onchain_data_using_zerion";
import { ensToAddress } from "@/lib/ai/tools/ens-to-address";
import { getWormholeApiData } from "@/lib/ai/tools/wormhole/get-wormhole-api-data";
import { getFlowApiData } from "@/lib/ai/tools/flow/get-flow-api-data";
import { getFlowStats } from "@/lib/ai/tools/flow/get-stats";
import { translateTransactions } from "@/lib/ai/tools/translate-transactions";
import { getEvmOnchainDataUsingEtherscan } from "@/lib/ai/tools/onchain/get_evm_onchain_data_using_etherscan";

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
        model: myProvider.languageModel(selectedChatModel),
        system: systemPrompt,
        messages,
        maxSteps: 5,
        experimental_activeTools:
          selectedChatModel === "chat-model-reasoning" ? [] : [...activeTools],
        experimental_transform: smoothStream({ chunking: "word" }),
        experimental_generateMessageId: generateUUID,
        tools: {
          webSearch,
          getEvmMultiChainWalletPortfolio,
          getSolanaChainWalletPortfolio,
          searchSolanaTokenMarketData,
          searchEvmTokenMarketData,
          getSiteContent,
          getCreditcoinApiData,
          getVanaApiData,
          getVanaStats,
          getCreditcoinStats,
          getEvmOnchainDataUsingZerion,
          getEvmOnchainDataUsingEtherscan,
          ensToAddress,
          getWormholeApiData,
          getFlowApiData,
          getFlowStats,
          translateTransactions,
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
