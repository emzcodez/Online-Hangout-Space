import { getCurrentUser, isSameOriginRequest } from "@/lib/auth";

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) {
    return {
      user: null,
      response: Response.json({ message: "Authentication required." }, { status: 401 }),
    };
  }
  return { user, response: null };
}

export function requireSameOrigin(request: Request) {
  if (isSameOriginRequest(request)) return null;
  return Response.json({ message: "Request origin is not allowed." }, { status: 403 });
}

export async function readJson(request: Request): Promise<unknown | Response> {
  try {
    return await request.json();
  } catch {
    return Response.json({ message: "Invalid request body." }, { status: 400 });
  }
}

export function isResponse(value: unknown): value is Response {
  return value instanceof Response;
}
