import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const roomActivitySchema = new Schema({
  roomId: { type: Number, required: true },
  roomName: { type: String, required: true, maxlength: 100 },
  userId: { type: Number, required: true },
  username: { type: String, required: true, maxlength: 40 },
  displayName: { type: String, required: true, maxlength: 80 },
  action: { type: String, required: true, enum: ["room_created", "member_joined", "message_sent", "room_saved"] },
  description: { type: String, required: true, maxlength: 300 },
  metadata: { type: Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, immutable: true },
}, { versionKey: false });

roomActivitySchema.index({ roomId: 1, createdAt: -1 });
roomActivitySchema.index({ userId: 1, createdAt: -1 });
roomActivitySchema.index({ createdAt: -1 });

export type RoomActivityDocument = InferSchemaType<typeof roomActivitySchema>;
export const RoomActivity: Model<RoomActivityDocument> =
  (mongoose.models.RoomActivity as Model<RoomActivityDocument>) ||
  mongoose.model<RoomActivityDocument>("RoomActivity", roomActivitySchema);
