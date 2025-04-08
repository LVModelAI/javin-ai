import { allTools, getGroupConfig } from "@javin/shared/src/lib/ai/prompts";
import { generateUUID } from "@javin/shared/src/lib/utils/utils";
import { openai } from "@ai-sdk/openai";
import { smoothStream, streamText, generateText } from "ai";
import {
  PromptRequestSchema,
  TextCompletion,
  TextCompletionStreaming,
} from "./type";
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
              console.log("onChunk = ", chunk);
            },
            tools: allTools,
            maxTokens: max_tokens,
            temperature: temperature,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
          });
          for await (const chunk of result.textStream) {
            console.log("chunk = ", chunk);
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
