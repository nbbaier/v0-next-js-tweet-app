# Usage Guide: Shared Tweet App

This guide explains how to set up and use your shared tweet app for saving and viewing tweets together.

## Setup

### 1. Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```bash
# Upstash Redis Configuration (get from https://console.upstash.com/)
UPSTASH_KV_KV_REST_API_URL=https://your-redis-instance.upstash.io
UPSTASH_KV_KV_REST_API_TOKEN=your-token-here

# Tweet API Secret (create a strong random string)
TWEET_API_SECRET=your-secret-here
```

**To generate a secure API secret:**

```bash
openssl rand -base64 32
```

### 2. Configure in Vercel

If deploying on Vercel, add these environment variables in your project settings:

1. Go to your project dashboard
2. Navigate to Settings → Environment Variables
3. Add each variable listed above
4. Deploy/redeploy your application

## Features

### Adding Tweets

There are two ways to add tweets:

#### Option 1: Using the Web Form

1. Visit your deployed app
2. Find the "Add a Tweet" form at the top
3. Paste a tweet URL (e.g., `https://twitter.com/user/status/1234567890`)
   -  Supports both `twitter.com` and `x.com` URLs
   -  You can also paste just the tweet ID
4. Optionally add your name (e.g., "Partner 1" or "Partner 2")
5. Enter the API secret (the one you set in environment variables)
6. Click "Add Tweet"

The tweet will appear in the feed immediately!

#### Option 2: Using the API Directly

You can also programmatically add tweets using the API:

```bash
curl -X POST https://your-app.vercel.app/api/tweets \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://twitter.com/user/status/1234567890",
    "secret": "your-api-secret",
    "submittedBy": "**Partner** 1"
  }'
```

**Success Response:**

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

### Deleting Tweets

1. Find the tweet you want to remove in the feed
2. Click the "Delete" button in the top-right corner of the tweet
3. If prompted, enter your API secret
4. Click "Confirm"

The tweet will be removed from the feed immediately.

### Viewing Tweets

-  All tweets are displayed in reverse chronological order (newest first)
-  Tweets are cached for 1 hour to improve performance
-  The feed automatically updates in real-time when tweets are added, updated, or removed
-  Real-time updates use Upstash Realtime with a single global tweet feed channel (`tweets`)

## Advanced Usage

### iOS Shortcuts

You can create an iOS Shortcut to quickly share tweets to your app:

1. Open the Shortcuts app on iOS
2. Create a new shortcut
3. Add these actions:
   -  "Receive URLs from Share Sheet"
   -  "Get Contents of URL" (POST request to your API endpoint)
   -  Configure the request body with the shared URL and your API secret
4. Save and enable it in the Share Sheet

Now you can share tweets directly from Twitter/X to your app!

### Browser Bookmarklet

Create a bookmarklet to add the current tweet with one click:

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

Save this as a bookmark and click it while viewing a tweet to add it to your feed.

## API Reference

### POST /api/tweets

Add a new tweet to the feed.

**Request:**

```json
{
   "url": "string (required) - Tweet URL or ID",
   "secret": "string (required) - API secret",
   "submittedBy": "string (optional) - Identifier for submitter"
}
```

**Response (201 Created):**

```json
{
   "success": true,
   "tweetId": "string",
   "metadata": {
      "id": "string",
      "submittedAt": "number (timestamp)",
      "submittedBy": "string",
      "url": "string"
   }
}
```

**Error Responses:**

-  `400` - Invalid tweet URL or missing fields
-  `401` - Invalid or missing API secret
-  `409` - Tweet already exists
-  `500` - Server error

### DELETE /api/tweets/[id]

Remove a tweet from the feed.

**Headers:**

```
x-api-secret: your-secret-here
```

**Response (200 OK):**

```json
{
   "success": true,
   "tweetId": "string",
   "message": "Tweet removed successfully"
}
```

**Error Responses:**

-  `400` - Invalid tweet ID format
-  `401` - Invalid or missing API secret
-  `404` - Tweet not found
-  `500` - Server error

### GET /api/tweets

Get all tweet IDs (requires authentication).

**Headers:**

```
x-api-secret: your-secret-here
```

**Response (200 OK):**

```json
{
   "success": true,
   "tweetIds": ["id1", "id2", "id3"],
   "count": 3
}
```

## Troubleshooting

### "Invalid or missing API secret"

-  Make sure you've set `TWEET_API_SECRET` in your environment variables
-  Verify you're using the exact same secret value
-  Check for trailing spaces or newlines in the secret

### "Tweet already exists"

-  This tweet has already been added to your feed
-  You can view it in the existing feed

### "Failed to fetch tweets"

-  Check your Upstash Redis configuration
-  Verify the Redis instance is active
-  Check the environment variables are correctly set in Vercel

### Tweets not displaying

-  Ensure your Upstash Redis has no connection issues
-  Check the browser console for errors
-  Try refreshing the page

## Storage

-  Tweets are stored in **Upstash Redis** as a sorted set
-  Each tweet ID is stored with metadata (submission time, submitter)
-  Cache TTL: 1 hour
-  Storage persists until manually deleted

## Real-time Updates

The app uses **Upstash Realtime** to provide instant updates across all connected clients:

-  **Channel**: Single global feed channel (`tweets`)
-  **Schema**: Defined in `lib/realtime.ts` with Zod validation
-  **Events**:
   -  `tweet:added` - New tweet added to feed
   -  `tweet:updated` - Tweet metadata updated (e.g., new poster added)
   -  `tweet:removed` - Tweet deleted from feed
   -  `tweet:reorder` - Tweet order changed
   -  `tweet:seen` - Tweet seen status changed
-  **Client Hook**: `useRealtimeTweets` in `hooks/use-realtime-tweets.ts` uses `@upstash/realtime/client`
-  **Server Endpoint**: `/api/realtime` handles SSE connections via `@upstash/realtime` handler

The realtime system automatically handles reconnection and connection management, ensuring reliable real-time updates without manual polling.

## Security

-  API secret protects your endpoints from unauthorized access
-  Both you and your partner need to know the secret
-  Keep the secret private and secure
-  Consider rotating it periodically
-  The secret should be at least 32 characters long

## Next Steps

Consider adding these features in the future:

-  User accounts and authentication
-  Comments or notes on tweets
-  Categories/tags for organization
-  Search and filtering
-  Export functionality
-  Pagination for large collections
