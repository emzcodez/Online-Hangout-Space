import { requireApiUser, requireSameOrigin, readJson, isResponse } from "@/lib/api";
import { prisma } from "@/lib/prisma";
import { roomAccess } from "@/lib/rooms";
import { roomIdSchema } from "@/lib/validation";

 type Context = { params: Promise<{ roomId: string }> };

const DEFAULT_CATALOG = [
  { item_name: "Comfy sofa", item_type: "furniture" as const, asset_url: "🛋️" },
  { item_name: "Armchair", item_type: "furniture" as const, asset_url: "🪑" },
  { item_name: "Coffee table", item_type: "furniture" as const, asset_url: "🪵" },
  { item_name: "Bed", item_type: "furniture" as const, asset_url: "🛏️" },
  { item_name: "Bookshelf", item_type: "furniture" as const, asset_url: "📚" },
  { item_name: "Desk", item_type: "furniture" as const, asset_url: "🖥️" },
  { item_name: "Floor lamp", item_type: "decoration" as const, asset_url: "💡" },
  { item_name: "Potted plant", item_type: "decoration" as const, asset_url: "🪴" },
  { item_name: "Flower vase", item_type: "decoration" as const, asset_url: "💐" },
  { item_name: "Teddy bear", item_type: "decoration" as const, asset_url: "🧸" },
  { item_name: "Rug", item_type: "decoration" as const, asset_url: "🟣" },
  { item_name: "Wall clock", item_type: "decoration" as const, asset_url: "🕰️" },
];

async function ensureCatalog() {
  const count = await prisma.furniture_catalog.count();
  if (count === 0) {
    await prisma.furniture_catalog.createMany({ data: DEFAULT_CATALOG });
  }
  return prisma.furniture_catalog.findMany({
    where: { item_type: { in: ["furniture", "decoration"] } },
    orderBy: [{ item_type: "asc" }, { furniture_id: "asc" }],
    select: { furniture_id: true, item_name: true, item_type: true, asset_url: true },
  });
}

export async function GET(_request: Request, { params }: Context) {
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { roomId: rawId } = await params;
  const parsedId = roomIdSchema.safeParse(rawId);
  if (!parsedId.success) return Response.json({ message: "Invalid room id." }, { status: 400 });

  const access = await roomAccess(parsedId.data, auth.user.user_id);
  if (!access.room || !access.isMember) {
    return Response.json({ message: "Join this room before customizing it." }, { status: 403 });
  }

  try {
    const [room, catalog, items] = await Promise.all([
      prisma.rooms.findUnique({
        where: { room_id: parsedId.data },
        select: { room_id: true, room_name: true, wallpaper: true },
      }),
      ensureCatalog(),
      prisma.room_items.findMany({
        where: { room_id: parsedId.data },
        orderBy: { room_item_id: "asc" },
        select: {
          room_item_id: true,
          furniture_id: true,
          position_x: true,
          position_y: true,
          rotation_deg: true,
          scale_factor: true,
          furniture_catalog: { select: { item_name: true, asset_url: true, item_type: true } },
        },
      }),
    ]);

    if (!room) return Response.json({ message: "Room not found." }, { status: 404 });

    return Response.json({
      room: { id: room.room_id, name: room.room_name, wallpaper: room.wallpaper },
      catalog: catalog.map((item) => ({
        id: item.furniture_id,
        name: item.item_name,
        type: item.item_type,
        emoji: item.asset_url || "✨",
      })),
      items: items.map((item) => ({
        id: item.room_item_id,
        furnitureId: item.furniture_id,
        name: item.furniture_catalog.item_name,
        emoji: item.furniture_catalog.asset_url || "✨",
        x: Number(item.position_x),
        y: Number(item.position_y),
        rotation: item.rotation_deg,
        scale: Number(item.scale_factor),
      })),
    });
  } catch (error) {
    console.error("Could not load room customization:", error);
    return Response.json({ message: "Could not load the furniture catalog." }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: Context) {
  const originError = requireSameOrigin(request);
  if (originError) return originError;
  const auth = await requireApiUser();
  if (!auth.user) return auth.response;

  const { roomId: rawId } = await params;
  const parsedId = roomIdSchema.safeParse(rawId);
  if (!parsedId.success) return Response.json({ message: "Invalid room id." }, { status: 400 });

  const access = await roomAccess(parsedId.data, auth.user.user_id);
  if (!access.room || !access.isMember) {
    return Response.json({ message: "Only room members can customize this room." }, { status: 403 });
  }

  const body = await readJson(request);
  if (isResponse(body) || !body || typeof body !== "object") {
    return Response.json({ message: "Invalid customization data." }, { status: 400 });
  }

  const payload = body as { wallpaper?: unknown; items?: unknown };
  const wallpapers = ["lavender", "blush", "sky", "mint", "sunset"];
  if (typeof payload.wallpaper !== "string" || !wallpapers.includes(payload.wallpaper)) {
    return Response.json({ message: "Choose a valid wallpaper." }, { status: 400 });
  }
  if (!Array.isArray(payload.items) || payload.items.length > 40) {
    return Response.json({ message: "A room can contain up to 40 furniture items." }, { status: 400 });
  }

  const items = payload.items as Array<Record<string, unknown>>;
  const valid = items.every((item) =>
    Number.isInteger(item.furnitureId) && Number(item.furnitureId) > 0 &&
    typeof item.x === "number" && Number.isFinite(item.x) && item.x >= 0 && item.x <= 100 &&
    typeof item.y === "number" && Number.isFinite(item.y) && item.y >= 0 && item.y <= 100 &&
    Number.isInteger(item.rotation) && Number(item.rotation) >= -360 && Number(item.rotation) <= 360 &&
    typeof item.scale === "number" && Number.isFinite(item.scale) && item.scale >= 0.5 && item.scale <= 2
  );
  if (!valid) return Response.json({ message: "One or more furniture positions are invalid." }, { status: 400 });

  const ids = [...new Set(items.map((item) => Number(item.furnitureId)))];
  const catalogCount = ids.length ? await prisma.furniture_catalog.count({ where: { furniture_id: { in: ids }, item_type: { in: ["furniture", "decoration"] } } }) : 0;
  if (catalogCount !== ids.length) {
    return Response.json({ message: "The furniture catalog selection is invalid." }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.rooms.update({ where: { room_id: parsedId.data }, data: { wallpaper: payload.wallpaper as string } });
      await tx.room_items.deleteMany({ where: { room_id: parsedId.data } });
      if (items.length) {
        await tx.room_items.createMany({
          data: items.map((item) => ({
            room_id: parsedId.data,
            furniture_id: Number(item.furnitureId),
            placed_by: auth.user.user_id,
            position_x: Number(item.x),
            position_y: Number(item.y),
            rotation_deg: Number(item.rotation),
            scale_factor: Number(item.scale),
          })),
        });
      }
    });
    return Response.json({ saved: true, itemCount: items.length });
  } catch (error) {
    console.error("Could not save room customization:", error);
    return Response.json({ message: "Could not save your room design." }, { status: 500 });
  }
}
