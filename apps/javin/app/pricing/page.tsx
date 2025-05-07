import { cookies } from "next/headers";
import { auth } from "@/app/(auth)/auth";
import { Pricing } from "@/components/pricing";

export default async function Page() {
  const [session, cookieStore] = await Promise.all([auth(), cookies()]);

  return (
    <div className="flex flex-col w-full h-dvh bg-background">
      <Pricing user={session?.user} />
    </div>
  );
}
