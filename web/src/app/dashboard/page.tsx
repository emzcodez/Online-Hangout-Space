
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Home,
  Compass,
  Users,
  Bookmark,
  Plus,
  Search,
  Bell,
  ChevronDown,
  ArrowUpRight,
  X,
  Lock,
  Globe,
  Sparkles,
  Heart,
  Coffee,
  LogOut,
} from "lucide-react";
import { useRouter } from "next/navigation";

type Room = {
  id: number;
  name: string;
  description: string;
  emoji: string;
  color: string;
  members: number;
  favoriteCount: number;
  isPrivate: boolean;
  isMember: boolean;
  isOwner: boolean;
};

type Friend = { id: number; username: string; displayName: string; avatarUrl: string | null };
type FriendRequest = { id: number; sender: Friend; receiver: Friend };
type ChatMessage = { id: string; senderId: number; text: string; sentAt: string; sender: { displayName: string; username: string } };
type ApiRoom = { id: number; name: string; description: string; isPrivate: boolean; memberCount: number; favoriteCount: number; isMember?: boolean; isOwner?: boolean };

const activities = [
  { emoji: "💌", title: "Maya sent you a friend request", time: "10 minutes ago" },
  { emoji: "🎬", title: "Movie Night is now active", time: "30 minutes ago" },
  { emoji: "🌷", title: "Priya customized The Garden", time: "1 hour ago" },
];

function mapRoom(room: ApiRoom): Room {
  return {
    id: room.id,
    name: room.name,
    description: room.description,
    emoji: room.isPrivate ? "ðŸŒ™" : "â˜•",
    color: room.isPrivate ? "from-violet-200 to-indigo-200" : "from-orange-200 to-rose-200",
    members: room.memberCount,
    favoriteCount: room.favoriteCount,
    isPrivate: room.isPrivate,
    isMember: room.isMember ?? false,
    isOwner: room.isOwner ?? false,
  };
}

export default function DashboardPage() {
  const router = useRouter();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [discoverRooms, setDiscoverRooms] = useState<Room[]>([]);
  const [favorites, setFavorites] = useState<Room[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([]);
  const [friendUsername, setFriendUsername] = useState("");
  const [profile, setProfile] = useState<{ displayName: string; username: string } | null>(null);
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [roomName, setRoomName] = useState("");
  const [description, setDescription] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");
  const [notice, setNotice] = useState("");
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageText, setMessageText] = useState("");
  const [messageCursor, setMessageCursor] = useState<string | null>(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);

  const refreshDashboard = useCallback(async () => {
    try {
      const [mineResponse, discoverResponse, favoritesResponse, friendsResponse, requestsResponse, profileResponse] = await Promise.all([
        fetch("/api/rooms?scope=mine"),
        fetch("/api/rooms?scope=discover"),
        fetch("/api/favorites"),
        fetch("/api/friends"),
        fetch("/api/friends/requests?box=incoming"),
        fetch("/api/auth/me"),
      ]);
      if (mineResponse.ok) setRooms(((await mineResponse.json()).rooms as ApiRoom[]).map(mapRoom));
      if (discoverResponse.ok) setDiscoverRooms(((await discoverResponse.json()).rooms as ApiRoom[]).map(mapRoom));
      if (favoritesResponse.ok) setFavorites(((await favoritesResponse.json()).favorites as ApiRoom[]).map(mapRoom));
      if (friendsResponse.ok) setFriends((await friendsResponse.json()).friends as Friend[]);
      if (requestsResponse.ok) setFriendRequests((await requestsResponse.json()).requests as FriendRequest[]);
      if (profileResponse.ok) setProfile((await profileResponse.json()).user);
    } catch {
      setNotice("Could not load hangout data. Please try again.");
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => { void refreshDashboard(); }, 0);
    return () => clearTimeout(timer);
  }, [refreshDashboard]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/rooms?scope=discover&search=" + encodeURIComponent(search));
        if (response.ok) setDiscoverRooms(((await response.json()).rooms as ApiRoom[]).map(mapRoom));
      } catch {
        setNotice("Room search is temporarily unavailable.");
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  const filteredRooms = useMemo(() => {
    const myIds = new Set(rooms.map((room) => room.id));
    const available = [...rooms, ...discoverRooms.filter((room) => !myIds.has(room.id))];
    return available.filter((room) => {
      const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = selectedFilter === "All" || (selectedFilter === "Private" ? room.isPrivate : !room.isPrivate);
      return matchesSearch && matchesFilter;
    });
  }, [rooms, discoverRooms, search, selectedFilter]);

  async function createRoom(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const response = await fetch("/api/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ roomName, description, isPrivate }),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not create this room.");
    setRoomName("");
    setDescription("");
    setIsPrivate(false);
    setModalOpen(false);
    setSelectedFilter("All");
    setSearch("");
    setNotice("Your new room has been created!");
    await refreshDashboard();
  }

  async function openRoom(room: Room) {
    const joinResponse = await fetch("/api/rooms/" + room.id + "/join", { method: "POST" });
    const joinResult = await joinResponse.json();
    if (!joinResponse.ok) return setNotice(joinResult.message ?? "Could not enter this room.");
    const detailResponse = await fetch("/api/rooms/" + room.id);
    if (!detailResponse.ok) return setNotice("Could not load this room.");
    const detail = (await detailResponse.json()).room as ApiRoom;
    const currentRoom = mapRoom({ ...detail, isMember: true, isOwner: room.isOwner });
    setSelectedRoom(currentRoom);
    setMessageText("");
    const messagesResponse = await fetch("/api/rooms/" + room.id + "/messages?limit=50");
    if (!messagesResponse.ok) return setNotice("Could not load room chat.");
    const result = await messagesResponse.json();
    setMessages(result.messages as ChatMessage[]);
    setMessageCursor(result.page.nextCursor as string | null);
    setHasOlderMessages(Boolean(result.page.hasMore));
    await refreshDashboard();
  }

  async function sendMessage(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedRoom || !messageText.trim()) return;
    const response = await fetch("/api/rooms/" + selectedRoom.id + "/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messageText }),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not send message.");
    setMessages((current) => [...current, result.message as ChatMessage]);
    setMessageText("");
  }

  async function loadOlderMessages() {
    if (!selectedRoom || !messageCursor) return;
    const response = await fetch("/api/rooms/" + selectedRoom.id + "/messages?limit=50&before=" + messageCursor);
    if (!response.ok) return;
    const result = await response.json();
    const olderMessages = result.messages as ChatMessage[];
    setMessages((current) => [...olderMessages, ...current]);
    setMessageCursor(result.page.nextCursor as string | null);
    setHasOlderMessages(Boolean(result.page.hasMore));
  }

  async function toggleFavorite(room: Room) {
    const isFavorite = favorites.some((favorite) => favorite.id === room.id);
    const response = await fetch(isFavorite ? "/api/favorites?roomId=" + room.id : "/api/favorites", {
      method: isFavorite ? "DELETE" : "POST",
      headers: isFavorite ? undefined : { "Content-Type": "application/json" },
      body: isFavorite ? undefined : JSON.stringify({ roomId: room.id }),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not update saved rooms.");
    await refreshDashboard();
  }

  async function sendFriendRequest(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const response = await fetch("/api/friends/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: friendUsername.replace(/^@/, "") }),
    });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not send friend request.");
    setFriendUsername("");
    setNotice("Friend request sent.");
    await refreshDashboard();
  }

  async function respondToRequest(requestId: number, action: "accept" | "reject") {
    const response = await fetch("/api/friends/requests/" + requestId + "/" + action, { method: "POST" });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not update friend request.");
    await refreshDashboard();
  }

  async function removeFriend(friendId: number) {
    const response = await fetch("/api/friends?userId=" + friendId, { method: "DELETE" });
    const result = await response.json();
    if (!response.ok) return setNotice(result.message ?? "Could not remove friend.");
    await refreshDashboard();
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

          <button
            onClick={async () => {
              await fetch("/api/auth/logout", { method: "POST" });
              router.replace("/");
              router.refresh();
            }}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-[#81788f] hover:bg-purple-50"
          >
            <LogOut size={19} /> Log out
          </button>

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
                <p className="text-sm font-bold">{profile?.displayName ?? "Your Profile"}</p>
                <p className="text-xs text-[#968aa5]">@{profile?.username ?? "user"}</p>
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
              { label: "Friends", value: friends.length, icon: Users, color: "bg-pink-100 text-pink-600" },
              { label: "Saved Rooms", value: favorites.length, icon: Bookmark, color: "bg-orange-100 text-orange-600" },
              { label: "Public Rooms", value: discoverRooms.length, icon: Globe, color: "bg-blue-100 text-blue-600" },
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
                      {room.isPrivate ? "PRIVATE ROOM" : "PUBLIC ROOM"}
                    </span>
                    <span className="absolute right-4 top-4 rounded-full bg-white/80 p-2 text-[#7655c9]">
                      {room.isPrivate ? <Lock size={14} /> : <Globe size={14} />}
                    </span>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-black">{room.name}</h3>
                    <p className="mt-1 truncate text-xs text-[#968aa5]">{room.description}</p>
                    <div className="mt-5 flex items-center justify-between">
                      <span className="text-xs text-[#81788f]"><Users className="mr-1 inline" size={14} />{room.members} members</span>
                      <div className="flex items-center gap-2">
                        <button aria-label={favorites.some((favorite) => favorite.id === room.id) ? "Remove saved room" : "Save room"} onClick={() => void toggleFavorite(room)} className="rounded-full bg-[#f5f0ff] p-2 text-[#7655c9]"><Bookmark size={15} fill={favorites.some((favorite) => favorite.id === room.id) ? "currentColor" : "none"} /></button>
                        {!room.isOwner && <button onClick={async () => { const response = await fetch("/api/rooms/" + room.id + "/leave", { method: "POST" }); const result = await response.json(); setNotice(response.ok ? "You left the room." : result.message); await refreshDashboard(); }} className="rounded-full border border-purple-100 px-3 py-2 text-xs font-bold text-[#81788f]">Leave</button>}
                        <button onClick={() => void openRoom(room)} className="rounded-full bg-[#eee7ff] px-4 py-2 text-xs font-bold text-[#7655c9] transition hover:bg-[#7655c9] hover:text-white">Enter room</button>
                      </div>

                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="saved">
            <div className="mb-5">
              <p className="text-xs font-black tracking-[0.2em] text-[#9271d4]">BOOKMARKED</p>
              <h2 className="mt-2 text-2xl font-black">Saved rooms</h2>
            </div>
            {favorites.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {favorites.map((room) => <div key={room.id} className="flex items-center gap-3 rounded-2xl border border-purple-100 bg-white p-4">
                <Bookmark size={18} className="text-[#7655c9]" />
                <button onClick={() => void openRoom(room)} className="min-w-0 flex-1 truncate text-left text-sm font-bold">{room.name}</button>
                <button aria-label="Remove saved room" onClick={() => void toggleFavorite(room)} className="rounded-full p-2 text-[#968aa5] hover:bg-purple-50"><X size={15} /></button>
              </div>)}
            </div> : <p className="rounded-2xl border border-dashed border-purple-200 bg-white p-6 text-sm text-[#968aa5]">Rooms you save will appear here.</p>}
          </section>

          {/* Friends and Activity */}
          <section id="friends" className="grid gap-7 xl:grid-cols-2">

            <div className="rounded-3xl border border-purple-100 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black">Your people</h2>
                  <p className="mt-1 text-xs text-[#968aa5]">Friends and incoming requests.</p>
                </div>
                <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">{friends.length} friends</span>
              </div>

              <form onSubmit={sendFriendRequest} className="mb-6 flex gap-2">
                <input value={friendUsername} onChange={(event) => setFriendUsername(event.target.value)} placeholder="@username" maxLength={40} className="min-w-0 flex-1 rounded-xl border border-purple-100 px-3 py-2 text-sm outline-none focus:border-[#9271d4]" />
                <button type="submit" disabled={!friendUsername.trim()} className="rounded-xl bg-[#7655c9] px-4 py-2 text-xs font-bold text-white disabled:opacity-50">Add friend</button>
              </form>

              {friendRequests.length > 0 && (
                <div className="mb-6 space-y-3">
                  <p className="text-xs font-bold text-[#81788f]">Incoming requests ({friendRequests.length})</p>
                  {friendRequests.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-2xl bg-[#faf8ff] p-3">
                      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{item.sender.displayName} <span className="text-xs font-normal text-[#968aa5]">@{item.sender.username}</span></span>
                      <button onClick={() => void respondToRequest(item.id, "accept")} className="rounded-lg bg-[#7655c9] px-3 py-2 text-xs font-bold text-white">Accept</button>
                      <button onClick={() => void respondToRequest(item.id, "reject")} className="rounded-lg border border-purple-100 px-3 py-2 text-xs font-bold text-[#81788f]">Reject</button>
                    </div>
                  ))}
                </div>
              )}

              <div className="space-y-4">
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-lg font-bold text-[#7655c9]">{friend.displayName.slice(0, 1).toUpperCase()}</div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{friend.displayName}</p>
                      <p className="truncate text-xs text-[#968aa5]">@{friend.username}</p>
                    </div>
                    <button aria-label={"Remove " + friend.displayName} onClick={() => void removeFriend(friend.id)} className="rounded-full p-2 text-[#968aa5] hover:bg-red-50 hover:text-red-500"><X size={16} /></button>
                  </div>
                ))}
                {friends.length === 0 && friendRequests.length === 0 && <p className="py-4 text-center text-sm text-[#968aa5]">No friends or pending requests yet.</p>}
              </div>
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
              {["All", "Public", "Private"].map((filter) => (
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
                      <p className="mt-1 text-[10px] font-bold text-[#9271d4]">{room.isPrivate ? "Private" : "Public"}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button aria-label={favorites.some((favorite) => favorite.id === room.id) ? "Remove saved room" : "Save room"} onClick={() => void toggleFavorite(room)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f5f0ff] text-[#7655c9]"><Bookmark size={16} fill={favorites.some((favorite) => favorite.id === room.id) ? "currentColor" : "none"} /></button>
                      <button onClick={() => void openRoom(room)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#eee7ff] text-[#7655c9] hover:bg-[#7655c9] hover:text-white"><ArrowUpRight size={18} /></button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-purple-200 bg-white p-10 text-center">
                <div className="text-4xl">🔎</div>
                <p className="mt-3 font-bold">No rooms found</p>
                <p className="mt-1 text-sm text-[#968aa5]">Try a different search or room privacy filter.</p>
              </div>
            )}
          </section>

          <footer className="border-t border-purple-100 py-7 text-center text-xs text-[#a49aaf]">
            Made with ♡ at hangout.space · Your little corner of the internet.
          </footer>
        </div>
      </section>

      {selectedRoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#211832]/50 p-4 backdrop-blur-sm" onClick={() => setSelectedRoom(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="room-chat-title" className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-[2rem] bg-white p-6 shadow-2xl" onClick={(event) => event.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <div><h2 id="room-chat-title" className="text-xl font-black">{selectedRoom.name}</h2><p className="text-xs text-[#968aa5]">{selectedRoom.members} members</p></div>
              <button onClick={() => setSelectedRoom(null)} aria-label="Close room chat" className="rounded-full p-2 text-[#968aa5] hover:bg-purple-50"><X size={20} /></button>
            </div>
            {hasOlderMessages && <button onClick={() => void loadOlderMessages()} className="mb-3 self-center text-xs font-bold text-[#7655c9]">Load older messages</button>}
            <div className="min-h-48 flex-1 space-y-3 overflow-y-auto rounded-2xl bg-[#faf8ff] p-4">
              {messages.map((message) => <div key={message.id} className="rounded-xl bg-white p-3 shadow-sm">
                <div className="flex items-baseline justify-between gap-3"><span className="text-xs font-bold">{message.sender.displayName}</span><time className="text-[10px] text-[#a49aaf]">{new Date(message.sentAt).toLocaleString()}</time></div>
                <p className="mt-1 whitespace-pre-wrap break-words text-sm">{message.text}</p>
              </div>)}
              {!messages.length && <p className="py-12 text-center text-sm text-[#968aa5]">No messages yet. Start the conversation.</p>}
            </div>
            <form onSubmit={sendMessage} className="mt-4 flex gap-2">
              <input value={messageText} onChange={(event) => setMessageText(event.target.value)} maxLength={2000} placeholder="Write a message..." className="min-w-0 flex-1 rounded-xl border border-purple-100 px-4 py-3 text-sm outline-none focus:border-[#9271d4]" />
              <button type="submit" disabled={!messageText.trim()} className="rounded-xl bg-[#7655c9] px-5 py-3 text-sm font-bold text-white disabled:opacity-50">Send</button>
            </form>
          </div>
        </div>
      )}

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
                  maxLength={100}
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
                  maxLength={255}
                  placeholder="What is this room all about?"
                  rows={3}
                  className="w-full resize-none rounded-2xl border border-purple-100 bg-[#fcfaff] px-4 py-3.5 text-sm outline-none focus:border-[#9271d4] focus:ring-4 focus:ring-purple-100"
                />
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
                  <p className="mt-1 text-xs text-[#968aa5]">Only room members can access it.</p>
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
