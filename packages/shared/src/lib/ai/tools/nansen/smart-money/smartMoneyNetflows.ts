import { tool } from "ai";
import { z } from "zod";

export const smartMoneyNetflows = tool({
  description: "",
  parameters: z.object({}),
  execute: async () => {
    return {};
  },
});
