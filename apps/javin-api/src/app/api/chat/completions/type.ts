// import { FinishReason } from "ai";
import { z } from "zod";

export interface ChatCompletionStreaming {
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

export const PromptRequestSchema = z.object({
  model: z.string(),
  prompt: z.string(),
  max_tokens: z.number().int().positive(),
  temperature: z.number().min(0).max(1),
  stream: z.boolean(),
});

export type PromptRequest = z.infer<typeof PromptRequestSchema>;
