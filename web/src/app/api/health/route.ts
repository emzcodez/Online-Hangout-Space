import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
      message: "Online Hangout Space API is connected to MySQL!",
    });
  } catch (error) {
    console.error("Database health check failed:", error);

    return Response.json(
      {
        status: "error",
        database: "disconnected",
        message: "Could not connect to MySQL.",
      },
      { status: 500 }
    );
  }
}
