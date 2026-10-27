# Online Hangout Space — Database Mini Project

A MySQL database for an **Online Hangout Space** application where users can create or join rooms, customize virtual spaces, manage friends, chat, and watch videos together.

This repository component demonstrates the database design and sample SQL operations behind the user interface.

## Contents

- ER diagram
- Relational schema
- MySQL table definitions and constraints
- Dummy data for testing
- Simple SQL queries
- Complex SQL queries using joins, aggregation, subqueries, `CASE`, and `UNION ALL`
- UI mapping showing how query results can power application screens

## Features represented in the database

- User profiles and account status
- Public and private rooms
- Room membership and member roles
- Friend requests and accepted friendships
- Furniture and decoration catalog
- Room item placement and customization
- Favorite rooms
- Chat messages
- Shared video-watch sessions and playback state

## Database technology

- **Database:** MySQL 8.0+
- **Character set:** `utf8mb4`
- **Suggested application stack:** React frontend with a Node.js/Express backend

The SQL script is a standalone database demo. It does not create the frontend or backend API.

## Project files

- `online_hangout_space.sql` — creates the database, creates all tables, inserts dummy data, and includes 15 example queries.

## Database schema overview

| Table | Purpose |
|---|---|
| `users` | User accounts and profile information |
| `rooms` | Room details, owner, privacy and wallpaper |
| `room_members` | Users in rooms and their roles |
| `friend_requests` | Incoming/outgoing friend requests and their status |
| `friendships` | Accepted friendships stored as ordered user pairs |
| `furniture_catalog` | Available furniture, wallpaper and decoration assets |
| `room_items` | Items placed in rooms, including position, rotation and scale |
| `room_favorites` | Rooms saved by users |
| `watch_sessions` | Shared video and playback state for a room |
| `chat_messages` | Room chat history |

### Friend relationship design

`friend_requests.sender_id` and `friend_requests.receiver_id` both reference `users.user_id`, so a request links two users with different roles. The request status tracks whether it is pending, accepted, rejected, or cancelled.

Accepted relationships are stored in `friendships` as one ordered pair (`user_id_1 < user_id_2`). This prevents storing both `(Maya, Arjun)` and `(Arjun, Maya)` as separate friendships. The application should update `friend_requests` and insert the corresponding `friendships` row in one transaction when a request is accepted.

## Setup

### Option A: MySQL Workbench

1. Install and start MySQL Server 8.0 or later.
2. Open MySQL Workbench and connect to your local server.
3. Open `online_hangout_space.sql`.
4. Review the script, then execute it using the lightning-bolt button.
5. Refresh the **Schemas** panel and open `online_hangout_space`.
6. Expand **Tables** to inspect the database and use the SQL editor to run individual queries.

### Option B: MySQL command line

From the directory containing the SQL file, run:

```bash
mysql -u root -p < online_hangout_space.sql
```

Enter your MySQL password when prompted.

To connect and inspect the database afterward:

```bash
mysql -u root -p
```

Then run:

```sql
USE online_hangout_space;
SHOW TABLES;
SELECT * FROM users;
SELECT * FROM rooms;
```

### Important reset warning

The SQL script starts with:

```sql
DROP DATABASE IF EXISTS online_hangout_space;
```

This deletes and recreates a database with that name. **Back up any existing database first.** Remove or comment out the `DROP DATABASE` statement if you need to preserve existing data.

## Sample queries

The SQL file includes 15 example queries. Some examples are listed below; run the complete query blocks from the SQL file.

### 1. Find a user by email

```sql
SELECT user_id, username, display_name, account_status
FROM users
WHERE email = 'maya@example.com';
```

**UI mapping:** account lookup. A real backend must securely verify the supplied password against the stored hash; this query alone does not authenticate a user.

### 2. Show public rooms

```sql
SELECT room_id, room_name, description, wallpaper
FROM rooms
WHERE is_private = FALSE
ORDER BY created_at DESC;
```

**UI mapping:** discover/browse rooms.

### 3. Show members in a room

```sql
SELECT u.display_name, rm.member_role, rm.joined_at
FROM room_members rm
JOIN users u ON u.user_id = rm.user_id
WHERE rm.room_id = 1
ORDER BY rm.joined_at;
```

**UI mapping:** room member list and roles.

### 4. Get room member and favorite counts

```sql
SELECT r.room_id, r.room_name,
       COUNT(DISTINCT rm.user_id) AS member_count,
       COUNT(DISTINCT rf.user_id) AS favorite_count
FROM rooms r
LEFT JOIN room_members rm ON rm.room_id = r.room_id
LEFT JOIN room_favorites rf ON rf.room_id = r.room_id
GROUP BY r.room_id, r.room_name
ORDER BY member_count DESC, favorite_count DESC;
```

**SQL concepts:** `LEFT JOIN`, `COUNT(DISTINCT ...)`, `GROUP BY`, `ORDER BY`.

**UI mapping:** room cards with member and favorite counts.

### 5. Find users who share a room with a given user

```sql
SELECT DISTINCT u.user_id, u.display_name
FROM room_members mine
JOIN room_members theirs ON theirs.room_id = mine.room_id
JOIN users u ON u.user_id = theirs.user_id
WHERE mine.user_id = 1
  AND theirs.user_id <> 1
ORDER BY u.display_name;
```

**SQL concepts:** self-join through the membership relationship.

**UI mapping:** mutual room members or suggested connections.

### 6. Get the latest watch session per room

```sql
SELECT r.room_name, ws.video_title, ws.video_url,
       ws.playback_position_seconds, ws.playback_status
FROM watch_sessions ws
JOIN rooms r ON r.room_id = ws.room_id
JOIN (
    SELECT room_id, MAX(started_at) AS latest_started_at
    FROM watch_sessions
    GROUP BY room_id
) latest
  ON latest.room_id = ws.room_id
 AND latest.latest_started_at = ws.started_at;
```

**SQL concepts:** derived table, aggregation, joins.

**UI mapping:** shared video player state.

Other queries in the script cover chat history, room customization, pending friend requests, room access, active-room statistics, keyword search, and notification feeds.

## How the database maps to the UI

A typical application request follows this flow:

```text
React UI
   |
   | HTTP request (for example, GET /api/rooms)
   v
Node.js / Express API
   |
   | Validate request, enforce permissions, run parameterized SQL
   v
MySQL database
   |
   | Rows returned by the query
   v
Express returns JSON
   |
   v
React renders the result
```

Example JSON response for a room card:

```json
[
  {
    "room_id": 1,
    "room_name": "Movie Lounge",
    "member_count": 4,
    "favorite_count": 2
  }
]
```

This is an illustrative response shape. The SQL script itself does not implement an API endpoint.

### Suggested API endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/rooms` | List rooms the user is allowed to discover |
| `GET` | `/api/rooms/:id/members` | List room members |
| `GET` | `/api/rooms/:id/messages` | Retrieve chat history |
| `POST` | `/api/rooms/:id/messages` | Send a message |
| `GET` | `/api/friends/requests` | List pending friend requests |
| `POST` | `/api/friends/requests` | Send a friend request |
| `POST` | `/api/friends/requests/:id/accept` | Accept a friend request |
| `GET` | `/api/rooms/:id/watch-session` | Retrieve the current watch session |
| `GET` | `/api/rooms/:id/items` | Load customized room items |

These are suggested endpoints, not routes implemented by the SQL file. For live chat and synchronized playback, add a real-time layer such as WebSockets; use the database to persist messages and playback state.

## Dummy data

The script inserts sample users, rooms, memberships, friend requests, friendships, catalog items, room customization items, favorites, watch sessions and chat messages.

The records are for development and demonstration only. The example `password_hash` values are placeholders and must **not** be used for authentication.

## Security and implementation notes

- Use parameterized SQL or a safe database query builder to prevent SQL injection.
- Hash passwords with a modern password-hashing algorithm in the backend; never store plaintext passwords.
- Enforce room privacy and membership permissions in the backend on every relevant request.
- When accepting a friend request, update the request status and insert the friendship row within a database transaction.
- Validate chat input and apply authorization before accepting messages or customization changes.
- Avoid exposing private room details to users who do not have access.
- The sample queries use fixed IDs for clarity. In the application, use validated parameters and the authenticated user's identity.
- For production use, consider pagination for messages, audit logging, and indexes based on actual query patterns.

## Demo checklist

- [ ] Run `online_hangout_space.sql` in MySQL.
- [ ] Verify that all 10 tables exist.
- [ ] Inspect the dummy users and rooms.
- [ ] Run a simple `SELECT` query.
- [ ] Run a join query for room members.
- [ ] Run an aggregate query for room statistics.
- [ ] Run the mutual-room-members query.
- [ ] Run the latest-watch-session query.
- [ ] Explain which UI screen would use each query.
- [ ] If a frontend is connected, show the API response rendered in the UI.

## Limitations

This is a database-design and SQL demonstration, not a complete deployable hangout application. It does not implement account authentication, room-joining APIs, authorization middleware, WebSocket events, or actual video playback. Those functions belong in the application layer.

## License

Add the license required by your course or project team before redistributing this work.
