import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import { About } from "@/components/about";

export default async function Page() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);

  return (
    <div className="flex flex-col w-full h-dvh bg-background">
      <About user={session?.user} />
    </div>
  );
}
