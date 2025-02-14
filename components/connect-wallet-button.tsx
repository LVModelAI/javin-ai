import React from "react";
import { ConnectButton } from "thirdweb/react";
import { createWallet, getUserEmail, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb/client";
import { useTheme } from "next-themes";
import {
  generatePayload,
  isLoggedIn,
  login,
  logout,
} from "@/app/(auth)/actions"; // we'll create this file in the next section

export default function CustomConnectWalletButton() {
  const { theme } = useTheme();

  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "farcaster", "email", "x"],
      },
    }),
    createWallet("io.metamask"),
    createWallet("com.coinbase.wallet"),
    createWallet("me.rainbow"),
    createWallet("io.rabby"),
    createWallet("io.zerion.wallet"),
  ];

  return (
    <div>
      <ConnectButton
        client={client}
        wallets={wallets}
        connectModal={{
          size: "wide",
          showThirdwebBranding: false,
          title: "Sign in",
        }}
        connectButton={{ label: "Sign in" }}
        auth={{
          isLoggedIn: async (address) => {
            console.log("checking if logged in!", { address });
            return await isLoggedIn();
          },
          doLogin: async (params) => {
            console.log("logging in!");
            await login(params);
          },
          getLoginPayload: async ({ address }) => generatePayload({ address }),
          doLogout: async () => {
            console.log("logging out!");
            await logout();
          },
        }}
      />
    </div>
  );
}
