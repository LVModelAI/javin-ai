import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { google } from "@ai-sdk/google";

export const DEFAULT_CHAT_MODEL: string = "gpt-5-2025-08-07";

export const myProvider: any = customProvider({
  languageModels: {
    "gpt-5-2025-08-07": openai("gpt-5-2025-08-07"),
    "gpt-5-mini-2025-08-07": openai("gpt-5-mini-2025-08-07"),
    "gpt-5-nano-2025-08-07": openai("gpt-5-nano-2025-08-07"),
    "gpt-4o-mini": openai("gpt-4o-mini"),
    "gpt-4o": openai("gpt-4o"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-5-nano-2025-08-07"),
    "block-model": openai("gpt-5-mini-2025-08-07"),
    //@ts-ignore
    "gemini-2.5-flash-lite": google("gemini-2.5-flash-lite"),
    //@ts-ignore
    "gemini-3-flash-preview": google("gemini-3-flash-preview"),
    "llama-v3p1-70b-instruct": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/llama-v3p1-70b-instruct"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    // "gemini-2.0-flash-lite": google("gemini-2.0-flash-lite"),
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
    id: "gpt-5-2025-08-07",
    name: "Gpt 5",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "gpt-5-mini-2025-08-07",
    name: "Gpt 5 Mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "gemini-3-flash-preview",
    name: "Gemini 3 Flash Preview",
    description: "Google's Gemini 3 Flash Preview model",
  },
  {
    id: "gpt-4o-mini",
    name: "Gpt 4o mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "gpt-4o",
    name: "Gpt 4o",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "gemini-2.5-flash-lite",
    name: "Gemini 2.5 Flash Lite",
    description: "Google's Gemini 2.5 Flash Lite model",
  },
];

export const getModelByConsumerMode = (consumerMode: string): string => {
  switch (consumerMode) {
    case "on_chain":
      // return "llama-v3p1-70b-instruct";
      return "gpt-5-mini-2025-08-07";
    default:
      return "gpt-5-mini-2025-08-07";
  }
};
