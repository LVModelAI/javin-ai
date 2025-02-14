import { tool } from "ai";
import { z } from "zod";
import { getUserSession } from "@/app/(auth)/actions";

export const getUserWalletAddress = tool({
  description: "Fetch the user wallet address.",
  parameters: z.object({}),
  execute: async () => {
    const session = await getUserSession();
    if (!session || !session.parsedJWT || !session.parsedJWT.sub) {
      return "no wallet address found";
    }
    let wallet_address = session.parsedJWT.sub;
    return wallet_address;
  },
});
