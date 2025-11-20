# Scout Report: Shared Tweet App

**Last Updated:** November 20, 2025

## Project Overview
A real-time collaborative tweet feed where multiple users can share tweets to a common feed. Built with Next.js 16 (App Router) and featuring instant updates via Server-Sent Events, dark/light themes, and a clean responsive UI.

## Core Architecture

### Data Flow
1. **Tweet Submission** → API endpoint → Redis storage → Real-time event → All clients update
2. **Tweet Display** → React components → Tweet service → Cache check → Storage fetch
3. **Real-time Updates** → Server events → Client hooks → UI re-renders

### Key Services (`/lib`)
- **`tweet-storage.ts`**: Redis operations (sorted sets for ordering, metadata storage)
- **`tweet-service.ts`**: Business logic with caching layer
- **`tweet-realtime.ts`**: Event emission for SSE updates
- **`tweet-cache.ts`**: 1-hour TTL caching for performance
- **`tweet-cleanup.ts`**: Auto-cleanup of tweets older than 3 days

### API Endpoints (`/app/api`)
- **`/api/tweets`**: POST (add), GET (list all)
- **`/api/tweets/[id]`**: DELETE, PATCH (seen status)
- **`/api/realtime`**: SSE endpoint for live updates
- **`/api/tweets/cleanup`**: Cron job for auto-cleanup

### Real-time System
- **Events**: `tweet.added`, `tweet.updated`, `tweet.removed`, `tweet.seen`, `tweet.reorder`
- **Channel**: Single global `"tweets"` channel
- **Client Hook**: `use-realtime-tweets.ts` subscribes to all events
- **Transport**: Server-Sent Events via Upstash Realtime

## Quick Resume Guide

### First Steps
1. **Check environment**: Verify `.env.local` has all required variables
2. **Start dev server**: `pnpm dev` (port 3000)
3. **Test functionality**: Add a tweet via web form or API
4. **Check real-time**: Open multiple browser tabs to verify instant updates

### Common Tasks
- **Add features**: Start with `lib/tweet-service.ts` for business logic
- **UI changes**: Modify components in `/components` (uses Radix UI + Tailwind)
- **API updates**: Edit files in `/app/api/tweets/`
- **Real-time events**: Update `lib/realtime.ts` schema and `lib/tweet-realtime.ts`

### Development Commands
```bash
pnpm dev        # Start development
pnpm build      # Production build (includes type check)
pnpm lint       # ESLint check
biome check     # Biome linter/formatter
biome format --write .  # Auto-format code
```

### Key Patterns
- **Error handling**: Return `{ success: boolean, error?: string }` from APIs
- **Type safety**: Strict TypeScript, Zod validation for realtime events
- **Caching**: Check cache first, then storage, update cache after fetch
- **Real-time**: Always publish events after data changes
- **Multi-user**: Track `submittedBy` as array of poster names

## Current Features
- ✅ Add tweets via URL/ID with API secret auth
- ✅ Real-time updates across all connected clients
- ✅ Seen/minimize tweets functionality
- ✅ Dark/light theme support
- ✅ Responsive mobile-friendly UI
- ✅ Auto-cleanup of old tweets (3-day TTL)
- ✅ Multi-user support (track who submitted each tweet)

## Next Development Priorities
1. **Authentication**: Replace API secret with proper user auth (NextAuth.js/Clerk)
2. **Testing**: Add unit/integration tests (no test framework currently set up)
3. **Features**: Add likes/reactions, tweet categories, or user profiles
4. **Performance**: Optimize for larger tweet collections
5. **Monitoring**: Add error tracking and performance monitoring