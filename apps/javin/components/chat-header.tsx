"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon, VercelIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { VisibilityType, VisibilitySelector } from "./visibility-selector";
import { signOut } from "next-auth/react";
import { User } from "next-auth";
import { SidebarUserNav } from "./sidebar-user-nav";
import { Message } from "ai";
import { useTheme } from "next-themes";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  messages,
  user,
}: {
  chatId: string;
  selectedModelId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
  messages: Message[];
  user?: User;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { resolvedTheme } = useTheme();

  const { width: windowWidth } = useWindowSize();
  // console.log("user in chat header", user);
  return (
    <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
      <div className="flex items-center justify-start gap-2 w-full">
        <SidebarToggle />

        <div className="">
          {(!open || windowWidth < 768) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="order-2 md:order-1 md:px-2 px-2 md:h-fit ml-auto md:ml-0"
                  onClick={() => {
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <PlusIcon />
                  <span className="sr-only md:not-sr-only">New Chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Chat</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* {!isReadonly && (
          <ModelSelector selectedModelId={selectedModelId} className=" " />
        )} */}
      </div>
      {messages.length > 0 && (
        <Link href={"/"} className="font-semibold">
          {resolvedTheme == "dark" ? (
            <img
              alt="Javin.ai"
              src="/images/javin/banner/javin-banner-white.svg"
              className="w-48 h-auto"
            />
          ) : (
            resolvedTheme == "light" && (
              <img
                alt="Javin.ai"
                src="/images/javin/banner/javin-banner-black.svg"
                className="w-48 h-auto"
              />
            )
          )}
        </Link>
      )}
      {/* REPLACE TEXT WITH THE ACTUAL LOGO WHEN YOU GET ONE WITH WHITE TEXT */}
      {/* <Image src={"/javin-logo.png"} width={100} height={30} alt="Javin.ai" /> */}

      <div className="flex justify-end w-full">
        <div className="">
          {user && user?.email ? (
            // <button
            //   type="button"
            //   className="border py-1 rounded bg-gray-900 dark:bg-zinc-50 text-white dark:text-black font-semibold text-sm px-3"
            //   onClick={() => {
            //     signOut({
            //       redirectTo: "/",
            //     });
            //   }}
            // >
            //   Logout
            // </button>
            <div>
              <SidebarUserNav user={user} />
            </div>
          ) : (
            <button
              type="button"
              className="border py-1 rounded bg-gray-900 dark:bg-zinc-50 text-white dark:text-black font-semibold text-sm px-3"
              onClick={() => {
                router.push("/login");
              }}
            >
              Login
            </button>
          )}
        </div>
      </div>

      {/* {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )} */}
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.messages === nextProps.messages &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});
