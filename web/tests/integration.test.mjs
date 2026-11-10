import "dotenv/config";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { createServer } from "node:net";
import { after, before, describe, test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { createPool } from "mariadb";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectDir = resolve(fileURLToPath(new URL("..", import.meta.url)));
const nextBin = resolve(projectDir, "node_modules/next/dist/bin/next");
const nonce = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
const accounts = new Map();
const uniqueUsernames = [];
const created = { roomIds: new Set(), messageIds: new Set(), requestIds: new Set() };
let server;
let baseUrl;
let db;
let ready = false;
let advancedViewsAvailable = false;
let ownsServer = false;

function cookieFrom(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  return cookies.find((value) => value.startsWith("ohs_session="))?.split(";")[0] ?? "";
}

async function request(client, path, { method = "GET", body, origin = baseUrl } = {}) {
  const headers = new Headers();
  if (body !== undefined) headers.set("content-type", "application/json");
  if (origin) headers.set("origin", origin);
  if (client?.cookie) headers.set("cookie", client.cookie);
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  const responseCookie = cookieFrom(response);
  if (responseCookie && client) client.cookie = responseCookie;
  let data = {};
  try {
    data = await response.json();
  } catch {
    // Keep malformed/non-JSON responses visible through the status assertion.
  }
  return { status: response.status, data, headers: response.headers };
}

async function freePort() {
  const listener = createServer();
  listener.listen(0, "127.0.0.1");
  await once(listener, "listening");
  const { port } = listener.address();
  await new Promise((resolveClose, reject) => listener.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

async function waitForServer() {
  const deadline = Date.now() + 120_000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error("Next.js server exited before becoming ready.");
    try {
      const response = await fetch(`${baseUrl}/api/health`, { signal: AbortSignal.timeout(2_000) });
      if (response.ok) return;
      if (response.status >= 500) throw new Error("Next.js health check could not connect to the configured database.");
    } catch (error) {
      if (error instanceof Error && error.message.includes("configured database")) throw error;
    }
    await delay(700);
  }
  throw new Error("Next.js server did not become ready within 120 seconds.");
}

function okStatus(result, status, label) {
  assert.equal(result.status, status, `${label} returned HTTP ${result.status}; expected ${status}.`);
}

async function register(name) {
  const username = `it_${nonce}_${name}`;
  const email = `${username}@example.test`;
  uniqueUsernames.push(username);
  const client = { cookie: "" };
  const result = await request(client, "/api/auth/register", {
    method: "POST",
    body: {
      displayName: `Integration ${name}`,
      username,
      email,
      password: "SafeTestPassword_42",
      confirmPassword: "SafeTestPassword_42",
    },
  });
  okStatus(result, 201, "Registration");
  assert.ok(client.cookie.startsWith("ohs_session="), "Registration should set a session cookie.");
  assert.match(result.headers.get("set-cookie") ?? "", /httponly/i, "Session cookie should be HTTP-only.");
  assert.doesNotMatch(JSON.stringify(result.data), /password[_Hh]ash|passwordHash/i, "Response must not contain a password hash.");
  const account = { username, email, client, id: result.data.user?.id };
  assert.ok(Number.isInteger(account.id), "Registration should return the created user id.");
  accounts.set(name, account);
  return account;
}

async function cleanup() {
  if (!db) return;
  let cleanupError;
  try {
    // Recover an exact id if an API response was interrupted after inserting a
    // uniquely named test account. All DELETE statements below use only ids
    // created by this run.
    if (uniqueUsernames.length) {
      const placeholders = uniqueUsernames.map(() => "?").join(",");
      const rows = await db.query(`SELECT user_id FROM users WHERE username IN (${placeholders})`, uniqueUsernames);
      for (const row of rows) accounts.set(`cleanup_${row.user_id}`, { id: row.user_id });
    }
    const userIds = [...new Set([...accounts.values()].map((user) => user.id).filter(Number.isInteger))];
    const roomIds = [...created.roomIds];
    const messageIds = [...created.messageIds];
    const requestIds = [...created.requestIds];

    if (messageIds.length) await db.query(`DELETE FROM chat_messages WHERE message_id IN (${messageIds.map(() => "?").join(",")})`, messageIds);
    if (roomIds.length && userIds.length) {
      const pairs = roomIds.flatMap((roomId) => userIds.map((userId) => [roomId, userId]));
      for (const [roomId, userId] of pairs) {
        await db.query("DELETE FROM room_favorites WHERE room_id = ? AND user_id = ?", [roomId, userId]);
      }
      for (const [roomId, userId] of pairs) {
        await db.query("DELETE FROM room_members WHERE room_id = ? AND user_id = ?", [roomId, userId]);
      }
    }
    if (requestIds.length) await db.query(`DELETE FROM friend_requests WHERE request_id IN (${requestIds.map(() => "?").join(",")})`, requestIds);
    if (userIds.length > 1) {
      const pairs = [];
      for (let a = 0; a < userIds.length; a += 1) {
        for (let b = a + 1; b < userIds.length; b += 1) {
          pairs.push([Math.min(userIds[a], userIds[b]), Math.max(userIds[a], userIds[b])]);
        }
      }
      for (const [userId1, userId2] of pairs) {
        await db.query("DELETE FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?", [userId1, userId2]);
      }
    }
    if (roomIds.length) await db.query(`DELETE FROM rooms WHERE room_id IN (${roomIds.map(() => "?").join(",")})`, roomIds);
    if (userIds.length) await db.query(`DELETE FROM users WHERE user_id IN (${userIds.map(() => "?").join(",")})`, userIds);
  } catch {
    cleanupError = new Error("Test cleanup failed. No broad deletes were attempted; inspect this run's uniquely named records.");
  }
  if (cleanupError) throw cleanupError;
}

before(async () => {
  if (!process.env.DATABASE_HOST || !process.env.DATABASE_USER || !process.env.DATABASE_NAME) {
    throw new Error("DATABASE_HOST, DATABASE_USER, and DATABASE_NAME must be configured in web/.env.");
  }
  db = createPool({
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT ?? 3306),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
    connectionLimit: 2,
    connectTimeout: 5_000,
  });
  const connection = await db.getConnection();
  try {
    const objectRows = await connection.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.VIEWS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME IN ('vw_room_statistics', 'vw_user_activity_summary')",
    );
    advancedViewsAvailable = objectRows.length === 2;
  } finally {
    connection.release();
  }

  const configuredUrl = process.env.INTEGRATION_BASE_URL;
  const localUrl = configuredUrl || "http://127.0.0.1:3000";
  try {
    const existing = await fetch(`${localUrl}/api/health`, { signal: AbortSignal.timeout(2_000) });
    if (existing.status >= 500) throw new Error("A running Next.js server reports that its configured database is unavailable.");
    if (existing.ok) {
      baseUrl = localUrl;
      ready = true;
      return;
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("configured database")) throw error;
    if (configuredUrl) throw new Error("INTEGRATION_BASE_URL did not respond with a healthy API.");
  }

  const port = await freePort();
  baseUrl = `http://127.0.0.1:${port}`;
  server = spawn(process.execPath, [nextBin, "dev", "--hostname", "127.0.0.1", "--port", String(port)], {
    cwd: projectDir,
    env: { ...process.env, NODE_ENV: "development" },
    stdio: "ignore",
    windowsHide: true,
  });
  ownsServer = true;
  await waitForServer();
  ready = true;
});

after(async () => {
  try {
    await cleanup();
  } finally {
    if (ownsServer && server && server.exitCode === null) {
      server.kill("SIGTERM");
      await Promise.race([once(server, "exit"), delay(5_000)]);
      if (server.exitCode === null) server.kill("SIGKILL");
    }
    if (db) await db.end();
  }
});

describe("Online Hangout Space live API and MySQL integration", { concurrency: false }, () => {
  test("authentication lifecycle, validation, duplicates, and login failures", async (t) => {
    if (!ready) return t.skip("Next.js server or MySQL setup failed.");
    const anonymous = await request(null, "/api/auth/me");
    okStatus(anonymous, 401, "Anonymous session lookup");

    const badOrigin = await request(null, "/api/auth/register", {
      method: "POST",
      origin: "https://invalid.example",
      body: { username: "invalid" },
    });
    okStatus(badOrigin, 403, "Cross-origin registration");

    const invalid = await request(null, "/api/auth/register", {
      method: "POST",
      body: { displayName: "x", username: "x", email: "not-an-email", password: "short", confirmPassword: "different" },
    });
    okStatus(invalid, 400, "Invalid registration");

    const alice = await register("alice");
    const bob = await register("bob");
    const eve = await register("eve");
    const storedPassword = await db.query("SELECT password_hash FROM users WHERE user_id = ?", [alice.id]);
    assert.match(storedPassword[0]?.password_hash ?? "", /^\$2[aby]\$/, "Passwords should be stored as bcrypt hashes.");

    const session = await request(alice.client, "/api/auth/me");
    okStatus(session, 200, "Authenticated session lookup");
    assert.equal(session.data.user.id, alice.id);
    assert.doesNotMatch(JSON.stringify(session.data), /password[_Hh]ash|passwordHash/i);

    const duplicateEmail = await request(null, "/api/auth/register", {
      method: "POST",
      body: { displayName: "Duplicate Email", username: `it_${nonce}_other`, email: alice.email, password: "SafeTestPassword_42", confirmPassword: "SafeTestPassword_42" },
    });
    okStatus(duplicateEmail, 409, "Duplicate email registration");
    const duplicateUsername = await request(null, "/api/auth/register", {
      method: "POST",
      body: { displayName: "Duplicate Username", username: alice.username, email: `other_${nonce}@example.test`, password: "SafeTestPassword_42", confirmPassword: "SafeTestPassword_42" },
    });
    okStatus(duplicateUsername, 409, "Duplicate username registration");

    const badLoginClient = { cookie: "" };
    const badLogin = await request(badLoginClient, "/api/auth/login", {
      method: "POST",
      body: { email: alice.email, password: "IncorrectPassword_42" },
    });
    okStatus(badLogin, 401, "Incorrect login");
    assert.equal(badLogin.data.message, "Email or password is incorrect.");

    const loginAlice = { cookie: "" };
    okStatus(await request(loginAlice, "/api/auth/login", {
      method: "POST",
      body: { email: alice.email, password: "SafeTestPassword_42" },
    }), 200, "Valid login");
    assert.ok(loginAlice.cookie.startsWith("ohs_session="));
    alice.client = loginAlice;

    const logout = await request(alice.client, "/api/auth/logout", { method: "POST" });
    okStatus(logout, 200, "Logout");
    okStatus(await request(alice.client, "/api/auth/me"), 401, "Session after logout");
    alice.client = { cookie: "" };
    for (const account of [alice, bob, eve]) {
      const login = { cookie: "" };
      okStatus(await request(login, "/api/auth/login", {
        method: "POST",
        body: { email: account.email, password: "SafeTestPassword_42" },
      }), 200, `Login for ${account.username}`);
      account.client = login;
    }
  });

  test("room creation, listing, search, privacy, joining, and leaving", async (t) => {
    if (!ready || accounts.size < 3) return t.skip("Authentication setup did not create all test accounts.");
    const alice = accounts.get("alice");
    const bob = accounts.get("bob");
    const eve = accounts.get("eve");
    const publicName = `Public ${nonce}`;
    const privateName = `Private ${nonce}`;
    for (const [name, isPrivate] of [[publicName, false], [privateName, true]]) {
      const createdRoom = await request(alice.client, "/api/rooms", {
        method: "POST",
        body: { roomName: name, description: "Integration room", isPrivate },
      });
      okStatus(createdRoom, 201, "Room creation");
      const id = createdRoom.data.room.id;
      assert.ok(Number.isInteger(id));
      created.roomIds.add(id);
      if (isPrivate) created.privateRoomId = id;
      else created.publicRoomId = id;
    }

    const invalidRoom = await request(alice.client, "/api/rooms", { method: "POST", body: { roomName: "", isPrivate: false } });
    okStatus(invalidRoom, 400, "Invalid room creation");
    const mine = await request(alice.client, "/api/rooms?scope=mine");
    okStatus(mine, 200, "Room listing");
    assert.ok(mine.data.rooms.some((room) => room.id === created.publicRoomId));
    assert.ok(mine.data.rooms.some((room) => room.id === created.privateRoomId));

    const bobRooms = await request(bob.client, "/api/rooms");
    okStatus(bobRooms, 200, "Public room discovery");
    assert.ok(bobRooms.data.rooms.some((room) => room.id === created.publicRoomId));
    assert.ok(!bobRooms.data.rooms.some((room) => room.id === created.privateRoomId));
    const search = await request(bob.client, `/api/rooms?scope=discover&search=${encodeURIComponent(publicName)}`);
    okStatus(search, 200, "Room search");
    assert.deepEqual(search.data.rooms.map((room) => room.id), [created.publicRoomId]);
    const publicDetail = await request(eve.client, `/api/rooms/${created.publicRoomId}`);
    okStatus(publicDetail, 200, "Public room detail");
    assert.equal(publicDetail.data.room.id, created.publicRoomId);

    okStatus(await request(bob.client, `/api/rooms/${created.privateRoomId}`), 404, "Private room detail visibility");
    okStatus(await request(eve.client, `/api/rooms/${created.privateRoomId}`), 404, "Private room hidden from other user");
    okStatus(await request(bob.client, `/api/rooms/${created.privateRoomId}/join`, { method: "POST" }), 403, "Private room join authorization");
    okStatus(await request(bob.client, `/api/rooms/${created.publicRoomId}/join`, { method: "POST" }), 200, "Public room join");
    const membership = await db.query("SELECT member_role FROM room_members WHERE room_id = ? AND user_id = ?", [created.publicRoomId, bob.id]);
    assert.equal(membership.length, 1, "Room membership should persist in MySQL.");
    okStatus(await request(bob.client, `/api/rooms/${created.publicRoomId}/leave`, { method: "POST" }), 200, "Member leave");
    const leftMembership = await db.query("SELECT room_id FROM room_members WHERE room_id = ? AND user_id = ?", [created.publicRoomId, bob.id]);
    assert.equal(leftMembership.length, 0, "Leaving should remove only the member's room row.");
    okStatus(await request(alice.client, `/api/rooms/${created.publicRoomId}/leave`, { method: "POST" }), 409, "Owner leave protection");
  });

  test("chat membership authorization, persistence, and cursor pagination", async (t) => {
    if (!ready || !created.publicRoomId) return t.skip("Room setup did not create the public test room.");
    const alice = accounts.get("alice");
    const bob = accounts.get("bob");
    const eve = accounts.get("eve");
    okStatus(await request(bob.client, `/api/rooms/${created.publicRoomId}/join`, { method: "POST" }), 200, "Chat member join");
    okStatus(await request(eve.client, `/api/rooms/${created.publicRoomId}/messages`), 403, "Non-member history authorization");
    okStatus(await request(eve.client, `/api/rooms/${created.publicRoomId}/messages`, { method: "POST", body: { messageText: "Not allowed" } }), 403, "Non-member send authorization");
    okStatus(await request(bob.client, `/api/rooms/${created.privateRoomId}/messages`), 403, "Private chat authorization");

    const texts = [`first ${nonce}`, `second ${nonce}`, `third ${nonce}`];
    for (const [index, text] of texts.entries()) {
      const sent = await request(index === 1 ? alice.client : bob.client, `/api/rooms/${created.publicRoomId}/messages`, {
        method: "POST",
        body: { messageText: text },
      });
      okStatus(sent, 201, "Send chat message");
      created.messageIds.add(sent.data.message.id);
    }
    const firstPage = await request(bob.client, `/api/rooms/${created.publicRoomId}/messages?limit=2`);
    okStatus(firstPage, 200, "First message page");
    assert.equal(firstPage.data.messages.length, 2);
    assert.equal(firstPage.data.page.hasMore, true);
    assert.ok(firstPage.data.page.nextCursor);
    const nextPage = await request(bob.client, `/api/rooms/${created.publicRoomId}/messages?limit=2&before=${firstPage.data.page.nextCursor}`);
    okStatus(nextPage, 200, "Next message page");
    assert.equal(nextPage.data.messages.length, 1);
    assert.equal(nextPage.data.page.hasMore, false);
    const saved = await db.query(`SELECT message_id, message_text FROM chat_messages WHERE message_id IN (${[...created.messageIds].map(() => "?").join(",")})`, [...created.messageIds]);
    assert.equal(saved.length, 3, "All sent messages should persist in MySQL.");
    assert.deepEqual(new Set(saved.map((row) => row.message_text)), new Set(texts));
  });

  test("friend request, accept, reject, list, remove, and constraints", async (t) => {
    if (!ready || accounts.size < 3) return t.skip("Authentication setup did not create all test accounts.");
    const constraints = await db.query(
      "SELECT TABLE_NAME, INDEX_NAME, NON_UNIQUE FROM INFORMATION_SCHEMA.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND ((TABLE_NAME = 'users' AND INDEX_NAME IN ('username', 'email')) OR (TABLE_NAME = 'room_members' AND INDEX_NAME = 'PRIMARY') OR (TABLE_NAME = 'friend_requests' AND INDEX_NAME = 'uq_friend_request_pair'))",
    );
    assert.ok(constraints.some((item) => item.TABLE_NAME === "users" && item.INDEX_NAME === "username" && Number(item.NON_UNIQUE) === 0));
    assert.ok(constraints.some((item) => item.TABLE_NAME === "users" && item.INDEX_NAME === "email" && Number(item.NON_UNIQUE) === 0));
    assert.ok(constraints.some((item) => item.TABLE_NAME === "room_members" && item.INDEX_NAME === "PRIMARY" && Number(item.NON_UNIQUE) === 0));
    assert.ok(constraints.some((item) => item.TABLE_NAME === "friend_requests" && item.INDEX_NAME === "uq_friend_request_pair" && Number(item.NON_UNIQUE) === 0));
    const alice = accounts.get("alice");
    const bob = accounts.get("bob");
    const eve = accounts.get("eve");
    const sent = await request(alice.client, "/api/friends/requests", { method: "POST", body: { username: bob.username } });
    okStatus(sent, 201, "Send friend request");
    const requestId = sent.data.request.id;
    created.requestIds.add(requestId);
    okStatus(await request(alice.client, "/api/friends/requests", { method: "POST", body: { receiverId: bob.id } }), 409, "Duplicate pending request");
    const incoming = await request(bob.client, "/api/friends/requests?box=incoming");
    okStatus(incoming, 200, "List incoming requests");
    assert.ok(incoming.data.requests.some((item) => item.id === requestId));
    okStatus(await request(bob.client, `/api/friends/requests/${requestId}/accept`, { method: "POST" }), 200, "Accept friend request");
    const acceptedRow = await db.query("SELECT request_status, responded_at FROM friend_requests WHERE request_id = ?", [requestId]);
    assert.equal(acceptedRow[0]?.request_status, "accepted");
    assert.ok(acceptedRow[0]?.responded_at, "Acceptance timestamp should persist.");
    const orderedPair = [Math.min(alice.id, bob.id), Math.max(alice.id, bob.id)];
    const friendship = await db.query("SELECT user_id_1, user_id_2 FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?", orderedPair);
    assert.equal(friendship.length, 1, "Friendship should persist as one canonical row.");
    const aliceFriends = await request(alice.client, "/api/friends");
    okStatus(aliceFriends, 200, "Friend list");
    assert.ok(aliceFriends.data.friends.some((friend) => friend.id === bob.id));

    const rejected = await request(alice.client, "/api/friends/requests", { method: "POST", body: { receiverId: eve.id } });
    okStatus(rejected, 201, "Second friend request");
    created.requestIds.add(rejected.data.request.id);
    okStatus(await request(eve.client, `/api/friends/requests/${rejected.data.request.id}/reject`, { method: "POST" }), 200, "Reject friend request");
    const rejectedRow = await db.query("SELECT request_status, responded_at FROM friend_requests WHERE request_id = ?", [rejected.data.request.id]);
    assert.equal(rejectedRow[0]?.request_status, "rejected");
    assert.ok(rejectedRow[0]?.responded_at);

    okStatus(await request(alice.client, `/api/friends?userId=${bob.id}`, { method: "DELETE" }), 200, "Remove friend");
    const removed = await db.query("SELECT user_id_1 FROM friendships WHERE user_id_1 = ? AND user_id_2 = ?", orderedPair);
    assert.equal(removed.length, 0, "Friend removal should persist in MySQL.");
  });

  test("favorite add, list, remove, and private-room authorization", async (t) => {
    if (!ready || !created.publicRoomId || accounts.size < 2) return t.skip("Room/account setup did not complete.");
    const alice = accounts.get("alice");
    const bob = accounts.get("bob");
    okStatus(await request(bob.client, "/api/favorites", { method: "POST", body: { roomId: created.publicRoomId } }), 200, "Add public favorite");
    okStatus(await request(bob.client, "/api/favorites", { method: "POST", body: { roomId: created.publicRoomId } }), 200, "Idempotent favorite add");
    const favorites = await request(bob.client, "/api/favorites");
    okStatus(favorites, 200, "Favorite list");
    assert.ok(favorites.data.favorites.some((favorite) => favorite.id === created.publicRoomId));
    const saved = await db.query("SELECT user_id FROM room_favorites WHERE user_id = ? AND room_id = ?", [bob.id, created.publicRoomId]);
    assert.equal(saved.length, 1, "Favorite should persist exactly once.");
    okStatus(await request(bob.client, "/api/favorites", { method: "POST", body: { roomId: created.privateRoomId } }), 403, "Private room favorite authorization");
    okStatus(await request(alice.client, "/api/favorites", { method: "POST", body: { roomId: created.privateRoomId } }), 200, "Owner private favorite");
    okStatus(await request(bob.client, `/api/favorites?roomId=${created.publicRoomId}`, { method: "DELETE" }), 200, "Remove favorite");
    const removed = await db.query("SELECT user_id FROM room_favorites WHERE user_id = ? AND room_id = ?", [bob.id, created.publicRoomId]);
    assert.equal(removed.length, 0, "Favorite removal should persist in MySQL.");
  });

  test("installed advanced views reflect created room data", async (t) => {
    if (!ready || !advancedViewsAvailable) return t.skip("The advanced views are not installed; no SQL objects were installed by this suite.");
    if (!created.publicRoomId) return t.skip("No test room is available.");
    const rows = await db.query("SELECT room_id, member_count, message_count FROM vw_room_statistics WHERE room_id = ?", [created.publicRoomId]);
    assert.equal(rows.length, 1);
    assert.equal(Number(rows[0].member_count), 2);
    assert.equal(Number(rows[0].message_count), 3);
  });
});
