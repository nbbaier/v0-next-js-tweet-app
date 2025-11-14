# Upstash Realtime Integration Documentation

This document explains how the Upstash Realtime integration works in this application, including architecture, event flow, and debugging tips.

## Overview

The app uses **@upstash/realtime** to provide real-time updates when tweets are added, updated, removed, or when their seen status changes. All clients connected to the feed receive instant updates without requiring page reloads.

## Architecture

### Server-Side Components

#### `lib/redis.ts`
- **Purpose**: Shared Upstash Redis client instance
- **Exports**: `redis` - Single Redis instance used by both storage and realtime
- **Environment Variables**: 
  - `UPSTASH_KV_KV_REST_API_URL`
  - `UPSTASH_KV_KV_REST_API_TOKEN`

#### `lib/realtime.ts`
- **Purpose**: Upstash Realtime instance configuration and schema definition
- **Key Components**:
  - **Schema**: Zod schema defining event types and their data structures
  - **Realtime Instance**: Configured with schema, redis client, and maxDurationSecs (300)
  - **Type Exports**: TypeScript types inferred from the schema

**Schema Structure**:
```typescript
{
  tweet: {
    added: { tweet: TweetData }
    updated: { tweet: TweetData }
    removed: { id: string }
    reorder: { tweetIds: string[] }
    seen: { tweetId: string, seen: boolean }
  }
}
```

**Channel**: Single global channel `"tweets"` used for all tweet-related events

#### `lib/tweet-realtime.ts`
- **Purpose**: Helper functions to emit realtime events
- **Key Functions**:
  - `publishTweetAdded(tweet: TweetData)` - Emits when a new tweet is added
  - `publishTweetUpdated(tweet: TweetData)` - Emits when tweet metadata changes
  - `publishTweetRemoved(tweetId: string)` - Emits when a tweet is deleted
  - `publishTweetSeen(tweetId: string, seen: boolean)` - Emits when seen status changes
  - `publishTweetReorder(tweetIds: string[])` - Emits when tweet order changes

**Important**: Events are emitted using `channel.emit("tweet.added", { tweet })` format (dot-separated event path as string), not the nested accessor pattern.

#### `app/api/realtime/route.ts`
- **Purpose**: SSE endpoint handler for client connections
- **Implementation**: Uses `handle({ realtime })` from `@upstash/realtime`
- **Configuration**: `maxDuration = 300` (matches realtime config)
- **URL**: `/api/realtime?channels=tweets`

### Client-Side Components

#### `hooks/use-realtime-tweets.ts`
- **Purpose**: React hook that subscribes to realtime events and manages tweet state
- **Configuration**:
  - `channels: ["tweets"]` - Subscribes to the "tweets" channel
  - `events: { tweet: { added, removed, updated, reorder, seen } }` - Event handlers
- **Returns**:
  - `tweets` - Current tweet list (updated in real-time)
  - `isConnected` - Connection status boolean
  - `reconnect()` - Placeholder (reconnection handled automatically)
  - `disconnect()` - Placeholder (set enabled=false to disconnect)

**Event Handlers**: Each handler receives typed event data and updates the local state accordingly.

## Event Flow

### Adding a Tweet

1. **Client** → POST `/api/tweets` with tweet URL
2. **Server** → `app/api/tweets/route.ts` validates and calls `addTweetToStorage()`
3. **Storage** → `lib/tweet-storage.ts` stores tweet in Redis and calls `publishTweetAdded()`
4. **Realtime** → `lib/tweet-realtime.ts` emits event: `channel.emit("tweet.added", { tweet })`
5. **Upstash** → Event is published to Redis Streams and broadcast to connected clients
6. **Client** → `useRealtimeTweets` hook receives event and updates local state
7. **UI** → Tweet appears in feed without page reload

### Updating Tweet Seen Status

1. **Client** → PATCH `/api/tweets/[id]` with `{ seen: boolean }`
2. **Server** → `app/api/tweets/[id]/route.ts` calls `updateTweetSeen()`
3. **Storage** → Updates Redis and calls `publishTweetSeen()`
4. **Realtime** → Emits `channel.emit("tweet.seen", { tweetId, seen })`
5. **Client** → Hook receives event and updates tweet's seen status
6. **UI** → Tweet visibility updates immediately

## Event Path Format

**Important**: The server emits events using dot-separated string paths:
- `channel.emit("tweet.added", { tweet })`
- `channel.emit("tweet.updated", { tweet })`
- `channel.emit("tweet.removed", { id })`
- `channel.emit("tweet.seen", { tweetId, seen })`
- `channel.emit("tweet.reorder", { tweetIds })`

The client subscribes using nested object structure:
```typescript
events: {
  tweet: {
    added: (data) => { ... },
    updated: (data) => { ... },
    // etc.
  }
}
```

Upstash Realtime automatically maps between these formats.

## Channel Configuration

- **Channel Name**: `"tweets"` (single global feed)
- **Server Emit**: `realtime.channel("tweets").emit("tweet.added", ...)`
- **Client Subscribe**: `channels: ["tweets"]`

All tweet events are scoped to this single channel, making it a global feed that all clients share.

## Debugging

### Server-Side Debugging

**Check if events are being emitted**:
- Look for `[Realtime] Successfully published tweet:added for <id>` in server logs
- If missing, check `[Realtime ERROR]` logs for emit failures

**Common Issues**:
- Channel object doesn't have `tweet` property → Use `channel.emit("tweet.added", ...)` instead
- Redis connection errors → Verify `UPSTASH_KV_KV_REST_API_URL` and `UPSTASH_KV_KV_REST_API_TOKEN`

### Client-Side Debugging

**Check connection status**:
- Look for `[Realtime Hook] ✅ Connected!` in browser console
- Check Network tab for `/api/realtime?channels=tweets` request
- Verify status is `"connected"` not `"disconnected"`

**Check if events are received**:
- Look for `[Realtime Hook] ✅ Received tweet.added event:` in browser console
- If missing, verify:
  1. Client is connected to correct channel (`channels=tweets` not `channels=default`)
  2. Server is emitting to the same channel (`"tweets"`)
  3. Event path matches schema (`"tweet.added"` matches `events.tweet.added`)

**Common Issues**:
- Client connecting to `channels=default` → Type assertion may be ignoring `channels` parameter
- Status shows `"disconnected"` → Check Network tab for SSE connection errors
- Events not received → Verify channel name matches between emit and subscribe

### Network Tab Inspection

1. **Find the SSE connection**: Look for `/api/realtime` request with type `eventsource`
2. **Check query parameters**: Should be `?channels=tweets` (not `channels=default`)
3. **Check response**: Should be `200 OK` with `Content-Type: text/event-stream`
4. **Monitor events**: In the Response/Preview tab, you should see SSE messages when events are emitted

### Testing Event Flow

1. **Add a tweet** via the API or UI form
2. **Server logs** should show:
   ```
   [Storage] About to publish tweet:added for <id>
   [Realtime] Trying channel.emit('tweet.added', ...)
   [Realtime] Successfully published tweet:added for <id>
   ```
3. **Browser console** should show:
   ```
   [Realtime Hook] ✅ Received tweet.added event: { tweet: {...} }
   [Realtime] Tweet added: <id>
   ```
4. **UI** should update immediately without page reload

## Key Files Reference

- **`lib/redis.ts`** - Shared Redis client
- **`lib/realtime.ts`** - Realtime schema and instance
- **`lib/tweet-realtime.ts`** - Event emission helpers
- **`lib/tweet-storage.ts`** - Storage layer (calls publish helpers)
- **`app/api/realtime/route.ts`** - SSE endpoint handler
- **`hooks/use-realtime-tweets.ts`** - Client-side React hook
- **`components/filterable-tweet-feed.tsx`** - Uses the hook

## Environment Variables

Required for realtime to work:
```bash
UPSTASH_KV_KV_REST_API_URL=https://your-redis-instance.upstash.io
UPSTASH_KV_KV_REST_API_TOKEN=your-token-here
```

## Dependencies

- `@upstash/realtime` - Main realtime library
- `@upstash/redis` - Redis client (used by realtime)
- `zod` - Schema validation (used by realtime)

## Troubleshooting Checklist

- [ ] Redis environment variables are set correctly
- [ ] Server logs show successful event emission
- [ ] Client Network tab shows `/api/realtime?channels=tweets` (not `default`)
- [ ] Client console shows `status: "connected"`
- [ ] Event handlers are defined in `events.tweet.*` structure
- [ ] Server emits using `channel.emit("tweet.added", ...)` format
- [ ] Channel name matches: `"tweets"` on both server and client
- [ ] No TypeScript errors preventing proper type inference

## Notes

- The realtime system is **non-blocking** - if emit fails, tweet storage still succeeds
- Events are **type-safe** - TypeScript types are inferred from Zod schema
- Connection is **automatic** - useRealtime handles reconnection and error recovery
- Channel is **global** - all clients share the same "tweets" channel

