import { requireApiUser, requireSameOrigin, isResponse, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomAccess } from "@/lib/rooms";
import { messageSchema, paginationSchema, roomIdSchema } from "@/lib/validation";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const { roomId: rawId } = await params;
  const parsedRoomId = roomIdSchema.safeParse(rawId);
  if (!parsedRoomId.success) return Response.json({ message: "Invalid room id." }, { status: 400 });
  const access = await roomAccess(parsedRoomId.data, auth.user.user_id);
  if (!access.room) return Response.json({ message: "Room not found." }, { status: 404 });
  if (!access.isMember) return Response.json({ message: "Join the room to view its chat." }, { status: 403 });

  const url = new URL(request.url);
  const page = paginationSchema.safeParse({ limit: url.searchParams.get("limit") ?? undefined, before: url.searchParams.get("before") ?? undefined });
  if (!page.success) return Response.json({ message: "Invalid message pagination values." }, { status: 400 });
  const before = page.data.before ? BigInt(page.data.before) : undefined;
  const messages = await prisma.chat_messages.findMany({
    where: {
      room_id: parsedRoomId.data,
      is_deleted: false,
      ...(before ? { message_id: { lt: before } } : {}),
    },
    orderBy: { message_id: "desc" },
    take: page.data.limit + 1,
    select: {
      message_id: true,
      sender_id: true,
      message_text: true,
      sent_at: true,
      users: { select: { display_name: true, username: true, avatar_url: true } },
    },
  });
  const hasMore = messages.length > page.data.limit;
  const currentPage = messages.slice(0, page.data.limit);
  const nextCursor = hasMore ? currentPage[currentPage.length - 1]?.message_id.toString() : null;
  return Response.json({
    messages: currentPage.reverse().map((message) => ({
      id: message.message_id.toString(),
      senderId: message.sender_id,
      text: message.message_text,
      sentAt: message.sent_at,
      sender: {
        displayName: message.users.display_name,
        username: message.users.username,
        avatarUrl: message.users.avatar_url,
      },
    })),
    page: { limit: page.data.limit, hasMore, nextCursor },
  });
}

export async function POST(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const { roomId: rawId } = await params;
  const parsedRoomId = roomIdSchema.safeParse(rawId);
  if (!parsedRoomId.success) return Response.json({ message: "Invalid room id." }, { status: 400 });
  const access = await roomAccess(parsedRoomId.data, auth.user.user_id);
  if (!access.room) return Response.json({ message: "Room not found." }, { status: 404 });
  if (!access.isMember) return Response.json({ message: "Join the room to send messages." }, { status: 403 });

  const body = await readJson(request);
  if (isResponse(body)) return body;
  const parsed = messageSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Message must be between 1 and 2000 characters." }, { status: 400 });

  const message = await prisma.chat_messages.create({
    data: {
      room_id: parsedRoomId.data,
      sender_id: auth.user.user_id,
      message_text: parsed.data.messageText,
    },
    select: { message_id: true, message_text: true, sent_at: true },
  });
  return Response.json({ message: {
    id: message.message_id.toString(),
    senderId: auth.user.user_id,
    text: message.message_text,
    sentAt: message.sent_at,
    sender: { displayName: auth.user.display_name, username: auth.user.username, avatarUrl: auth.user.avatar_url },
  } }, { status: 201 });
}
