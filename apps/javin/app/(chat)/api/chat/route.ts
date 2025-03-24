// app/(chat)/api/chat/route.ts
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
} from "@javin/shared/lib/utils/utils";
import { generateTitleFromUserMessage } from "../../actions";

export const maxDuration = 60;

interface ChatCompletionStreaming {
  id: string;
  object: string;
  created: number;
  model: string;
  system_fingerprint: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

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
    execute: async (dataStream) => {
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
      } else {
        // GENERATE SUMMARY FROM DOBBY
        console.log("GENERATING SUMMARY FROM DOBBY");
        try {
          const result = await generateText({
            model: myProvider.languageModel("chat-model-small"),
            system: systemPrompt,
            messages,
            maxSteps: 5,
            tools: allTools,
            experimental_activeTools: [...activeTools],
            experimental_generateMessageId: generateUUID,
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
          const summarizationSystemPrompt =
            `You are a helpful assistant that will convert the text given to you in your own words. Do not reduce the information in the text. Write it correctly formatted and be kinda unhinged.  \n\n The text is:\n\n${result.text}`;
          const summaryResult = streamText({
            model: myProvider.languageModel(selectedChatModel),
            prompt: summarizationSystemPrompt,
            experimental_transform: smoothStream({ chunking: "word" }),
            experimental_generateMessageId: generateUUID,
            onChunk: async ({ chunk }) => {
              console.log("onChunk = ", chunk);
            },
            onFinish: async ({ response, reasoning }) => {
              const sanitizedResponseMessages = sanitizeResponseMessages({
                messages: response.messages,
                reasoning,
              });
              console.log(
                "SAVING MESSAGES FOR DOBBY = ",
                sanitizedResponseMessages
              );

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
            },
          });

          console.log("merging into datastream");
          // Merge the summarization stream into the original data stream.
          summaryResult.mergeIntoDataStream(dataStream);
        } catch (err) {
          console.error("Failed to generate summary from dobby", err);
        }
      }
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
