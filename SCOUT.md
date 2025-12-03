# Scout Report: Shared Tweet App

**Last Updated:** November 20, 2025 - 12:00 PM

## Project Overview
A real-time collaborative tweet feed where multiple users can share tweets to a common feed. Built with Next.js 16 (App Router) and featuring instant updates via Server-Sent Events, dark/light themes, and a clean responsive UI.

## Core Architecture

### Data Flow
1. **Tweet Submission** → API endpoint → Redis storage → Real-time event → All clients update
2. **Tweet Display** → React components → Tweet service → Cache check → Storage fetch
3. **Real-time Updates** → Server events → Client hooks → UI re-renders

### Key Services (`/lib`)
- **`tweet-storage.ts`**: Redis operations (sorted sets for ordering, metadata storage) - supports multi-user poster tracking
- **`tweet-service.ts`**: Business logic with caching layer (1-hour TTL)
- **`tweet-realtime.ts`**: Event emission for SSE updates (5 event types)
- **`tweet-cache.ts`**: Performance caching with Redis
- **`tweet-cleanup.ts`**: Auto-cleanup of tweets older than 3 days via cron

### API Endpoints (`/app/api`)
- **`/api/tweets`**: POST (add), GET (list all) - requires API secret
- **`/api/tweets/[id]`**: DELETE, PATCH (seen status) - requires API secret
- **`/api/realtime`**: SSE endpoint for live updates
- **`/api/tweets/cleanup`**: Cron job for auto-cleanup (runs daily at midnight UTC)

### Real-time System
- **Events**: `tweet.added`, `tweet.updated`, `tweet.removed`, `tweet.seen`, `tweet.reorder`
- **Channel**: Single global `"tweets"` channel
- **Client Hook**: `use-realtime-tweets.ts` subscribes to all events
- **Transport**: Server-Sent Events via Upstash Realtime v0.3.0

## Quick Resume Guide

### First Steps
1. **Check environment**: Verify `.env.local` has all required variables (see README)
2. **Start dev server**: `pnpm dev` (port 3000)
3. **Test functionality**: Add a tweet via web form or API
4. **Check real-time**: Open multiple browser tabs to verify instant updates

### Common Development Tasks
- **Add features**: Start with `lib/tweet-service.ts` for business logic
- **UI changes**: Modify components in `/components` (Radix UI + Tailwind CSS)
- **API updates**: Edit files in `/app/api/tweets/`
- **Real-time events**: Update `lib/realtime.ts` schema and `lib/tweet-realtime.ts`
- **New components**: Follow existing patterns in `/components/ui/`

### Development Commands
```bash
pnpm dev        # Start development server
pnpm build      # Production build (includes type check)
pnpm lint       # ESLint check  
biome check     # Biome linter/formatter
biome format --write .  # Auto-format code
```

### Key Patterns & Conventions
- **Error handling**: Return `{ success: boolean, error?: string }` from APIs
- **Type safety**: Strict TypeScript, Zod validation for realtime events
- **Caching**: Check cache first, then storage, update cache after fetch
- **Real-time**: Always publish events after data changes
- **Multi-user**: Track `submittedBy` as array of poster names
- **Code style**: Tabs, double quotes, PascalCase components, camelCase functions

## Current Features
- ✅ Add tweets via URL/ID with API secret authentication
- ✅ Real-time updates across all connected clients (no refresh needed)
- ✅ Seen/minimize tweets functionality with persistent state
- ✅ Dark/light theme support with system preference detection
- ✅ Responsive mobile-friendly UI
- ✅ Auto-cleanup of old tweets (3-day TTL via cron job)
- ✅ Multi-user support (track who submitted each tweet)
- ✅ Tweet caching for performance (1-hour TTL)

## Next Development Priorities
1. **Authentication**: Replace API secret with proper user auth (NextAuth.js/Clerk)
2. **Testing**: Add unit/integration tests (no test framework currently set up)
3. **Features**: Add likes/reactions, tweet categories, or user profiles
4. **Performance**: Optimize for larger tweet collections
5. **Monitoring**: Add error tracking and performance monitoring

## Architecture Notes
- **Frontend**: Next.js App Router with React 19.2.0, server components for initial load
- **Backend**: API routes handle CRUD operations with Redis persistence
- **Real-time**: Upstash Realtime provides SSE without WebSocket complexity
- **Storage**: Redis sorted sets maintain chronological order, separate metadata storage
- **Caching**: Two-tier caching (Redis + in-memory) for optimal performance
- **Deployment**: Vercel-ready with environment variable configuration