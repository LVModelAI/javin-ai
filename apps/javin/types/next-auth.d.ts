import NextAuth, { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    email: string;
    name: string | null;
    image: string | null;
    walletAddress: string | null;
    tier: string;
    messageCount: number;
  }

  interface Session extends DefaultSession {
    user: {
      id: string;
      tier: string;
    } & DefaultSession["user"];
  }
}
