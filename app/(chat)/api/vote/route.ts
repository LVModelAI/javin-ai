import { getUserSession, isLoggedIn } from "@/app/(auth)/actions";
import { getUser, getVotesByChatId, voteMessage } from "@/lib/db/queries";
import { ThirdwebSession } from "@/types/thirdwebSession";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const chatId = searchParams.get("chatId");

  if (!chatId) {
    return new Response("chatId is required", { status: 400 });
  }

  const loggedIn = await isLoggedIn();
  console.log("loggedIn", loggedIn);
  if (!loggedIn) {
    return Response.json([], { status: 200 });
  }

  const session = await getUserSession();
  console.log("session", session);

  if (!session || !session.parsedJWT || !session.parsedJWT.sub) {
    return Response.json([], { status: 200 });
  }
  const votes = await getVotesByChatId({ id: chatId });

  return Response.json(votes, { status: 200 });
}

export async function PATCH(request: Request) {
  const {
    chatId,
    messageId,
    type,
  }: { chatId: string; messageId: string; type: "up" | "down" } =
    await request.json();

  if (!chatId || !messageId || !type) {
    return new Response("messageId and type are required", { status: 400 });
  }

  const session = await getUserSession();

  if (!session || !session.parsedJWT.ctx.id || !session.parsedJWT.sub) {
    return new Response("Unauthorized", { status: 401 });
  }

  await voteMessage({
    chatId,
    messageId,
    type: type,
  });

  return new Response("Message voted", { status: 200 });
}
