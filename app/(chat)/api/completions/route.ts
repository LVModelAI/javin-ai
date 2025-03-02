// app/(chat)/api/chat/route.ts
import {
  createDataStreamResponse,
  smoothStream,
  streamText,
  createDataStream,
} from "ai";
import { myProvider } from "@/lib/ai/models";
import { getGroupConfig, systemPrompt } from "@/lib/ai/prompts";
import {
  generateUUID,
  getMostRecentUserMessage,
  sanitizeResponseMessages,
} from "@/lib/utils";

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
import { getEvmOnchainData } from "@/lib/ai/tools/onchain/get_evm_onchain_data";
import { ensToAddress } from "@/lib/ai/tools/ens-to-address";
import { getWormholeApiData } from "@/lib/ai/tools/wormhole/get-wormhole-api-data";
import { getFlowApiData } from "@/lib/ai/tools/flow/get-flow-api-data";
import { getFlowStats } from "@/lib/ai/tools/flow/get-stats";
import { openai } from "@ai-sdk/openai";

export const maxDuration = 60;

// export async function POST(request: Request) {
//   const {
//     model,
//     prompt,
//   }: {
//     model: string;
//     prompt: string;
//   } = await request.json();

//   const { tools: activeTools, systemPrompt } = await getGroupConfig("on_chain");

//   return createDataStreamResponse({
//     execute: (dataStream) => {
//       const result = streamText({
//         model: openai(model),
//         system: systemPrompt,
//         prompt: prompt,
//         maxSteps: 10,
//         experimental_activeTools:
//           model === "chat-model-reasoning" ? [] : [...activeTools],
//         experimental_transform: smoothStream({ chunking: "word" }),
//         experimental_generateMessageId: generateUUID,
//         onChunk: async ({ chunk }) => {
//           console.log("onChunk = ", chunk);
//         },
//         tools: {
//           webSearch,
//           getEvmMultiChainWalletPortfolio,
//           getSolanaChainWalletPortfolio,
//           searchSolanaTokenMarketData,
//           searchEvmTokenMarketData,
//           getSiteContent,
//           getCreditcoinApiData,
//           getVanaApiData,
//           getVanaStats,
//           getCreditcoinStats,
//           getEvmOnchainData,
//           ensToAddress,
//           getWormholeApiData,
//           getFlowApiData,
//           getFlowStats,
//         },
//         onFinish: async ({ response, reasoning }) => {
//           //   do something if needed
//         },
//         experimental_telemetry: {
//           isEnabled: true,
//           functionId: "stream-text",
//         },
//       });

//       result.mergeIntoDataStream(dataStream, {
//         sendReasoning: true,
//       });
//     },
//     onError: (error: any) => {
//       console.log(error);
//       return "Oops, something went wrong!. Please try again in new chat";
//     },
//   });
// }

export async function POST(request: Request) {
  const { model, prompt }: { model: string; prompt: string } =
    await request.json();
  const { tools: activeTools, systemPrompt } = await getGroupConfig("on_chain");

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const result = streamText({
          model: openai(model),
          system: systemPrompt,
          prompt: prompt,
          maxSteps: 10,
          experimental_activeTools:
            model === "chat-model-reasoning" ? [] : [...activeTools],
            onChunk: async ({ chunk }) => {
                // MAKE THIS INTO OPENAI API STANDARD MESSAGE AND PUSH IN CONTROLLER
                console.log("onChunk = ", chunk);
            },
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
            getEvmOnchainData,
            ensToAddress,
            getWormholeApiData,
            getFlowApiData,
            getFlowStats,
          },
          experimental_transform: smoothStream({ chunking: "word" }),
          experimental_generateMessageId: generateUUID,
        });
        for await (const chunk of result.textStream) {
          console.log("chunk = ", chunk);
          const message = {
            id: generateUUID(),
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            choices: [
              { delta: { content: chunk }, index: 0, finish_reason: null },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
          );
        }

        // Send stop signal
        const stopMessage = {
          id: generateUUID(),
          object: "chat.completion.chunk",
          created: Math.floor(Date.now() / 1000),
          model,
          choices: [
            { delta: { content: null }, index: 0, finish_reason: "stop" },
          ],
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(stopMessage)}\n\n`)
        );
        controller.close();
      } catch (error) {
        console.error("Streaming error:", error);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ error: "Internal Server Error" })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
