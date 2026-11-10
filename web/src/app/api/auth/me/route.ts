import { getCurrentUser, safeUser } from "@/lib/auth";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return Response.json({ message: "Not authenticated." }, { status: 401 });
  return Response.json({ user: safeUser(user) });
}
