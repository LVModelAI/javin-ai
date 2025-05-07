"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { memo } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { VisibilityType } from "./visibility-selector";
import { User } from "next-auth";
import { SidebarUserNav } from "./sidebar-user-nav";
import { Message } from "ai";
import { useTheme } from "next-themes";
import TextStrip from "./text-strip";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

function PureChatHeader({
  chatId,
  selectedModelId,
  selectedVisibilityType,
  isReadonly,
  messages,
  user,
}: {
  chatId?: string;
  selectedModelId?: string;
  selectedVisibilityType?: VisibilityType;
  isReadonly?: boolean;
  messages: Message[];
  user?: User;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { resolvedTheme } = useTheme();

  const { width: windowWidth } = useWindowSize();
  // console.log("user in chat header", user);
  const pathname = usePathname();
  const isSimplePage = pathname === "/pricing" || pathname === "/about";

  return (
    <div className="flex flex-col">
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2 justify-between">
        {/* left side */}
        <div className="flex items-center justify-start gap-2  w-fit">
          {isSimplePage ? (
            <button
              onClick={() => router.back()}
              className="px-3 py-2 rounded-full border border-zinc-200 dark:border-zinc-700 flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800"
            >
              <ArrowLeft size={16} />
              <p className="text-sm">Back</p>
            </button>
          ) : (
            <>
              <SidebarToggle />
              {(!open || windowWidth < 768) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      className="order-2 md:order-1 md:px-3 px-3 md:h-fit  md:ml-0 bg-secondary rounded-full"
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
            </>
          )}
        </div>

        {/* logo */}
        {(messages.length > 0 || isSimplePage) && (
          <Link href={"/"} className="font-semibold">
            {resolvedTheme == "dark" ? (
              <img
                alt="Javin.ai"
                src="/images/javin/banner/javin-banner-white.svg"
                className="w-24 h-auto"
              />
            ) : (
              resolvedTheme == "light" && (
                <img
                  alt="Javin.ai"
                  src="/images/javin/banner/javin-banner-black.svg"
                  className="w-24 h-auto"
                />
              )
            )}
          </Link>
        )}

        {/* right side */}
        <div className="flex justify-end w-fit items-center gap-2">
          {messages.length == 0 && !isSimplePage && <TextStrip />}

          {/* prfile */}
          <div className="">
            {user && user?.email ? (
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
      </header>
    </div>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.selectedModelId === nextProps.selectedModelId &&
    prevProps.messages === nextProps.messages &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType
  );
});
