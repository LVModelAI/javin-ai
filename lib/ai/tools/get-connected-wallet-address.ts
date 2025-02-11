"use client";
import { tool } from "ai";
import { useActiveAccount } from "thirdweb/react";
import { z } from "zod";

export const getUserWalletAddress = tool({
  description: "Get the connected user's wallet address.",
  parameters: z.object({}),

  execute: async () => {
    const activeAccount = useActiveAccount();

    if (!activeAccount?.address) {
      throw new Error("No wallet connected.");
    }

    return { wallet_address: activeAccount?.address };
  },
});
