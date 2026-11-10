import { requireApiUser } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomIdSchema } from "@/lib/validation";
import { roomAccess } from "@/lib/rooms";

type Context = { params: Promise<{ roomId: string }> };

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const { roomId: rawId } = await params;
  const id = roomIdSchema.safeParse(rawId);
  if (!id.success) return Response.json({ message: "Invalid room id." }, { status: 400 });

  const access = await roomAccess(id.data, auth.user.user_id);
  if (!access.room || (access.room.is_private && !access.isMember)) {
    return Response.json({ message: "Room not found." }, { status: 404 });
  }

  const room = await prisma.rooms.findUnique({
    where: { room_id: id.data },
    select: {
      room_id: true,
      owner_id: true,
      room_name: true,
      description: true,
      is_private: true,
      wallpaper: true,
      created_at: true,
      _count: { select: { room_members: true, room_favorites: true } },
    },
  });
  if (!room) return Response.json({ message: "Room not found." }, { status: 404 });

  return Response.json({ room: {
    id: room.room_id,
    name: room.room_name,
    description: room.description ?? "",
    isPrivate: room.is_private,
    wallpaper: room.wallpaper,
    createdAt: room.created_at,
    memberCount: room._count.room_members,
    favoriteCount: room._count.room_favorites,
    isMember: access.isMember,
    isOwner: access.isOwner,
  } });
}
