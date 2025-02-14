import { getUserSession } from "@/app/(auth)/actions";
import { getChatsByUserId } from "@/lib/db/queries";

export async function GET() {
  const session = await getUserSession();

  if (!session || !session.parsedJWT.ctx.id) {
    return Response.json([]);
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const chats = await getChatsByUserId({ id: session.parsedJWT.ctx.id! });

  return Response.json(chats);
}
