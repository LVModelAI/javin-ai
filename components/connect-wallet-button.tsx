import React from "react";
import { ConnectButton } from "thirdweb/react";
import { createWallet, getUserEmail, inAppWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb/client";
import { useTheme } from "next-themes";
// import {
//   generatePayload,
//   isLoggedIn,
//   login,
//   logout,
// } from "@/app/(auth)/actions"; // we'll create this file in the next section

export default function CustomConnectWalletButton() {
  const { theme } = useTheme();

  const wallets = [
    inAppWallet({
      auth: {
        options: ["google", "farcaster", "email", "x", "apple"],
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
        connectModal={{ size: "compact", showThirdwebBranding: false }}
        //@ts-ignore
        theme={theme}
        connectButton={{ label: "Connect wallet" }}
      />
    </div>
  );
}
