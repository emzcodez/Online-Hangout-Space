import { hash } from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { createSession, isSameOriginRequest, safeUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { registrationSchema } from "@/lib/validation";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = registrationSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({
      message: "Please correct the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    }, { status: 400 });
  }

  const { displayName, username, email, password } = parsed.data;
  const passwordHash = await hash(password, 12);

  try {
    const user = await prisma.users.create({
      data: {
        display_name: displayName,
        username,
        email: email.toLowerCase(),
        password_hash: passwordHash,
      },
      select: {
        user_id: true,
        username: true,
        email: true,
        display_name: true,
        avatar_url: true,
      },
    });

    await createSession(user.user_id);
    return Response.json({ user: safeUser(user) }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const target = error.meta?.target;
      const targetText = Array.isArray(target) ? target.join(" ") : String(target ?? "");
      const field = targetText.toLowerCase().includes("username") ? "username" : "email";
      return Response.json({
        message: "An account with those details already exists.",
        fieldErrors: { [field]: `This ${field} is already in use.` },
      }, { status: 409 });
    }
    console.error("Registration failed:", error);
    return Response.json({ message: "Could not create your account right now." }, { status: 500 });
  }
}
