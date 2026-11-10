import { Prisma } from "@/generated/prisma/client";
import { requireApiUser, requireSameOrigin, isResponse, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { friendRequestSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const box = new URL(request.url).searchParams.get("box") ?? "all";
  if (box !== "all" && box !== "incoming" && box !== "outgoing") {
    return Response.json({ message: "box must be all, incoming, or outgoing." }, { status: 400 });
  }

  const requests = await prisma.friend_requests.findMany({
    where: {
      request_status: "pending",
      ...(box === "incoming" ? { receiver_id: auth.user.user_id } : {}),
      ...(box === "outgoing" ? { sender_id: auth.user.user_id } : {}),
      ...(box === "all" ? { OR: [{ receiver_id: auth.user.user_id }, { sender_id: auth.user.user_id }] } : {}),
    },
    orderBy: { sent_at: "desc" },
    select: {
      request_id: true,
      sender_id: true,
      receiver_id: true,
      sent_at: true,
      users_friend_requests_sender_idTousers: {
        select: { user_id: true, username: true, display_name: true, avatar_url: true },
      },
      users_friend_requests_receiver_idTousers: {
        select: { user_id: true, username: true, display_name: true, avatar_url: true },
      },
    },
  });

  return Response.json({ requests: requests.map((item) => ({
    id: item.request_id,
    senderId: item.sender_id,
    receiverId: item.receiver_id,
    sentAt: item.sent_at,
    sender: {
      id: item.users_friend_requests_sender_idTousers.user_id,
      username: item.users_friend_requests_sender_idTousers.username,
      displayName: item.users_friend_requests_sender_idTousers.display_name,
      avatarUrl: item.users_friend_requests_sender_idTousers.avatar_url,
    },
    receiver: {
      id: item.users_friend_requests_receiver_idTousers.user_id,
      username: item.users_friend_requests_receiver_idTousers.username,
      displayName: item.users_friend_requests_receiver_idTousers.display_name,
      avatarUrl: item.users_friend_requests_receiver_idTousers.avatar_url,
    },
  })) });
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const body = await readJson(request);
  if (isResponse(body)) return body;
  const parsed = friendRequestSchema.safeParse(body);
  if (!parsed.success) return Response.json({ message: "Provide a valid receiverId or username." }, { status: 400 });
  const receiver = "receiverId" in parsed.data
    ? await prisma.users.findUnique({ where: { user_id: parsed.data.receiverId }, select: { user_id: true, account_status: true } })
    : await prisma.users.findUnique({ where: { username: parsed.data.username }, select: { user_id: true, account_status: true } });
  if (!receiver || receiver.account_status !== "active") {
    return Response.json({ message: "User not found." }, { status: 404 });
  }
  if (receiver.user_id === auth.user.user_id) {
    return Response.json({ message: "You cannot send a friend request to yourself." }, { status: 400 });
  }

  const lowId = Math.min(auth.user.user_id, receiver.user_id);
  const highId = Math.max(auth.user.user_id, receiver.user_id);
  const [friendship, existing, previousOutgoing] = await Promise.all([
    prisma.friendships.findUnique({ where: { user_id_1_user_id_2: { user_id_1: lowId, user_id_2: highId } } }),
    prisma.friend_requests.findFirst({
      where: {
        request_status: "pending",
        OR: [
          { sender_id: auth.user.user_id, receiver_id: receiver.user_id },
          { sender_id: receiver.user_id, receiver_id: auth.user.user_id },
        ],
      },
      select: { request_id: true },
    }),
    prisma.friend_requests.findUnique({
      where: { sender_id_receiver_id: { sender_id: auth.user.user_id, receiver_id: receiver.user_id } },
      select: { request_id: true, request_status: true },
    }),
  ]);
  if (friendship) return Response.json({ message: "You are already friends." }, { status: 409 });
  if (existing) return Response.json({ message: "A pending friend request already exists." }, { status: 409 });

  if (previousOutgoing && (previousOutgoing.request_status === "rejected" || previousOutgoing.request_status === "cancelled")) {
    const reopened = await prisma.friend_requests.update({
      where: { request_id: previousOutgoing.request_id },
      data: { request_status: "pending", sent_at: new Date(), responded_at: null },
      select: { request_id: true, sent_at: true },
    });
    return Response.json({ request: { id: reopened.request_id, sentAt: reopened.sent_at } }, { status: 201 });
  }
  if (previousOutgoing) return Response.json({ message: "This friend request cannot be sent again." }, { status: 409 });

  try {
    const created = await prisma.friend_requests.create({
      data: { sender_id: auth.user.user_id, receiver_id: receiver.user_id },
      select: { request_id: true, sent_at: true },
    });
    return Response.json({ request: { id: created.request_id, sentAt: created.sent_at } }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return Response.json({ message: "A friend request already exists." }, { status: 409 });
    }
    console.error("Friend request creation failed:", error);
    return Response.json({ message: "Could not send the friend request right now." }, { status: 500 });
  }
}
