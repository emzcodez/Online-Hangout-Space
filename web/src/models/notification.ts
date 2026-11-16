import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const notificationSchema = new Schema({
  userId: { type: Number, required: true, index: true },
  actorId: { type: Number, default: null },
  type: { type: String, required: true, enum: ["friend_request", "friend_accepted", "room_invite", "room_activity", "system"] },
  title: { type: String, required: true, maxlength: 120 },
  message: { type: String, required: true, maxlength: 500 },
  link: { type: String, default: null, maxlength: 300 },
  read: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

export type NotificationDocument = InferSchemaType<typeof notificationSchema>;
export const Notification: Model<NotificationDocument> =
  (mongoose.models.Notification as Model<NotificationDocument>) ||
  mongoose.model<NotificationDocument>("Notification", notificationSchema);
