import { Prisma } from "@/generated/prisma/client";
import { isResponse, readJson, requireApiUser, requireSameOrigin } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { createRoomSchema } from "@/lib/validation";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const url = new URL(request.url);
  const scope = url.searchParams.get("scope") ?? "all";
  const search = url.searchParams.get("search")?.trim();
  const membership = { room_members: { some: { user_id: auth.user.user_id } } };
  const where: Prisma.roomsWhereInput = {
    ...(search ? { room_name: { contains: search } } : {}),
    ...(scope === "mine"
      ? { OR: [{ owner_id: auth.user.user_id }, membership] }
      : scope === "discover"
        ? { is_private: false }
        : { OR: [{ is_private: false }, { owner_id: auth.user.user_id }, membership] }),
  };

  const rooms = await prisma.rooms.findMany({
    where,
    orderBy: { created_at: "desc" },
    take: 100,
    select: {
      room_id: true,
      owner_id: true,
      room_name: true,
      description: true,
      is_private: true,
      wallpaper: true,
      created_at: true,
      _count: { select: { room_members: true, room_favorites: true } },
      room_members: {
        where: { user_id: auth.user.user_id },
        select: { user_id: true },
        take: 1,
      },
    },
  });

  return Response.json({ rooms: rooms.map((room) => ({
    id: room.room_id,
    name: room.room_name,
    description: room.description ?? "",
    isPrivate: room.is_private,
    wallpaper: room.wallpaper,
    createdAt: room.created_at,
    memberCount: room._count.room_members,
    favoriteCount: room._count.room_favorites,
    isMember: room.owner_id === auth.user.user_id || room.room_members.length > 0,
    isOwner: room.owner_id === auth.user.user_id,
  })) });
}

export async function POST(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const body = await readJson(request);
  if (isResponse(body)) return body;
  const parsed = createRoomSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Please provide a valid room name, description, and privacy setting." }, { status: 400 });
  }

  try {
    const room = await prisma.$transaction(async (tx) => {
      const created = await tx.rooms.create({
        data: {
          owner_id: auth.user.user_id,
          room_name: parsed.data.roomName,
          description: parsed.data.description || null,
          is_private: parsed.data.isPrivate,
        },
      });
      await tx.room_members.create({
        data: { room_id: created.room_id, user_id: auth.user.user_id, member_role: "owner" },
      });
      return created;
    });

    return Response.json({
      room: {
        id: room.room_id,
        name: room.room_name,
        description: room.description ?? "",
        isPrivate: room.is_private,
        wallpaper: room.wallpaper,
        createdAt: room.created_at,
        memberCount: 1,
        favoriteCount: 0,
        isMember: true,
        isOwner: true,
      },
    }, { status: 201 });
  } catch (error) {
    console.error("Room creation failed:", error);
    return Response.json({ message: "Could not create the room right now." }, { status: 500 });
  }
}
