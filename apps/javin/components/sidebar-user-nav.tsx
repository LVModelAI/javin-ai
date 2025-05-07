"use client";
import { ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import type { User } from "next-auth";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { toast } from "sonner";
import { useEffect, useState } from "react";

export function SidebarUserNav({ user }: { user: User }) {
  const { setTheme, theme } = useTheme();

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton className="data-[state=open]:bg-sidebar-accent bg-secondary data-[state=open]:text-sidebar-accent-foreground h-10 border rounded-full ">
              {user?.image ? (
                <Image
                  src={user.image}
                  alt="User Avatar"
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              ) : (
                <Image
                  src={`https://avatar.vercel.sh/${user.email}`}
                  alt={user.email ?? "User Avatar"}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )}
              <span className="hidden md:block truncate">
                {user?.name ?? user?.email}
              </span>
              <ChevronDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" className="w-full" sideOffset={4}>
            <div className="block md:hidden">
              <DropdownMenuItem>
                <span className="truncate">{user?.email}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
            </div>
            <DropdownMenuItem className="cursor-pointer p-0">
              <Link
                className="bg-javinOrange text-white font-bold w-full text-center p-2 rounded-sm "
                href="/pricing"
              >
                <p>Upgrade to pro</p>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() => setTheme(theme === "dark" ? "light" : "dark")}
            >
              {`Toggle ${theme === "light" ? "dark" : "light"} mode`}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem
              className="cursor-pointer"
              onSelect={handleInstallClick}
            >
              <span className="truncate">Install</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem
              className="cursor-pointer"
              onSelect={() =>
                toast.error("Comming soon.", { position: "bottom-center" })
              }
            >
              <span className="truncate">Settings</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <button
                type="button"
                className="w-full cursor-pointer"
                onClick={() => {
                  signOut({
                    redirectTo: "/",
                  });
                }}
              >
                Sign out
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
