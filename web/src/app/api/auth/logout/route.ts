import { clearSession, isSameOriginRequest } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) {
    return Response.json({ message: "Request origin is not allowed." }, { status: 403 });
  }
  await clearSession();
  return Response.json({ ok: true });
}
