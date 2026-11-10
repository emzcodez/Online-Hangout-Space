import { requireApiUser, requireSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomIdSchema } from "@/lib/validation";

type Context = { params: Promise<{ roomId: string }> };

export async function POST(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const { roomId: rawId } = await params;
  const parsedId = roomIdSchema.safeParse(rawId);
  if (!parsedId.success) return Response.json({ message: "Invalid room id." }, { status: 400 });

  const room = await prisma.rooms.findUnique({
    where: { room_id: parsedId.data },
    select: { room_id: true, owner_id: true },
  });
  if (!room) return Response.json({ message: "Room not found." }, { status: 404 });
  if (room.owner_id === auth.user.user_id) {
    return Response.json({ message: "Room owners cannot leave their room." }, { status: 409 });
  }

  await prisma.room_members.deleteMany({
    where: { room_id: room.room_id, user_id: auth.user.user_id },
  });
  const memberCount = await prisma.room_members.count({ where: { room_id: room.room_id } });
  return Response.json({ left: true, memberCount });
}
