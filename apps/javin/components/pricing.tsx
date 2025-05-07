"use client";

import { ChatHeader } from "@/components/chat-header";
import type { User } from "next-auth";
import { Check } from "lucide-react";
export function Pricing({ user }: { user?: User }) {
  return (
    <div className="flex flex-col min-w-0 h-dvh bg-background text-white">
      <ChatHeader messages={[]} user={user} />

      <div className="flex flex-col items-center text-center mt-10 px-4 pb-16">
        <h1 className="text-3xl font-bold">Pricing</h1>
        <p className="text-muted-foreground mt-2 max-w-md">
          Whether you need quick answers or in-depth research, Javin adapts to
          your search needs.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-10 w-full max-w-4xl">
          {/* Starter Plan */}
          <div className="border border-zinc-700 rounded-xl p-6 bg-black/50 shadow-sm flex flex-col justify-between">
            <div className="text-left space-y-4">
              <h2 className="text-xl font-semibold">Starter</h2>
              <div>
                <span className="text-3xl font-bold">$0</span>
                <p className="text-sm text-muted-foreground">
                  per month, billed annually
                </p>
              </div>
              <p className="text-sm text-muted-foreground">For casual users</p>
              <ul className="text-left text-sm space-y-1">
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>20 prompts per day</p>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Automatic data enrichment</p>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Up to 3 seats</p>
                  </div>
                </li>
              </ul>
            </div>
            <button
              disabled
              className="mt-6 w-full border border-zinc-600 bg-zinc-900 rounded-full py-2 text-sm text-muted-foreground cursor-not-allowed"
            >
              Your current plan
            </button>
          </div>

          {/* Pro Plan */}
          <div className="border border-javinOrange rounded-xl p-6 bg-gradient-to-b from-black to-javinOrange-muted shadow-md flex flex-col justify-between">
            <div className="text-left space-y-4">
              <h2 className="text-xl font-semibold text-javinOrange">Pro</h2>
              <div>
                <span className="text-3xl font-bold">$20</span>
                <p className="text-sm text-muted-foreground">
                  per month, billed annually
                </p>
              </div>
              <p className="text-sm text-muted-foreground">For pro users</p>
              <ul className="text-left text-sm space-y-1">
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Everything in starter</p>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Unlimited prompts per day</p>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Early access to new features</p>
                  </div>
                </li>
                <li>
                  <div className="flex items-center gap-2">
                    <Check size={16} /> <p>Priority access during peak hours</p>
                  </div>
                </li>
              </ul>
            </div>
            <button className="mt-6 w-full bg-zinc-950 hover:bg-zinc-800 border border-zinc-700 text-white rounded-full py-2 text-sm font-medium">
              Get started
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
