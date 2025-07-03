import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/app/(auth)/auth";
import OutputVerifier from "./output-verify";

export default async function Page() {
  const session = await auth();
  const user = session?.user;

  return (
    <SidebarProvider defaultOpen={true}>
      <OutputVerifier user={user} />
    </SidebarProvider>
  );
}
