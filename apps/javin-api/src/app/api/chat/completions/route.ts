import { allTools, getGroupConfig } from "@javin/shared/src/lib/ai/prompts";
import { generateUUID } from "@javin/shared/src/lib/utils/utils";
import { openai } from "@ai-sdk/openai";
import { smoothStream, streamText, generateText } from "ai";
import { PromptRequestSchema, ChatCompletionStreaming } from "./type";
import { z } from "zod";

export async function POST(request: Request) {
  try {
    const EXTERNALAPIKEY = process.env.SENTIENT_EXTERNAL_APIKEY;

    const authHeader = request.headers.get("Authorization");

    if (!authHeader || authHeader !== `Bearer ${EXTERNALAPIKEY}`) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

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
      "on_chain"
    );

    const system_fingerprint = process.env.VERCEL_GIT_COMMIT_SHA || "";

    if (!StreamingTrue) {
      // NON STREAMING - Convert to chat completion format
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

      const responseMessage = {
        id: generateUUID(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        choices: [
          {
            index: 0,
            message: {
              role: "assistant",
              content: result.text,
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
            model: openai(model),
            system: systemPrompt,
            prompt: prompt,
            maxSteps: 10,
            experimental_activeTools: [...activeTools],
            onChunk: async ({ chunk }) => {
              console.log("onChunk = ", chunk);
            },
            tools: allTools,
            maxTokens: max_tokens,
            temperature: temperature,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
          });

          const streamId = generateUUID(); // Keep a consistent ID for the stream

          for await (const chunk of result.textStream) {
            console.log("chunk = ", chunk);
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

    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
