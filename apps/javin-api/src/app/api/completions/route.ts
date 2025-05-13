import { allTools, getGroupConfig } from "@javin/shared/src/lib/ai/prompts";
import {
  generateUUID,
  sanitizeResponseMessages,
  SearchGroupId,
} from "@javin/shared/src/lib/utils/utils";
import { openai } from "@ai-sdk/openai";
import { smoothStream, streamText, generateText } from "ai";
import {
  PromptRequestSchema,
  TextCompletion,
  TextCompletionStreaming,
} from "./type";
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

    const model = "gpt-4o-mini";
    const { tools: activeTools, systemPrompt } = await getGroupConfig(
      // BIG ASSUMPTION, pay attention here
      consumerInfo.mode as SearchGroupId
    );

    logInfo("mode selected " + consumerInfo.mode);

    const system_fingerprint = process.env.VERCEL_GIT_COMMIT_SHA || "";

    if (!StreamingTrue) {
      // NON STREAMING
      const result = await generateText({
        model: openai(model),
        system: systemPrompt,
        prompt: prompt,
        maxSteps: 10,
        experimental_activeTools: [...activeTools],
        tools: allTools,
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

      await saveMessages({
        consumerName: consumerInfo.apiConsumerName as ConsumerEnumType,
        messages: [
          {
            id: generateUUID(),
            prompt: prompt,
            response: result.text,
            location: "completions",
            model: model,
            stream: StreamingTrue,
            createdAt: new Date(),
          },
        ],
      });

      const responseMessage: TextCompletion = {
        id: generateUUID(),
        object: "text_completion",
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            text: result.text,
            index: 0,
            finish_reason: result.finishReason,
            logprobs: null,
          },
        ],
        model,
        system_fingerprint: system_fingerprint,
        usage: result.usage,
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
          const result = streamText({
            model: openai(model),
            system: systemPrompt,
            prompt: prompt,
            maxSteps: 10,
            experimental_activeTools: [...activeTools],
            onChunk: async ({ chunk }) => {
              // MAKE THIS INTO OPENAI API STANDARD MESSAGE AND PUSH IN CONTROLLER
              // IF YOU WANT TO SEND TOOL INFORMATION
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
              await saveMessages({
                consumerName: consumerInfo.apiConsumerName as ConsumerEnumType,
                messages: [
                  {
                    id: generateUUID(),
                    prompt: prompt,
                    response: text,
                    location: "completions",
                    model: model,
                    stream: StreamingTrue,
                    createdAt: new Date(),
                  },
                ],
              });
            },
            tools: allTools,
            maxTokens: max_tokens,
            temperature: temperature,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
          });
          for await (const chunk of result.textStream) {
            // console.log("chunk = ", chunk);
            const message: TextCompletionStreaming = {
              id: generateUUID(),
              object: "text_completion",
              created: Math.floor(Date.now() / 1000),
              choices: [
                { text: chunk, index: 0, finish_reason: null, logprobs: null },
              ],
              model,
              system_fingerprint: system_fingerprint,
            };

            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify(message)}\n\n`)
            );
          }

          const stopMessage: TextCompletionStreaming = {
            id: generateUUID(),
            object: "text_completion",
            created: Math.floor(Date.now() / 1000),
            choices: [
              { text: null, index: 0, finish_reason: "stop", logprobs: null },
            ],
            model,
            system_fingerprint: system_fingerprint,
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
