import { requireApiUser, requireSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomIdSchema } from "@/lib/validation";

type Context = { params: Promise<{ requestId: string }> };

export async function POST(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const { requestId: rawId } = await params;
  const id = roomIdSchema.safeParse(rawId);
  if (!id.success) return Response.json({ message: "Invalid request id." }, { status: 400 });

  const result = await prisma.$transaction(async (tx) => {
    const friendRequest = await tx.friend_requests.findUnique({ where: { request_id: id.data } });
    if (!friendRequest || friendRequest.receiver_id !== auth.user.user_id || friendRequest.request_status !== "pending") {
      return false;
    }
    const updated = await tx.friend_requests.updateMany({
      where: { request_id: id.data, receiver_id: auth.user.user_id, request_status: "pending" },
      data: { request_status: "accepted", responded_at: new Date() },
    });
    if (updated.count !== 1) return false;
    const userId1 = Math.min(friendRequest.sender_id, friendRequest.receiver_id);
    const userId2 = Math.max(friendRequest.sender_id, friendRequest.receiver_id);
    await tx.friendships.upsert({
      where: { user_id_1_user_id_2: { user_id_1: userId1, user_id_2: userId2 } },
      update: {},
      create: { user_id_1: userId1, user_id_2: userId2 },
    });
    return true;
  });

  if (!result) return Response.json({ message: "Pending friend request not found." }, { status: 404 });
  return Response.json({ accepted: true });
}
