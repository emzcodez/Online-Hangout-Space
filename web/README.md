This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Authentication secret

Authentication requires an `AUTH_SECRET` value with at least 32 characters in `web/.env`. Generate a private value with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Keep this value private and do not commit `.env`.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


## MongoDB Atlas (notifications and room activity)

The project keeps accounts, rooms, memberships, friendships and chat messages in MySQL.
MongoDB stores the flexible notification and room-activity documents.

1. Create a MongoDB Atlas cluster and a database user.
2. In Atlas, allow your development IP under **Network Access**.
3. Copy the Node.js connection string and set it in `web/.env`:

```env
MONGODB_URI="mongodb+srv://<db-user>:<db-password>@<cluster-host>/online_hangout_space?retryWrites=true&w=majority"
```

Keep the URI private and do not commit `.env`. The existing MySQL variables and `AUTH_SECRET`
must remain configured as before.

Install the new dependency and start the app:

```bash
npm install
npm run dev
```

### MongoDB collections and behavior

- `notifications`: recipient, actor, notification type, title/message, optional link, read state and timestamp.
- `roomactivities`: room/user identifiers, action, human-readable description, optional metadata and timestamp.
- Mongoose schemas define validation and create indexes for recipient/unread/time and room/user/time queries.
- `GET /api/notifications` returns the signed-in user's latest 50 notifications and unread count.
- `PATCH /api/notifications` accepts `{ "markAllRead": true }` or `{ "id": "<notification ObjectId>" }`.
- `GET /api/rooms/activity` returns activity for rooms the signed-in user belongs to. Optional `?roomId=123` scopes it to one joined room.
- The activity endpoint also runs a MongoDB aggregation pipeline grouping activity by action and counting each group.

Room creation, first-time room joining, and chat messages write activity documents. Sending a friend request writes a notification for its recipient. MongoDB write failures are logged but do not break the primary MySQL operation.

The dashboard now fetches and displays notifications and room activity. The bell scrolls to the notifications panel and the panel supports marking all notifications as read.
