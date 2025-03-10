import { openai } from "@ai-sdk/openai";
import { fireworks } from "@ai-sdk/fireworks";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { xai } from "@ai-sdk/xai";

export const DEFAULT_CHAT_MODEL: string = "gpt-4o-mini";

//@ts-ignore
export const myProvider = customProvider({
  languageModels: {
    "gpt-4o-mini": openai("gpt-4o-mini"),
    "gpt-4o": openai("gpt-4o"),
    "chat-model-reasoning": wrapLanguageModel({
      model: fireworks("accounts/fireworks/models/deepseek-r1"),
      middleware: extractReasoningMiddleware({ tagName: "think" }),
    }),
    "title-model": openai("gpt-4-turbo"),
    //@ts-ignore
    "grok-2": xai("grok-2-1212"),
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
    id: "grok-2",
    name: "Grok 2.0",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "gpt-4o-mini",
    name: "Gpt 4o Mini",
    description: "Small model for fast, lightweight tasks",
  },
  {
    id: "gpt-4o",
    name: "Gpt 4o",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "sonar-pro",
    name: "Sonar Pro",
    description: "Large model for complex, multi-step tasks",
  },
  {
    id: "sonar",
    name: "Sonar",
    description: "Large model for complex, multi-step tasks",
  },

  // {
  //   id: 'chat-model-reasoning',
  //   name: 'Reasoning model',
  //   description: 'Uses advanced reasoning',
  // },
];
