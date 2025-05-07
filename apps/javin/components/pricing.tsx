"use client";
import { ChatHeader } from "@/components/chat-header";
import type { User } from "next-auth";

export function Pricing({ user }: { user?: User }) {
  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background">
      <ChatHeader messages={[]} user={user} />
      <div>pricing</div>
    </div>
  );
}
