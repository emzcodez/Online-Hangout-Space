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
    select: { room_id: true, owner_id: true, is_private: true },
  });
  if (!room) return Response.json({ message: "Room not found." }, { status: 404 });
  if (room.is_private && room.owner_id !== auth.user.user_id) {
    const existing = await prisma.room_members.findUnique({
      where: { room_id_user_id: { room_id: room.room_id, user_id: auth.user.user_id } },
      select: { room_id: true },
    });
    if (!existing) return Response.json({ message: "This private room is invitation-only." }, { status: 403 });
  }

  await prisma.room_members.upsert({
    where: { room_id_user_id: { room_id: room.room_id, user_id: auth.user.user_id } },
    update: {},
    create: {
      room_id: room.room_id,
      user_id: auth.user.user_id,
      member_role: room.owner_id === auth.user.user_id ? "owner" : "member",
    },
  });
  const memberCount = await prisma.room_members.count({ where: { room_id: room.room_id } });
  return Response.json({ joined: true, memberCount });
}
