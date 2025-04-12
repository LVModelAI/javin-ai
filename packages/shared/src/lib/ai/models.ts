import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { groq } from "@ai-sdk/groq";

export const DEFAULT_CHAT_MODEL: string = "chat-model-small";

export const myProvider: any = customProvider({
  languageModels: {
    "chat-model-small": openai("gpt-4o-mini"),
    "chat-model-large": openai("gpt-4o"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4-turbo"),
    "block-model": openai("gpt-4o-mini"),
    // @ts-ignore due to version type mismatch between @ai-sdk/provider package (v1.0.9 and v1.0.7)
    // "groq-llama-4": groq("meta-llama/llama-4-scout-17b-16e-instruct"),
    "groq-llama-4": groq("meta-llama/llama-4-maverick-17b-128e-instruct"),
    "groq-llama-4-scout": wrapLanguageModel({
      // @ts-ignore due to version type mismatch between @ai-sdk/provider package (v1.0.9 and v1.0.7)
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "firework-llama-4": wrapLanguageModel({
      model: fireworks(
        "accounts/fireworks/models/llama4-maverick-instruct-basic"
      ),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
  },
  imageModels: {
    "small-model": openai.image("dall-e-2"),
    "large-model": openai.image("dall-e-3"),
  },
});

interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: "chat-model-small",
    name: "Gpt 4o mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "Gpt 4o",
    description: "Large model for complex, multi-step tasks",
  },
  // {
  //   id: 'chat-model-reasoning',
  //   name: 'Reasoning model',
  //   description: 'Uses advanced reasoning',
  // },
  {
    id: "groq-llama-4-scout",
    name: "Llama 4 Scout",
    description: "Llama 4 scout model using groq",
  },
  {
    id: "groq-llama-4",
    name: "Llama 4 Maverick",
    description: "Llama 4 maverick model using groq",
  },
  {
    id: "firework-llama-4",
    name: "Firework Llama 4",
    description: "Llama 4 maverick model using fireworks.ai",
  },
];
