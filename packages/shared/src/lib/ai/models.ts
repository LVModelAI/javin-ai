import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { google } from "@ai-sdk/google";
import { perplexity } from "@ai-sdk/perplexity";

export const DEFAULT_CHAT_MODEL: string = "gpt-4o";

export const myProvider: any = customProvider({
  languageModels: {
    "gpt-4o-mini": openai("gpt-4o-mini"),
    "gpt-4o": openai("gpt-4o"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4-turbo"),
    "block-model": openai("gpt-4o-mini"),
    //@ts-ignore
    "gemini-2.0-flash": google("gemini-2.0-flash"),
    //@ts-ignore
    "gemini-2.0-flash-lite": google("gemini-2.0-flash-lite"),
    //@ts-ignore
    sonar: perplexity("sonar"),
    //@ts-ignore
    "sonar-pro": perplexity("sonar-pro"),
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
    id: "gemini-2.0-flash",
    name: "Gemini 2.0 Flash",
    description: "Google's Gemini 2.0 Flash model",
  },
  {
    id: "gemini-2.0-flash-lite",
    name: "Gemini 2.0 Flash Lite",
    description: "Lite version of Gemini 2.0 Flash model",
  },
  {
    id: "sonar",
    name: "Sonar",
    description: "Perplexity's Sonar model",
  },
  {
    id: "sonar-pro",
    name: "Sonar Pro",
    description: "Pro version of Perplexity's Sonar model",
  },
  // {
  //   id: 'chat-model-reasoning',
  //   name: 'Reasoning model',
  //   description: 'Uses advanced reasoning',
  // },
];
