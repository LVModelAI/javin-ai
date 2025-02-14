"use server";
import { VerifyLoginPayloadParams, createAuth } from "thirdweb/auth";
import { privateKeyToAccount } from "thirdweb/wallets";
import { client } from "@/lib/thirdweb/client";
import { cookies } from "next/headers";
import { createUser, getUser, getUserTier } from "@/lib/db/queries";
import { ThirdwebSession } from "@/types/ThirdwebSession";
import { generateUUID } from "@/lib/utils";
import { getUserEmail } from "thirdweb/wallets/in-app";

const privateKey = process.env.AUTH_PRIVATE_KEY || "";

if (!privateKey) {
  throw new Error("Missing AUTH_PRIVATE_KEY in .env file.");
}

const thirdwebAuth = createAuth({
  domain: process.env.NEXT_PUBLIC_THIRDWEB_AUTH_DOMAIN || "",
  adminAccount: privateKeyToAccount({ client, privateKey }),
  client: client,
});

export const generatePayload = thirdwebAuth.generatePayload;

export async function login(payload: VerifyLoginPayloadParams) {
  const verifiedPayload = await thirdwebAuth.verifyPayload(payload);
  if (verifiedPayload.valid) {
    const walletAddress = verifiedPayload.payload.address;
    const email = await getUserEmail({ client });
    console.log("email ", email);

    const users = await getUser(walletAddress);
    let id = "";
    if (users.length === 0) {
      id = generateUUID();
      await createUser(id, walletAddress, email); // Assuming password is not needed for wallet login
    } else {
      id = users[0].id;
    }
    const jwt = await thirdwebAuth.generateJWT({
      payload: verifiedPayload.payload,
      context: {
        id: id,
        tier: users.length > 0 ? users[0].tier : "free",
        messageCount: users.length > 0 ? users[0].messageCount : 0,
        email: email ? email : "",
      },
    });
    (await cookies()).set("jwt", jwt);
  }
}

export async function isLoggedIn() {
  const jwt = (await cookies()).get("jwt");
  if (!jwt?.value) {
    return false;
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  return authResult.valid;
}

export async function logout() {
  (await cookies()).delete("jwt");
}

export async function getUserSession(): Promise<ThirdwebSession> {
  const email = await getUserEmail({ client });
  console.log("email ", email);
  const jwt = (await cookies()).get("jwt");
  if (!jwt?.value) {
    return {
      valid: false,
      parsedJWT: {
        sub: "",
        ctx: {
          id: "",
          tier: "",
          messageCount: 0,
          email: "",
        },
      },
    };
  }

  const authResult = await thirdwebAuth.verifyJWT({ jwt: jwt.value });
  //@ts-ignore
  return authResult;
}
