"use client";

import { use, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Check, Loader2, RotateCw, Save, Trash2, X } from "lucide-react";

type CatalogItem = { id: number; name: string; type: "furniture" | "decoration"; emoji: string };
type PlacedItem = { id: string; furnitureId: number; name: string; emoji: string; x: number; y: number; rotation: number; scale: number };
type RoomData = { id: number; name: string; wallpaper: string };

const WALLPAPERS = [
  { id: "lavender", name: "Lavender", className: "bg-gradient-to-br from-violet-200 via-purple-100 to-indigo-200" },
  { id: "blush", name: "Blush pink", className: "bg-gradient-to-br from-pink-200 via-rose-100 to-orange-100" },
  { id: "sky", name: "Sky blue", className: "bg-gradient-to-br from-sky-200 via-blue-100 to-cyan-100" },
  { id: "mint", name: "Mint", className: "bg-gradient-to-br from-emerald-200 via-green-100 to-teal-100" },
  { id: "sunset", name: "Sunset", className: "bg-gradient-to-br from-orange-200 via-rose-100 to-fuchsia-200" },
];

export default function CustomizeRoomPage({ params }: { params: Promise<{ roomId: string }> }) {
  const { roomId } = use(params);
  const stageRef = useRef<HTMLDivElement>(null);
  const [room, setRoom] = useState<RoomData | null>(null);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [items, setItems] = useState<PlacedItem[]>([]);
  const [wallpaper, setWallpaper] = useState("lavender");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [activeTab, setActiveTab] = useState<"furniture" | "decoration">("furniture");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const response = await fetch(`/api/rooms/${roomId}/customization`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.message || "Could not load this room.");
        if (cancelled) return;
        setRoom(data.room);
        setWallpaper(data.room.wallpaper || "lavender");
        setCatalog(data.catalog);
        setItems(data.items.map((item: Omit<PlacedItem, "id"> & { id: number }) => ({ ...item, id: String(item.id) })));
      } catch (error) {
        if (!cancelled) setNotice(error instanceof Error ? error.message : "Could not load room customization.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, [roomId]);

  const selectedItem = useMemo(() => items.find((item) => item.id === selectedId) ?? null, [items, selectedId]);
  const currentWallpaper = WALLPAPERS.find((item) => item.id === wallpaper) ?? WALLPAPERS[0];
  const visibleCatalog = catalog.filter((item) => item.type === activeTab);

  function addItem(item: CatalogItem) {
    if (items.length >= 40) {
      setNotice("You can place up to 40 items in one room.");
      return;
    }
    const id = `new-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const placed: PlacedItem = { id, furnitureId: item.id, name: item.name, emoji: item.emoji, x: 50, y: 48, rotation: 0, scale: 1 };
    setItems((current) => [...current, placed]);
    setSelectedId(id);
  }

  function moveItem(id: string, clientX: number, clientY: number) {
    const bounds = stageRef.current?.getBoundingClientRect();
    if (!bounds) return;
    const x = Math.max(5, Math.min(95, ((clientX - bounds.left) / bounds.width) * 100));
    const y = Math.max(8, Math.min(92, ((clientY - bounds.top) / bounds.height) * 100));
    setItems((current) => current.map((item) => item.id === id ? { ...item, x, y } : item));
  }

  function removeSelected() {
    if (!selectedId) return;
    setItems((current) => current.filter((item) => item.id !== selectedId));
    setSelectedId(null);
  }

  function rotateSelected() {
    if (!selectedId) return;
    setItems((current) => current.map((item) => item.id === selectedId ? { ...item, rotation: (item.rotation + 15) % 360 } : item));
  }

  async function saveDesign() {
    setSaving(true);
    setNotice("");
    try {
      const response = await fetch(`/api/rooms/${roomId}/customization`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallpaper,
          items: items.map((item) => ({ furnitureId: item.furnitureId, x: item.x, y: item.y, rotation: item.rotation, scale: item.scale })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Could not save your design.");
      setNotice("Your room design has been saved!");
      // Re-fetch so temporary item IDs are replaced with the database IDs.
      const refreshed = await fetch(`/api/rooms/${roomId}/customization`);
      if (refreshed.ok) {
        const result = await refreshed.json();
        setItems(result.items.map((item: Omit<PlacedItem, "id"> & { id: number }) => ({ ...item, id: String(item.id) })));
      }
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not save your design.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#faf8ff] text-[#29213c]">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-purple-100 bg-white/95 px-5 py-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="rounded-full p-2 text-[#7655c9] hover:bg-purple-50" aria-label="Back to dashboard"><ArrowLeft size={20} /></Link>
          <div><p className="text-xs text-[#968aa5]">MAKE YOURSELF AT HOME</p><h1 className="text-lg font-black">{room?.name ?? "Customize room"}</h1></div>
        </div>
        <button onClick={() => void saveDesign()} disabled={loading || saving || !room} className="flex items-center gap-2 rounded-xl bg-[#7655c9] px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-purple-200 disabled:opacity-50">
          {saving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}{saving ? "Saving..." : "Save room"}
        </button>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 p-4 sm:p-7 lg:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-xl font-black">Your little world ♡</h2><p className="text-sm text-[#968aa5]">Choose a wallpaper, add things and drag them around.</p></div><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[#968aa5] shadow-sm">{items.length}/40 items</span></div>
          <div ref={stageRef} onPointerMove={(event) => { if (draggingId) moveItem(draggingId, event.clientX, event.clientY); }} onPointerUp={() => setDraggingId(null)} onPointerCancel={() => setDraggingId(null)} onPointerDown={(event) => { if (event.target === event.currentTarget) setSelectedId(null); }} className={`relative aspect-[16/10] min-h-[360px] w-full touch-none overflow-hidden rounded-[2rem] border-8 border-white shadow-xl shadow-purple-100 ${currentWallpaper.className}`}>
            <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.35) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.35) 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
            <div className="pointer-events-none absolute left-5 top-5 rounded-full bg-white/65 px-3 py-1 text-xs font-bold text-[#59466f] backdrop-blur">{room?.name ?? "My room"}</div>
            <div className="pointer-events-none absolute bottom-4 right-5 text-xs font-semibold text-[#59466f]/60">Drag items to arrange your space</div>
            {loading && <div className="absolute inset-0 grid place-items-center bg-white/50"><Loader2 className="animate-spin text-[#7655c9]" /></div>}
            {items.map((item) => (
              <button key={item.id} type="button" onPointerDown={(event) => { event.stopPropagation(); event.currentTarget.setPointerCapture(event.pointerId); setSelectedId(item.id); setDraggingId(item.id); }} onPointerMove={(event) => { if (draggingId === item.id) moveItem(item.id, event.clientX, event.clientY); }} onPointerUp={() => setDraggingId(null)} onPointerCancel={() => setDraggingId(null)} onClick={() => setSelectedId(item.id)} aria-label={`${item.name}, drag to move`} className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl px-2 py-1 text-5xl transition-shadow ${selectedId === item.id ? "bg-white/65 ring-2 ring-[#7655c9] shadow-lg" : "hover:bg-white/40"}`} style={{ left: `${item.x}%`, top: `${item.y}%`, transform: `translate(-50%, -50%) rotate(${item.rotation}deg) scale(${item.scale})`, touchAction: "none" }}>
                <span>{item.emoji}</span><span className="mt-0.5 max-w-24 truncate text-[9px] font-bold text-[#59466f]">{item.name}</span>
              </button>
            ))}
            {!loading && items.length === 0 && <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center text-[#59466f]"><span className="text-6xl">🪴</span><p className="mt-3 font-black">A blank canvas!</p><p className="text-sm">Add furniture from the panel to make it yours.</p></div>}
          </div>
          {selectedItem && <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-purple-100 bg-white p-3 shadow-sm"><span className="mr-auto text-sm font-bold">Selected: {selectedItem.emoji} {selectedItem.name}</span><button onClick={rotateSelected} className="flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-2 text-xs font-bold text-[#7655c9]"><RotateCw size={14} /> Rotate</button><button onClick={removeSelected} className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600"><Trash2 size={14} /> Remove</button><button onClick={() => setSelectedId(null)} className="rounded-lg p-2 text-[#968aa5]" aria-label="Deselect"><X size={15} /></button></div>}
          {notice && <p role="status" className="mt-4 rounded-xl bg-white px-4 py-3 text-sm font-semibold text-[#7655c9] shadow-sm">{notice}</p>}
        </section>

        <aside className="space-y-5">
          <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <h2 className="font-black">Wallpapers</h2><p className="mt-1 text-xs text-[#968aa5]">Set the mood of your room.</p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {WALLPAPERS.map((option) => <button key={option.id} onClick={() => setWallpaper(option.id)} className={`overflow-hidden rounded-2xl border-2 text-left ${wallpaper === option.id ? "border-[#7655c9]" : "border-transparent"}`}><span className={`block h-16 ${option.className}`} /><span className="flex items-center justify-between px-2 py-2 text-xs font-bold">{option.name}{wallpaper === option.id && <Check size={14} className="text-[#7655c9]" />}</span></button>)}
            </div>
          </section>

          <section className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between"><h2 className="font-black">Furniture & decor</h2><span className="text-xs text-[#968aa5]">Tap to add</span></div>
            <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#faf8ff] p-1"><button onClick={() => setActiveTab("furniture")} className={`rounded-lg py-2 text-xs font-bold ${activeTab === "furniture" ? "bg-white text-[#7655c9] shadow-sm" : "text-[#968aa5]"}`}>Furniture</button><button onClick={() => setActiveTab("decoration")} className={`rounded-lg py-2 text-xs font-bold ${activeTab === "decoration" ? "bg-white text-[#7655c9] shadow-sm" : "text-[#968aa5]"}`}>Decorations</button></div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {visibleCatalog.map((item) => <button key={item.id} onClick={() => addItem(item)} className="flex min-h-20 flex-col items-center justify-center rounded-2xl border border-purple-50 bg-[#fdfcff] p-2 transition hover:border-purple-200 hover:bg-purple-50"><span className="text-3xl">{item.emoji}</span><span className="mt-1 text-center text-[11px] font-bold">{item.name}</span></button>)}
              {!loading && visibleCatalog.length === 0 && <p className="col-span-2 py-6 text-center text-xs text-[#968aa5]">No items in this category yet.</p>}
            </div>
          </section>
          <div className="rounded-2xl bg-[#eee7ff] p-4 text-xs leading-5 text-[#69548d]"><strong>Tip:</strong> Select an item in the room to rotate or remove it. Drag it to move it. Save your room when you're happy with the layout.</div>
        </aside>
      </div>
    </main>
  );
}
