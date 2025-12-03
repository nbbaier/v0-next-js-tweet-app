# Shared Tweet App

A real-time collaborative tweet feed built with Next.js, featuring instant updates and a modern, responsive UI. Perfect for sharing interesting tweets with friends or partners.

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/nbbaiers-projects/v0-next-js-tweet-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/g3irQjK6slk)

## Features

-  🚀 **Real-time Updates** - Instant feed updates using Upstash Realtime (no page reloads)
-  🎨 **Modern UI** - Clean interface with dark/light theme support
-  🔒 **Secure API** - Protected endpoints with API secret authentication
-  ⚡ **Fast Performance** - Redis caching with 1-hour TTL
-  📱 **Responsive Design** - Works seamlessly on all devices
-  🎯 **Simple Sharing** - Add tweets via URL, ID, or API

## Tech Stack

-  **Framework**: Next.js 16.0.0 (App Router), React 19.2.0
-  **TypeScript**: 5.x (strict mode)
-  **Styling**: Tailwind CSS 4.x, Radix UI components
-  **Database**: Upstash Redis (sorted sets)
-  **Real-time**: Upstash Realtime (Server-Sent Events)
-  **Code Quality**: Biome (linting & formatting)
-  **Deployment**: Vercel

## Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment Variables

Create a `.env.local` file:

```bash
# Get from https://console.upstash.com/
UPSTASH_KV_KV_REST_API_URL=https://your-redis-instance.upstash.io
UPSTASH_KV_KV_REST_API_TOKEN=your-token-here

# Generate with: openssl rand -base64 32
TWEET_API_SECRET=your-secret-here

# Optional: For Vercel cron job authentication (generate with: openssl rand -base64 32)
CRON_SECRET=your-cron-secret-here
```

### 3. Run Development Server

```bash
pnpm dev
```

Visit [http://localhost:3000](http://localhost:3000) to see your app.

### 4. Build for Production

```bash
pnpm build
pnpm start
```

## Usage

### Adding Tweets

**Via Web Form:**

1. Visit your app
2. Click "Add a Tweet"
3. Paste a tweet URL (supports `twitter.com` and `x.com`)
4. Optionally add your name
5. Enter your API secret
6. Click "Add Tweet"

**Via API:**

```bash
curl -X POST https://your-app.vercel.app/api/tweets \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://twitter.com/user/status/1234567890",
    "secret": "your-api-secret",
    "submittedBy": "Partner 1"
  }'
```

### Deleting Tweets

Click the delete button on any tweet, enter your API secret, and confirm.

### Real-time Features

All connected clients see updates instantly:

-  New tweets appear automatically
-  Deletions sync across all browsers
-  Seen status updates in real-time
-  No polling or manual refreshing required

## API Reference

### POST `/api/tweets`

Add a new tweet to the feed.

**Request:**

```json
{
   "url": "string (required)",
   "secret": "string (required)",
   "submittedBy": "string (optional)"
}
```

**Response (201):**

```json
{
   "success": true,
   "tweetId": "1234567890",
   "metadata": {
      "id": "1234567890",
      "submittedAt": 1699999999999,
      "submittedBy": "Partner 1",
      "url": "https://twitter.com/i/status/1234567890"
   }
}
```

### DELETE `/api/tweets/[id]`

Remove a tweet from the feed.

**Headers:**

```
x-api-secret: your-secret-here
```

**Response (200):**

```json
{
   "success": true,
   "tweetId": "1234567890",
   "message": "Tweet removed successfully"
}
```

### GET `/api/tweets`

Get all tweet IDs (requires authentication).

**Headers:**

```
x-api-secret: your-secret-here
```

**Response (200):**

```json
{
   "success": true,
   "tweetIds": ["id1", "id2", "id3"],
   "count": 3
}
```

### PATCH `/api/tweets/[id]`

Update tweet metadata (e.g., seen status).

**Request:**

```json
{
   "seen": true
}
```

**Response (200):**

```json
{
   "success": true,
   "metadata": {
      "id": "1234567890",
      "submittedAt": 1699999999999,
      "submittedBy": "Partner 1",
      "seen": true
   }
}
```

### GET `/api/realtime`

Server-Sent Events endpoint for real-time updates.

**Query Parameters:**

```
channels=tweets
```

### GET `/api/tweets/cleanup`

Clean up old tweets (removes tweets older than 3 days that have been marked as seen). Used by Vercel cron job.

**Headers:**

```
x-api-secret: your-secret-here
# OR for Vercel cron:
authorization: Bearer your-cron-secret-here
```

**Query Parameters:**

-  `preview=true` - Preview which tweets will be deleted without actually deleting them

**Response (200):**

```json
{
   "success": true,
   "deletedCount": 5,
   "deletedTweetIds": ["id1", "id2", "id3", "id4", "id5"],
   "errors": []
}
```

**Preview Response (200):**

```json
{
   "success": true,
   "expiredTweets": [
      {
         "id": "1234567890",
         "submittedAt": 1699999999999,
         "ageInDays": 3.5,
         "seen": true
      }
   ],
   "count": 1
}
```

### DELETE `/api/tweets/cleanup`

Same as GET `/api/tweets/cleanup` - removes old tweets. Supports preview mode with `?preview=true`.

## Architecture

### Project Structure

```
/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── tweets/       # Tweet CRUD endpoints
│   │   │   ├── [id]/     # Individual tweet operations
│   │   │   └── cleanup/  # Cleanup endpoint
│   │   └── realtime/     # SSE endpoint
│   ├── layout.tsx        # Root layout with theme
│   └── page.tsx          # Home page
├── components/            # React components
│   ├── filterable-tweet-feed.tsx
│   ├── tweet-with-actions.tsx
│   └── theme-provider.tsx
├── hooks/                 # Custom React hooks
│   └── use-realtime-tweets.ts
├── lib/                   # Utilities and services
│   ├── tweet-service.ts  # Core tweet logic
│   ├── tweet-storage.ts  # Redis storage layer
│   ├── tweet-cache.ts    # Caching logic
│   ├── tweet-realtime.ts # Event emission
│   ├── realtime.ts       # Realtime schema
│   └── redis.ts          # Redis client
└── styles/                # Global styles
```

### Real-time System

The app uses **Upstash Realtime** for instant updates:

**Event Types:**

-  `tweet.added` - New tweet added
-  `tweet.updated` - Tweet metadata changed
-  `tweet.removed` - Tweet deleted
-  `tweet.seen` - Seen status changed
-  `tweet.reorder` - Tweet order changed

**Architecture:**

-  **Server**: Emits events via `channel.emit("tweet.added", { tweet })`
-  **Client**: Subscribes using `useRealtime` hook (one per event type)
-  **Channel**: Single global `"tweets"` channel
-  **Transport**: Server-Sent Events (SSE) via `/api/realtime`

**Key Files:**

-  `lib/realtime.ts` - Schema definition with Zod validation
-  `lib/tweet-realtime.ts` - Event emission helpers
-  `hooks/use-realtime-tweets.ts` - Client-side React hook
-  `app/api/realtime/route.ts` - SSE endpoint handler

## Development

### Commands

```bash
pnpm dev        # Start dev server
pnpm build      # Build for production
pnpm start      # Start production server
pnpm lint       # Run ESLint
biome check     # Run Biome linter
biome format --write .  # Format code
```

### Code Style

-  **Formatting**: Tabs, double quotes (Biome)
-  **Imports**: Use `@/*` path alias
-  **TypeScript**: Strict mode, avoid `any`
-  **Components**: Functional components with TypeScript
-  **Styling**: Tailwind utility classes with `cn()` helper
-  **Naming**: PascalCase (components), camelCase (functions), kebab-case (files)

## Troubleshooting

### "Invalid or missing API secret"

-  Verify `TWEET_API_SECRET` is set in `.env.local` or Vercel
-  Check for trailing spaces or newlines in the secret
-  Ensure you're using the exact same value

### "Tweet already exists"

The tweet is already in your feed - check the existing tweets.

### Real-time updates not working

-  Check Redis environment variables are set correctly
-  Look for `[Realtime]` logs in server console
-  Verify Network tab shows `/api/realtime?channels=tweets` connection
-  Check browser console for `[Realtime Hook]` connection status

### Cleanup not running

-  Verify `CRON_SECRET` is set in Vercel environment variables
-  Check Vercel cron job logs in the dashboard
-  Test manually: `GET /api/tweets/cleanup?preview=true` to see what would be deleted
-  Ensure tweets are marked as seen before they can be cleaned up (unseen tweets are preserved)

### Tweets not displaying

-  Verify Upstash Redis instance is active
-  Check browser console for errors
-  Try refreshing the page

### Auto-cleanup Feature

-  **Retention Period**: Tweets older than 3 days are automatically deleted
-  **Smart Cleanup**: Only deletes tweets that are both old AND marked as seen
-  **Unseen Protection**: Unseen tweets are preserved regardless of age
-  **Cron Job**: Automatic cleanup runs daily at midnight UTC via Vercel cron
-  **Manual Cleanup**: Can be triggered manually via `/api/tweets/cleanup` endpoint
-  **Preview Mode**: Use `?preview=true` to see which tweets will be deleted without actually deleting them

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables in project settings
4. Deploy

**Live Deployment:** [https://vercel.com/nbbaiers-projects/v0-next-js-tweet-app](https://vercel.com/nbbaiers-projects/v0-next-js-tweet-app)

### Environment Variables

Required in Vercel project settings:

-  `UPSTASH_KV_KV_REST_API_URL`
-  `UPSTASH_KV_KV_REST_API_TOKEN`
-  `TWEET_API_SECRET`
-  `CRON_SECRET` (optional, for cron job authentication)

**Cron Configuration:**

The cleanup cron job is configured in `vercel.json` to run daily at midnight UTC. Make sure to set the `CRON_SECRET` environment variable in Vercel for secure cron execution.

## Security

-  API secret protects all endpoints from unauthorized access
-  Share the secret only with trusted collaborators
-  Use a strong secret (minimum 32 characters)
-  Consider rotating the secret periodically
-  Never commit secrets to the repository

## Advanced Usage

### iOS Shortcuts

Create a shortcut to share tweets directly from Twitter/X:

1. Open Shortcuts app
2. Create new shortcut
3. Add "Receive URLs from Share Sheet"
4. Add "Get Contents of URL" (POST to your API)
5. Configure request body with URL and secret
6. Enable in Share Sheet

### Browser Bookmarklet

Add the current tweet with one click:

```javascript
javascript: (function () {
   const url = window.location.href;
   const secret = prompt("Enter API secret:");
   if (!secret) return;
   fetch("https://your-app.vercel.app/api/tweets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url, secret }),
   })
      .then((r) => r.json())
      .then((d) => alert(d.success ? "Tweet added!" : "Error: " + d.error))
      .catch((e) => alert("Error: " + e.message));
})();
```

## Continue Building

This project was initially built with [v0.app](https://v0.app). You can continue building at:

**[https://v0.app/chat/g3irQjK6slk](https://v0.app/chat/g3irQjK6slk)**

Changes deployed from v0 will automatically sync to this repository.

## License

MIT
