import { prisma } from "@/lib/prisma";

export async function roomAccess(roomId: number, userId: number) {
  const room = await prisma.rooms.findUnique({
    where: { room_id: roomId },
    select: { room_id: true, owner_id: true, is_private: true },
  });
  if (!room) return { room: null, isMember: false, isOwner: false };

  const isOwner = room.owner_id === userId;
  const membership = isOwner ? true : Boolean(await prisma.room_members.findUnique({
    where: { room_id_user_id: { room_id: roomId, user_id: userId } },
    select: { room_id: true },
  }));
  return { room, isMember: membership, isOwner };
}

export async function canViewRoom(roomId: number, userId: number) {
  const access = await roomAccess(roomId, userId);
  return Boolean(access.room && (!access.room.is_private || access.isMember));
}
