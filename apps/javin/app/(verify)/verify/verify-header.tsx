"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWindowSize } from "usehooks-ts";
import { User } from "next-auth";
import { useTheme } from "next-themes";
import TextStrip from "@/components/text-strip";
import { SidebarUserNav } from "@/components/sidebar-user-nav";

export default function VerifyPageHeader({
  user,
}: {
  user?: User;
}) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();

  return (
    <div className="flex flex-col">
      <header className="flex sticky top-0 bg-background py-1.5 items-center px-2 md:px-2 gap-2">
        <div className="flex items-center justify-start gap-2 w-full">
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
        </div>
        <div className="flex justify-end items-center w-full">
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

        {/* {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          selectedVisibilityType={selectedVisibilityType}
          className="order-1 md:order-3"
        />
      )} */}
      </header>
      <TextStrip />
    </div>
  );
}
