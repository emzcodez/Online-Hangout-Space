import { requireApiUser, requireSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomIdSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const rows = await prisma.friendships.findMany({
    where: { OR: [{ user_id_1: auth.user.user_id }, { user_id_2: auth.user.user_id }] },
    orderBy: { created_at: "desc" },
    include: {
      users_friendships_user_id_1Tousers: { select: { user_id: true, username: true, display_name: true, avatar_url: true } },
      users_friendships_user_id_2Tousers: { select: { user_id: true, username: true, display_name: true, avatar_url: true } },
    },
  });
  return Response.json({ friends: rows.map((row) => {
    const friend = row.user_id_1 === auth.user.user_id
      ? row.users_friendships_user_id_2Tousers
      : row.users_friendships_user_id_1Tousers;
    return { id: friend.user_id, username: friend.username, displayName: friend.display_name, avatarUrl: friend.avatar_url };
  }) });
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const target = roomIdSchema.safeParse(new URL(request.url).searchParams.get("userId"));
  if (!target.success) return Response.json({ message: "A valid userId is required." }, { status: 400 });
  if (target.data === auth.user.user_id) return Response.json({ message: "Invalid friend id." }, { status: 400 });
  const userId1 = Math.min(auth.user.user_id, target.data);
  const userId2 = Math.max(auth.user.user_id, target.data);
  const removed = await prisma.$transaction(async (tx) => {
    const deleted = await tx.friendships.deleteMany({
      where: { user_id_1: userId1, user_id_2: userId2 },
    });
    if (!deleted.count) return false;
    await tx.friend_requests.updateMany({
      where: {
        request_status: "accepted",
        OR: [
          { sender_id: auth.user.user_id, receiver_id: target.data },
          { sender_id: target.data, receiver_id: auth.user.user_id },
        ],
      },
      data: { request_status: "cancelled", responded_at: new Date() },
    });
    return true;
  });
  if (!removed) return Response.json({ message: "Friendship not found." }, { status: 404 });
  return Response.json({ removed: true });
}
