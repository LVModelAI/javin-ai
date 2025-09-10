import { SidebarProvider } from "@/components/ui/sidebar";
import { auth } from "@/app/(auth)/auth";
import GetStats from "@/app/(verify)/verify-dashboard/get-stats";

export default async function page() {
  const session = await auth();
  const user = session?.user;

  return (
    <SidebarProvider defaultOpen={true}>
      <GetStats user={user} />
    </SidebarProvider>
  );
}
