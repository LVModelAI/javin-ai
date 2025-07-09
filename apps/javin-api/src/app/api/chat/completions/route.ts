import {
  getAllToolsWithConfigs,
  getGroupConfig,
} from "@javin/shared/src/lib/ai/prompts";
import {
  generateUUID,
  sanitizeResponseMessages,
  SearchGroupId,
} from "@javin/shared/src/lib/utils/utils";
import { smoothStream, streamText, generateText } from "ai";
import { PromptRequestSchema, ChatCompletionStreaming } from "./type";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import {
  getConsumerUsingApiKey,
  saveMessages,
  saveToolTracking,
} from "@/src/lib/db/queries";
import { v4 as uuidv4 } from "uuid";
import { ConsumerEnumType } from "@/src/lib/db/schema";
import { logInfo } from "@javin/shared/lib/utils/logging";
import { enforceRateLimit } from "@/src/lib/utils/rateLimit";
import { NextResponse } from "next/server";
import {
  getModelByConsumerMode,
  myProvider,
} from "@javin/shared/lib/ai/models";
import { pushOnchainReturnHash } from "@javin/shared/lib/utils/crypto";
import { APIClient, FetchProvider } from "@wireio/core";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("Authorization");

    const extractedApiKey = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : null;

    if (!extractedApiKey) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized, contact tech team to get api key",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const consumerInfo = await getConsumerUsingApiKey({
      apiKey: extractedApiKey,
    });

    if (!consumerInfo) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    // RATE LIMITING
    const rateLimitResponse = await enforceRateLimit(consumerInfo);
    if (rateLimitResponse instanceof NextResponse) return rateLimitResponse;

    const body = await request.json();
    const validatedData = PromptRequestSchema.parse(body);

    const {
      prompt,
      max_tokens,
      temperature,
      stream: StreamingTrue,
    } = validatedData;

    const outputId = uuidv4();
    const trailingText = "\n\n Nonce: " + outputId;
    // const trailingText = "";

    const model = getModelByConsumerMode(consumerInfo.mode);

    logInfo("mode selected " + consumerInfo.mode);
    logInfo("model selected " + model);

    const { tools: activeTools, systemPrompt } = await getGroupConfig(
      // BIG ASSUMPTION, pay attention here
      consumerInfo.mode as SearchGroupId
    );

    const system_fingerprint = process.env.VERCEL_GIT_COMMIT_SHA || "";

    // wire network api client
    const privateKey = process.env.PRIVATE_KEY!;
    const endpoint = process.env.API_ENDPOINT!;
    const contractAccount = process.env.CONTRACT_ACCOUNT!;
    const actor = process.env.ACTOR!;

    if (!privateKey || !endpoint || !contractAccount || !actor) {
      throw new Error(
        "Missing required environment variables: PRIVATE_KEY, API_ENDPOINT, CONTRACT_ACCOUNT, ACTOR"
      );
    }

    const apiClient = new APIClient({
      provider: new FetchProvider(endpoint!),
    });

    if (!StreamingTrue) {
      // NON STREAMING - Convert to chat completion format
      const result = await generateText({
        model: myProvider.languageModel(model),
        system: systemPrompt,
        prompt: prompt,
        maxSteps: 10,
        maxRetries: 0,
        experimental_activeTools: [...activeTools],
        tools: getAllToolsWithConfigs({
          modelName: model,
          mode: consumerInfo.mode as SearchGroupId,
        }),
        maxTokens: max_tokens,
        temperature: temperature,
        experimental_generateMessageId: generateUUID,
      });

      const dateOfMessageCreation = new Date();
      const sanitizedResponseMessages = sanitizeResponseMessages({
        // @ts-ignore
        messages: result.response.messages,
        reasoning: result.reasoning,
      });
      await saveToolTracking({
        toolTrackingData: {
          id: uuidv4(),
          userPrompt: prompt,
          aiResponse:
            sanitizedResponseMessages[sanitizedResponseMessages.length - 1]
              .role == "assistant"
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

      const finalResultText = result.text + trailingText;

      let hash = "";
      try {
        hash = await pushOnchainReturnHash(
          apiClient,
          finalResultText,
          contractAccount,
          actor,
          privateKey
        );
      } catch (err) {
        console.error("Failed to push hash on-chain:", err);
        Sentry.captureException(err);
      }

      await saveMessages({
        consumerName: consumerInfo.apiConsumerName as ConsumerEnumType,
        messages: [
          {
            id: generateUUID(),
            prompt: prompt,
            response: finalResultText,
            location: "chat/completions",
            model: model,
            stream: StreamingTrue,
            createdAt: dateOfMessageCreation,
            nonce: outputId,
            hash: hash,
          },
        ],
      });

      const responseMessage = {
        id: generateUUID(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: finalResultText,
              refusal: null,
              annotations: [],
            },
            logprobs: null,
            finish_reason: result.finishReason,
          },
        ],
        model,
        system_fingerprint: system_fingerprint,
        usage: { ...result.usage },
        service_tier: null,
      };

      return new Response(JSON.stringify(responseMessage), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // STREAMING
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Send the initial message with role
          const initialMessage: ChatCompletionStreaming = {
            id: generateUUID(),
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            system_fingerprint: system_fingerprint,
            choices: [
              {
                index: 0,
                delta: {
                  role: "assistant",
                },
                finish_reason: null,
              },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(initialMessage)}\n\n`)
          );

          const result = streamText({
            model: myProvider.languageModel(model),
            system: systemPrompt,
            prompt: prompt,
            maxSteps: 10,
            maxRetries: 0,
            experimental_activeTools: [...activeTools],
            onChunk: async ({ chunk }) => {
              // console.log("onChunk = ", chunk);
            },
            onFinish: async ({ text, response, reasoning }) => {
              const dateOfMessageCreation = new Date();
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning: reasoning,
              });
              await saveToolTracking({
                toolTrackingData: {
                  id: uuidv4(),
                  userPrompt: prompt,
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

              const finalResultText = text + trailingText;

              let hash = "";
              try {
                hash = await pushOnchainReturnHash(
                  apiClient,
                  finalResultText,
                  contractAccount,
                  actor,
                  privateKey
                );
              } catch (err) {
                console.error("Failed to push hash on-chain (stream):", err);
                Sentry.captureException(err);
              }

              await saveMessages({
                consumerName: consumerInfo.apiConsumerName as ConsumerEnumType,
                messages: [
                  {
                    id: generateUUID(),
                    prompt: prompt,
                    response: finalResultText,
                    location: "chat/completions",
                    model: model,
                    stream: StreamingTrue,
                    createdAt: dateOfMessageCreation,
                    nonce: outputId,
                    hash: hash,
                  },
                ],
              });
            },
            tools: getAllToolsWithConfigs({
              modelName: model,
              mode: consumerInfo.mode as SearchGroupId,
            }),
            maxTokens: max_tokens,
            temperature: temperature,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
          });

          const streamId = generateUUID(); // Keep a consistent ID for the stream

          for await (const chunk of result.textStream) {
            // console.log("chunk = ", chunk);
            const message: ChatCompletionStreaming = {
              id: streamId,
              object: "chat.completion.chunk",
              created: Math.floor(Date.now() / 1000),
              model,
              system_fingerprint: system_fingerprint,
              choices: [
                {
                  index: 0,
                  delta: {
                    content: chunk,
                  },
                  finish_reason: null,
                },
              ],
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          }

          const trailingMessageChunk: ChatCompletionStreaming = {
            id: streamId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            system_fingerprint: system_fingerprint,
            choices: [
              {
                index: 0,
                delta: {
                  content: trailingText,
                },
                finish_reason: null,
              },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(trailingMessageChunk)}\n\n`)
          );

          // Send the final chunk with finish_reason
          const stopMessage: ChatCompletionStreaming = {
            id: streamId,
            object: "chat.completion.chunk",
            created: Math.floor(Date.now() / 1000),
            model,
            system_fingerprint: system_fingerprint,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: "stop",
              },
            ],
          };

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(stopMessage)}\n\n`)
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (error) {
          console.error("Streaming error:", error);
          Sentry.captureException(error);
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
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: error.errors }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
    Sentry.captureException(error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
