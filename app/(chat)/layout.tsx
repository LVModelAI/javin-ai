import { cookies } from "next/headers";

import { AppSidebar } from "@/components/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import Script from "next/script";
import { getUserSession } from "../(auth)/actions";
import { User } from "next-auth";

export const experimental_ppr = true;

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const isCollapsed = cookieStore.get("sidebar:state")?.value !== "true";
  const session = await getUserSession();
  const userInfo: User = {
    id: session.parsedJWT.ctx.id,
    walletAddress: session.parsedJWT.sub,
    tier: session.parsedJWT.ctx.tier,
    messageCount: session.parsedJWT.ctx.messageCount,
  };
  return (
    <>
      <Script
        src="https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js"
        strategy="beforeInteractive"
      />
      <SidebarProvider defaultOpen={!isCollapsed}>
        <AppSidebar user={userInfo} />
        <SidebarInset>{children}</SidebarInset>
      </SidebarProvider>
    </>
  );
}
