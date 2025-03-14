import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

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
    // @ts-ignore
    "ora-deepseek": createOpenAICompatible({
      baseURL: "https://api.ora.io/v1",
      name: "ora deepseek",
      apiKey: process.env.ORA_API_KEY,
    }).languageModel("deepseek-ai/DeepSeek-V3"),
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
    name: "gpt-4o-mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "chat-model-large",
    name: "gpt-4o",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "ora-deepseek",
    name: "Deepseek by ORA",
    description: "Uses advanced reasoning",
  },
  // {
  //   id: 'chat-model-reasoning',
  //   name: 'Reasoning model',
  //   description: 'Uses advanced reasoning',
  // },
];
