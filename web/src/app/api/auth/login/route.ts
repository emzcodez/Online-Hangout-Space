import { compare } from "bcryptjs";
import { createSession, isSameOriginRequest, safeUser } from "@/lib/auth";
import { clearLoginFailures, loginRateLimit, recordLoginFailure } from "@/lib/login-rate-limit";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation";

// Used for unknown email addresses so those requests still incur a bcrypt comparison.
const DUMMY_PASSWORD_HASH = "$2b$12$XqXXEnQczOIg/51BZgLyxeO7IZq1B2DJ/RUIjiNjHOFz7CaDpDV1a";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Request origin is not allowed." }, { status: 403 });
  }

  const rate = loginRateLimit(request);
  if (rate.limited) {
    return Response.json({ message: "Too many login attempts. Please try again later." }, {
      status: 429,
      headers: { "Retry-After": String(rate.retryAfter) },
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ message: "Please enter a valid email and password." }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.users.findUnique({
    where: { email },
    select: {
      user_id: true,
      username: true,
      email: true,
      display_name: true,
      avatar_url: true,
      password_hash: true,
      account_status: true,
    },
  });
  const passwordMatches = await compare(parsed.data.password, user?.password_hash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches || user.account_status !== "active") {
    recordLoginFailure(request);
    return Response.json({ message: "Email or password is incorrect." }, { status: 401 });
  }

  clearLoginFailures(request);
  await createSession(user.user_id);
  return Response.json({ user: safeUser(user) });
}
