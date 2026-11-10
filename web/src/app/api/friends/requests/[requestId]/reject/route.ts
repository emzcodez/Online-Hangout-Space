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

  const result = await prisma.friend_requests.updateMany({
    where: { request_id: id.data, receiver_id: auth.user.user_id, request_status: "pending" },
    data: { request_status: "rejected", responded_at: new Date() },
  });
  if (result.count === 0) return Response.json({ message: "Pending friend request not found." }, { status: 404 });
  return Response.json({ rejected: true });
}
