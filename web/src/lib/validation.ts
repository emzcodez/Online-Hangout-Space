import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid email address").max(120),
  password: z.string().min(8).refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be 72 bytes or fewer"),
});

export const registrationSchema = z.object({
  displayName: z.string().trim().min(2).max(80),
  username: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[a-zA-Z0-9_]+$/, "Use only letters, numbers and underscores"),
  email: z.string().trim().email("Enter a valid email address").max(120),
  password: z.string().min(8).refine((value) => new TextEncoder().encode(value).length <= 72, "Password must be 72 bytes or fewer"),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export const createRoomSchema = z.object({
  roomName: z.string().trim().min(1).max(100),
  description: z.string().trim().max(255).optional().default(""),
  isPrivate: z.boolean().default(false),
});

export const roomIdSchema = z.coerce.number().int().positive();

export const friendRequestSchema = z.union([
  z.object({ receiverId: z.number().int().positive() }),
  z.object({ username: z.string().trim().min(3).max(40).regex(/^[a-zA-Z0-9_]+$/) }),
]);

export const messageSchema = z.object({
  messageText: z.string().trim().min(1).max(2000),
});

export const paginationSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  before: z.string()
    .regex(/^[1-9]\d{0,18}$/)
    .refine((value) => BigInt(value) <= BigInt("9223372036854775807"))
    .optional(),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegistrationInput = z.infer<typeof registrationSchema>;
