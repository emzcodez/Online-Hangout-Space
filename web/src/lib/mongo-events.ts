import "server-only";
import { connectMongoDB } from "@/lib/mongodb";
import { Notification } from "@/models/notification";
import { RoomActivity } from "@/models/roomActivity";

type Actor = { user_id: number; username: string; display_name: string };
export async function addNotification(input: {
  userId: number; actorId?: number | null; type: "friend_request" | "friend_accepted" | "room_invite" | "room_activity" | "system";
  title: string; message: string; link?: string | null;
}) {
  try {
    await connectMongoDB();
    await Notification.create(input);
  } catch (error) {
    // MongoDB is an additional feature store; don't fail the MySQL-backed action.
    console.error("Notification write failed:", error);
  }
}
export async function addRoomActivity(input: {
  roomId: number; roomName: string; actor: Actor;
  action: "room_created" | "member_joined" | "message_sent" | "room_saved";
  description: string; metadata?: Record<string, unknown>;
}) {
  try {
    await connectMongoDB();
    await RoomActivity.create({
      roomId: input.roomId, roomName: input.roomName,
      userId: input.actor.user_id, username: input.actor.username,
      displayName: input.actor.display_name, action: input.action,
      description: input.description, metadata: input.metadata ?? {},
    });
  } catch (error) {
    console.error("Room activity write failed:", error);
  }
}
