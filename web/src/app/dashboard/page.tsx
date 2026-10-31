
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  Compass,
  Users,
  Bookmark,
  Settings,
  Plus,
  Search,
  Bell,
  ChevronDown,
  MessageCircle,
  Video,
  ArrowUpRight,
  X,
  Lock,
  Globe,
  Sparkles,
  Heart,
  Coffee,
} from "lucide-react";

type Room = {
  id: number;
  name: string;
  description: string;
  emoji: string;
  color: string;
  members: number;
  category: string;
  isPrivate: boolean;
};

const initialRooms: Room[] = [
  {
    id: 1,
    name: "The Cozy Corner",
    description: "A little place to relax and chat.",
    emoji: "☕",
    color: "from-orange-200 to-rose-200",
    members: 4,
    category: "Chill",
    isPrivate: false,
  },
  {
    id: 2,
    name: "Movie Night",
    description: "Popcorn, movies and good company.",
    emoji: "🍿",
    color: "from-violet-300 to-indigo-300",
    members: 6,
    category: "Watch Party",
    isPrivate: false,
  },
  {
    id: 3,
    name: "The Garden",
    description: "Flowers, sunshine and peaceful vibes.",
    emoji: "🌷",
    color: "from-emerald-200 to-teal-200",
    members: 3,
    category: "Chill",
    isPrivate: true,
  },
];

const friends = [
  { name: "Maya", emoji: "👩🏻", status: "Watching videos", color: "bg-pink-100" },
  { name: "Arjun", emoji: "🧑🏽", status: "In The Cozy Corner", color: "bg-orange-100" },
  { name: "Priya", emoji: "👩🏾", status: "Listening to music", color: "bg-purple-100" },
  { name: "Rohan", emoji: "🧑🏻", status: "Available to chat", color: "bg-blue-100" },
];

const activities = [
  { emoji: "💌", title: "Maya sent you a friend request", time: "10 minutes ago" },
  { emoji: "🎬", title: "Movie Night is now active", time: "30 minutes ago" },
  { emoji: "🌷", title: "Priya customized The Garden", time: "1 hour ago" },
];

export default function DashboardPage() {
  const [rooms, setRooms] = useState(initialRooms);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Chill");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [notice, setNotice] = useState("");

  const filteredRooms = useMemo(() => {
    return rooms.filter((room) => {
      const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter =
        selectedFilter === "All" || room.category === selectedFilter;
      return matchesSearch && matchesFilter;
    });
  }, [rooms, search, selectedFilter]);

  function createRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const newRoom: Room = {
      id: Date.now(),
      name: roomName.trim(),
      description: description.trim() || "A new space for friends.",
      emoji: category === "Watch Party" ? "🍿" : category === "Gaming" ? "🎮" : "☕",
      color: "from-purple-200 to-pink-200",
      members: 1,
      category,
      isPrivate,
    };

    setRooms((previous) => [newRoom, ...previous]);
    setRoomName("");
    setDescription("");
    setCategory("Chill");
    setIsPrivate(false);
    setModalOpen(false);
    setSelectedFilter("All");
    setSearch("");
    setNotice("Your new room has been created!");
  }

  return (
    <main className="min-h-screen bg-[#faf8ff] text-[#29213c]">

      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-purple-100 bg-white px-6 py-7 lg:flex">
        <Link href="/" className="mb-12 flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#7655c9] text-xl text-white">
            ✿
          </span>
          <span className="text-xl font-black">
            hangout<span className="text-[#9271d4]">.space</span>
          </span>
        </Link>

        <p className="mb-4 text-[10px] font-black tracking-[0.2em] text-[#a49aaf]">
          MENU
        </p>

        <nav className="space-y-2">
          <a href="#home" className="flex items-center gap-3 rounded-2xl bg-[#eee7ff] px-4 py-3.5 text-sm font-bold text-[#7655c9]">
            <Home size={19} /> Home
          </a>
          <a href="#rooms" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#81788f] transition hover:bg-purple-50 hover:text-[#7655c9]">
            <Coffee size={19} /> My Rooms
          </a>
          <a href="#discover" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#81788f] transition hover:bg-purple-50 hover:text-[#7655c9]">
            <Compass size={19} /> Discover
          </a>
          <a href="#friends" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#81788f] transition hover:bg-purple-50 hover:text-[#7655c9]">
            <Users size={19} /> Friends
            <span className="ml-auto rounded-full bg-[#eee7ff] px-2 py-0.5 text-xs text-[#7655c9]">
              4
            </span>
          </a>
          <a href="#saved" className="flex items-center gap-3 rounded-2xl px-4 py-3.5 text-sm font-semibold text-[#81788f] transition hover:bg-purple-50 hover:text-[#7655c9]">
            <Bookmark size={19} /> Saved Rooms
          </a>
        </nav>

        <div className="mt-auto">
          <div className="mb-6 rounded-3xl bg-gradient-to-br from-[#7655c9] to-[#bd8bd0] p-5 text-white">
            <Sparkles size={22} />
            <h3 className="mt-4 font-black">Make it yours!</h3>
            <p className="mt-2 text-xs leading-5 text-white/80">
              Create a room that feels like home.
            </p>
            <button
              onClick={() => setModalOpen(true)}
              className="mt-4 w-full rounded-xl bg-white py-2.5 text-xs font-bold text-[#7655c9] hover:bg-purple-50"
            >
              Create a room +
            </button>
          </div>

          <a href="#settings" className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#81788f] hover:bg-purple-50">
            <Settings size={19} /> Settings
          </a>

          <Link href="/" className="mt-2 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#81788f] hover:bg-purple-50">
            <ArrowUpRight size={19} /> Back to website
          </Link>
        </div>
      </aside>

      {/* Main area */}
      <section id="home" className="min-h-screen lg:ml-64">

        {/* Top navigation */}
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-purple-100 bg-white/90 px-5 py-4 backdrop-blur-md sm:px-8 lg:px-10">
          <div>
            <p className="text-xs text-[#968aa5]">Friday, your happy day ♡</p>
            <p className="font-bold">Your little corner</p>
          </div>

          <div className="flex items-center gap-3 sm:gap-5">
            <button aria-label="Notifications" className="relative flex h-10 w-10 items-center justify-center rounded-full bg-[#f5f0ff] text-[#7655c9]">
              <Bell size={19} />
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-pink-400" />
            </button>

            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#f0e5ff] text-xl">
                🧑🏻
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold">Your Profile</p>
                <p className="text-xs text-[#968aa5]">@yourusername</p>
              </div>
              <ChevronDown size={16} className="text-[#968aa5]" />
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-7xl space-y-10 px-5 py-9 sm:px-8 lg:px-10">

          {/* Welcome */}
          <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-r from-[#7655c9] via-[#9571d3] to-[#c18bc8] p-7 text-white shadow-xl shadow-purple-100 sm:p-10">
            <div className="relative z-10 max-w-xl">
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/20 px-3 py-1.5 text-xs font-semibold">
                <Sparkles size={14} /> YOUR HAPPY PLACE
              </div>
              <h1 className="text-3xl font-black leading-tight sm:text-4xl">
                Hey there, friend! ♡
                <br />
                Ready to hang out?
              </h1>
              <p className="mt-4 max-w-md text-sm leading-6 text-white/80">
                Your people are here, your rooms are waiting.
                Let us make today a little more special.
              </p>
              <button
                onClick={() => setModalOpen(true)}
                className="mt-7 rounded-full bg-white px-6 py-3.5 text-sm font-bold text-[#7655c9] shadow-lg transition hover:-translate-y-1 hover:bg-purple-50"
              >
                <Plus className="mr-1 inline" size={17} /> Create a room
              </button>
            </div>
            <div className="pointer-events-none absolute -right-4 -top-10 hidden text-[220px] opacity-20 sm:block">
              ☁️
            </div>
            <div className="pointer-events-none absolute bottom-2 right-16 hidden text-7xl sm:block">
              🧸
            </div>
          </section>

          {/* Stats */}
          <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {[
              { label: "My Rooms", value: rooms.length, icon: Coffee, color: "bg-purple-100 text-purple-600" },
              { label: "Friends Online", value: "4", icon: Users, color: "bg-pink-100 text-pink-600" },
              { label: "Saved Rooms", value: "3", icon: Bookmark, color: "bg-orange-100 text-orange-600" },
              { label: "Watch Parties", value: "2", icon: Video, color: "bg-blue-100 text-blue-600" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
                <div className={`mb-4 flex h-10 w-10 items-center justify-center rounded-xl ${stat.color}`}>
                  <stat.icon size={20} />
                </div>
                <p className="text-2xl font-black">{stat.value}</p>
                <p className="mt-1 text-xs font-medium text-[#968aa5]">{stat.label}</p>
              </div>
            ))}
          </section>

          {/* My Rooms */}
          <section id="rooms">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-[#9271d4]">YOUR LITTLE WORLDS</p>
                <h2 className="mt-2 text-2xl font-black">My Rooms ♡</h2>
                <p className="mt-1 text-sm text-[#968aa5]">Your favourite places to be.</p>
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="rounded-full border border-purple-200 bg-white px-5 py-2.5 text-sm font-bold text-[#7655c9] hover:bg-purple-50"
              >
                <Plus className="mr-1 inline" size={16} /> New Room
              </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {rooms.map((room) => (
                <div key={room.id} className="group overflow-hidden rounded-3xl border border-purple-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-purple-100">
                  <div className={`relative flex h-40 items-center justify-center bg-gradient-to-br ${room.color}`}>
                    <div className="absolute inset-4 rounded-2xl border border-white/50" />
                    <span className="text-7xl transition duration-300 group-hover:scale-110">
                      {room.emoji}
                    </span>
                    <span className="absolute left-4 top-4 rounded-full bg-white/80 px-3 py-1 text-[10px] font-black tracking-wider text-[#7655c9]">
                      {room.category.toUpperCase()}
                    </span>
                    <span className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#7655c9]">
                      {room.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-black">{room.name}</h3>
                    <p className="mt-1 truncate text-xs text-[#968aa5]">{room.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-[#81788f]">
                        <Users className="mr-1 inline" size={14} />
                        {room.members} members
                      </span>
                      <button
                        onClick={() => setNotice(`${room.name} is a preview. Room joining will be connected next.`)}
                        className="rounded-full bg-[#eee7ff] px-4 py-2 text-xs font-bold text-[#7655c9] transition hover:bg-[#7655c9] hover:text-white"
                      >
                        Enter room →
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Friends and Activity */}
          <section id="friends" className="grid gap-7 xl:grid-cols-2">

            <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Your people 💗</h2>
                  <p className="mt-1 text-xs text-[#968aa5]">Friends who are around.</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                  4 online
                </span>
              </div>

              <div className="space-y-5">
                {friends.map((friend) => (
                  <div key={friend.name} className="flex items-center gap-4">
                    <div className={`relative flex h-12 w-12 items-center justify-center rounded-2xl text-2xl ${friend.color}`}>
                      {friend.emoji}
                      <span className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-green-400" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold">{friend.name}</p>
                      <p className="truncate text-xs text-[#968aa5]">{friend.status}</p>
                    </div>
                    <button
                      aria-label={`Message ${friend.name}`}
                      onClick={() => setNotice(`Chat with ${friend.name} will be available soon!`)}
                      className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f1ebff] text-[#7655c9] hover:bg-[#7655c9] hover:text-white"
                    >
                      <MessageCircle size={17} />
                    </button>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setNotice("Friends management will be connected soon!")}
                className="mt-7 w-full rounded-2xl border border-purple-100 py-3 text-sm font-bold text-[#7655c9] hover:bg-purple-50"
              >
                View all friends →
              </button>
            </div>

            <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-xl font-black">Recent activity ✨</h2>
                <p className="mt-1 text-xs text-[#968aa5]">Little things happening around you.</p>
              </div>

              <div className="space-y-6">
                {activities.map((activity) => (
                  <div key={activity.title} className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#f2ecff] text-xl">
                      {activity.emoji}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">{activity.title}</p>
                      <p className="mt-1 text-xs text-[#a49aaf]">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-7 rounded-2xl bg-gradient-to-r from-[#f2eaff] to-[#ffeaf3] p-4">
                <p className="text-sm font-bold">A little reminder ♡</p>
                <p className="mt-1 text-xs leading-5 text-[#81788f]">
                  The best memories are made together. Invite your friends for a hangout!
                </p>
              </div>
            </div>
          </section>

          {/* Discover */}
          <section id="discover">
            <div className="mb-6">
              <p className="text-xs font-black tracking-[0.2em] text-[#9271d4]">SOMETHING NEW</p>
              <h2 className="mt-2 text-2xl font-black">Explore the community 🌷</h2>
              <p className="mt-1 text-sm text-[#968aa5]">Find a new place to hang out.</p>
            </div>

            <div className="mb-5 flex flex-wrap items-center gap-3">
              <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-2xl border border-purple-100 bg-white px-4 py-3">
                <Search size={18} className="text-[#a49aaf]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search rooms..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-[#b2a8be]"
                />
              </div>
              {["All", "Chill", "Watch Party", "Gaming"].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setSelectedFilter(filter)}
                  className={`rounded-full px-4 py-2.5 text-xs font-bold transition ${
                    selectedFilter === filter
                      ? "bg-[#7655c9] text-white"
                      : "border border-purple-100 bg-white text-[#81788f] hover:bg-purple-50"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>

            {filteredRooms.length > 0 ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {filteredRooms.map((room) => (
                  <div key={room.id} className="flex items-center gap-4 rounded-3xl border border-purple-100 bg-white p-5 shadow-sm">
                    <div className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${room.color} text-3xl`}>
                      {room.emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate font-bold">{room.name}</h3>
                      <p className="mt-1 text-xs text-[#968aa5]">{room.members} members</p>
                      <p className="mt-1 text-[10px] font-bold text-[#9271d4]">{room.category}</p>
                    </div>
                    <button
                      onClick={() => setNotice(`Joining ${room.name} will be connected to the backend soon.`)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#eee7ff] text-[#7655c9] hover:bg-[#7655c9] hover:text-white"
                    >
                      <ArrowUpRight size={18} />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-10 text-center">
                <div className="text-4xl">🔎</div>
                <p className="mt-3 font-bold">No rooms found</p>
                <p className="mt-1 text-sm text-[#968aa5]">Try a different search or category.</p>
              </div>
            )}
          </section>

          <footer className="border-t border-purple-100 py-7 text-center text-xs text-[#a49aaf]">
            Made with ♡ at hangout.space · Your little corner of the internet.
          </footer>
        </div>
      </section>

      {/* Create Room Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[#211832]/50 p-4 backdrop-blur-sm"
          onClick={() => setModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="create-room-title"
            className="my-auto w-full max-w-lg rounded-[2rem] bg-white p-7 shadow-2xl sm:p-9"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-7 flex items-start justify-between">
              <div>
                <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#eee7ff] text-[#7655c9]">
                  <Sparkles size={24} />
                </div>
                <h2 id="create-room-title" className="text-2xl font-black">Create your room ♡</h2>
                <p className="mt-2 text-sm text-[#968aa5]">Give your new little world a name.</p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                aria-label="Close modal"
                className="rounded-full p-2 text-[#968aa5] hover:bg-purple-50"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={createRoom} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold">Room name</label>
                <input
                  required
                  maxLength={40}
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  placeholder="e.g. The Midnight Lounge"
                  className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-4 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={120}
                  placeholder="What is this room all about?"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-purple-100 bg-[#fcfaff] px-4 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold">Room category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-2xl border border-purple-100 bg-[#fcfaff] px-4 py-3.5 text-sm outline-none focus:border-[#9271d4]"
                >
                  <option value="Chill">☕ Chill & Chat</option>
                  <option value="Watch Party">🍿 Watch Party</option>
                  <option value="Gaming">🎮 Gaming</option>
                </select>
              </div>

              <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#faf8ff] p-4">
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                  className="h-4 w-4 accent-[#7655c9]"
                />
                <div className="flex-1">
                  <p className="text-sm font-bold">Private room</p>
                  <p className="mt-1 text-xs text-[#968aa5]">Only invited friends can access it.</p>
                </div>
                <Lock size={19} className="text-[#9271d4]" />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-[#7655c9] py-4 font-bold text-white shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 hover:bg-[#6342b4]"
              >
                Create my room ✨
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Notification */}
      {notice && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-[60] flex max-w-sm items-center gap-3 rounded-2xl bg-[#29213c] px-5 py-4 text-sm font-medium text-white shadow-2xl"
        >
          <Heart size={18} className="shrink-0 text-pink-300" />
          <span className="flex-1">{notice}</span>
          <button onClick={() => setNotice("")} aria-label="Dismiss notification">
            <X size={17} />
          </button>
        </div>
      )}
    </main>
  );
}
