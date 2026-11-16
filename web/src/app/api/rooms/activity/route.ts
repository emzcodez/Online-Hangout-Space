import { requireApiUser } from "@/lib/api";
import { connectMongoDB } from "@/lib/mongodb";
import { RoomActivity } from "@/models/roomActivity";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  const url = new URL(request.url);
  const rawRoomId = url.searchParams.get("roomId");
  const roomId = rawRoomId ? Number(rawRoomId) : null;
  if (rawRoomId && (!Number.isSafeInteger(roomId) || (roomId ?? 0) < 1)) {
    return Response.json({ message: "Invalid roomId." }, { status: 400 });
  }

  try {
    await connectMongoDB();
    const membershipWhere = roomId
      ? { room_id: roomId, user_id: auth.user.user_id }
      : { user_id: auth.user.user_id };
    const memberships = await prisma.room_members.findMany({
      where: membershipWhere, select: { room_id: true },
    });
    const allowedRoomIds = memberships.map((item) => item.room_id);
    if (roomId && !allowedRoomIds.includes(roomId)) {
      return Response.json({ message: "Join this room to view its activity." }, { status: 403 });
    }
    const filter = roomId ? { roomId } : { roomId: { $in: allowedRoomIds } };
    const [activities, summary] = await Promise.all([
      RoomActivity.find(filter).sort({ createdAt: -1 }).limit(40).lean(),
      RoomActivity.aggregate([
        { $match: filter },
        { $group: { _id: "$action", total: { $sum: 1 } } },
        { $sort: { total: -1 } },
      ]),
    ]);
    return Response.json({
      activities,
      summary: summary.map((item) => ({ action: item._id, total: item.total })),
    });
  } catch (error) {
    console.error("Room activity fetch failed:", error);
    return Response.json({ message: "Room activity is temporarily unavailable." }, { status: 503 });
  }
}
