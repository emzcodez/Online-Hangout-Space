import { requireApiUser, requireSameOrigin } from "@/lib/api";
import { connectMongoDB } from "@/lib/mongodb";
import { Notification } from "@/models/notification";

export async function GET() {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  try {
    await connectMongoDB();
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: auth.user.user_id }).sort({ createdAt: -1 }).limit(50).lean(),
      Notification.countDocuments({ userId: auth.user.user_id, read: false }),
    ]);
    return Response.json({ notifications, unreadCount });
  } catch (error) {
    console.error("Notification fetch failed:", error);
    return Response.json({ message: "Notifications are temporarily unavailable." }, { status: 503 });
  }
}

export async function PATCH(request: Request) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;
  try {
    const body = await request.json().catch(() => ({}));
    await connectMongoDB();
    if (body.markAllRead === true) {
      await Notification.updateMany({ userId: auth.user.user_id, read: false }, { $set: { read: true } });
    } else if (typeof body.id === "string" && /^[a-f\d]{24}$/i.test(body.id)) {
      await Notification.updateOne({ _id: body.id, userId: auth.user.user_id }, { $set: { read: true } });
    } else {
      return Response.json({ message: "Provide a valid notification id or markAllRead: true." }, { status: 400 });
    }
    return Response.json({ updated: true });
  } catch (error) {
    console.error("Notification update failed:", error);
    return Response.json({ message: "Could not update notifications." }, { status: 503 });
  }
}
