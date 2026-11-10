import { requireApiUser, requireSameOrigin, isResponse, readJson } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomAccess } from "@/lib/rooms";
import { roomIdSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const rows = await prisma.room_favorites.findMany({
    where: { user_id: auth.user.user_id },
    orderBy: { favorited_at: "desc" },
    select: {
      favorited_at: true,
      rooms: {
        select: {
          room_id: true,
          owner_id: true,
          room_name: true,
          description: true,
          is_private: true,
          wallpaper: true,
          room_members: { where: { user_id: auth.user.user_id }, select: { user_id: true }, take: 1 },
          _count: { select: { room_members: true, room_favorites: true } },
        },
      },
    },
  });
  const favorites = rows
    .filter(({ rooms }) => !rooms.is_private || rooms.owner_id === auth.user.user_id || rooms.room_members.length > 0)
    .map(({ rooms, favorited_at }) => ({
      id: rooms.room_id,
      name: rooms.room_name,
      description: rooms.description ?? "",
      isPrivate: rooms.is_private,
      wallpaper: rooms.wallpaper,
      memberCount: rooms._count.room_members,
      favoriteCount: rooms._count.room_favorites,
      favoritedAt: favorited_at,
    }));
  return Response.json({ favorites });
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const body = await readJson(request);
  if (isResponse(body)) return body;
  const roomId = roomIdSchema.safeParse((body as { roomId?: unknown } | null)?.roomId);
  if (!roomId.success) return Response.json({ message: "A valid roomId is required." }, { status: 400 });
  const access = await roomAccess(roomId.data, auth.user.user_id);
  if (!access.room) return Response.json({ message: "Room not found." }, { status: 404 });
  if (access.room.is_private && !access.isMember) {
    return Response.json({ message: "Join the private room before saving it." }, { status: 403 });
  }

  await prisma.room_favorites.upsert({
    where: { user_id_room_id: { user_id: auth.user.user_id, room_id: roomId.data } },
    update: {},
    create: { user_id: auth.user.user_id, room_id: roomId.data },
  });
  return Response.json({ favorited: true });
}

export async function DELETE(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const roomId = roomIdSchema.safeParse(new URL(request.url).searchParams.get("roomId"));
  if (!roomId.success) return Response.json({ message: "A valid roomId is required." }, { status: 400 });
  await prisma.room_favorites.deleteMany({ where: { user_id: auth.user.user_id, room_id: roomId.data } });
  return Response.json({ favorited: false });
}
