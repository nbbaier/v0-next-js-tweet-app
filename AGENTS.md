# AGENTS.md

## Commands

| Command | Purpose |
|---------|---------|
| `pnpm dev` | Start development server |
| `pnpm build` | Type check + Next.js build |
| `pnpm start` | Production server |
| `pnpm lint` | Biome linting |
| `biome format --write .` | Format code |

## Tech Stack

- **Framework**: Next.js 16.0.0 (App Router), React 19.2.0, TypeScript 5.x
- **Styling**: Tailwind CSS 4.x, Radix UI, next-themes (dark mode)
- **Database**: Upstash Redis (tweet storage + caching)
- **Realtime**: Upstash Realtime with SSE
- **Code Quality**: Biome (Ultracite preset)

## Project Structure

```
/app              # Routes + API routes
/components       # React components
/hooks            # Custom hooks (use-realtime-tweets.ts)
/lib
  /utils.ts       # cn() helper
  /tweet-*.ts     # Service, cache, config, storage, realtime
/public           # Static assets
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/tweet-service.ts` | Tweet CRUD operations |
| `lib/tweet-storage.ts` | Redis sorted set storage |
| `lib/tweet-cache.ts` | Redis caching layer |
| `lib/tweet-realtime.ts` | SSE event emission |
| `lib/realtime.ts` | Upstash Realtime schema |
| `hooks/use-realtime-tweets.ts` | Client-side realtime hook |
| `app/api/tweets/route.ts` | POST/GET tweets |
| `app/api/tweets/[id]/route.ts` | DELETE/PATCH tweets |
| `app/api/realtime/route.ts` | SSE endpoint |

## Environment Variables

```bash
UPSTASH_KV_KV_REST_API_URL=      # Upstash Redis URL
UPSTASH_KV_KV_REST_API_TOKEN=    # Upstash Redis token
TWEET_API_SECRET=                # API auth secret
```

## Code Style

- **Formatting**: Biome with tabs, double quotes, auto-organized imports
- **TypeScript**: Strict mode, explicit types, avoid `any`
- **Naming**: PascalCase components, camelCase functions, kebab-case files
- **Styling**: Tailwind utilities, `cn()` helper, dark mode via `next-themes`
- **API Responses**: `{ success: boolean, error?: string }` format

## Realtime Events

Channel: `"tweets"` (global feed)

| Event | Payload |
|-------|---------|
| `tweet.added` | `{ tweet }` |
| `tweet.updated` | `{ tweet }` |
| `tweet.removed` | `{ id }` |
| `tweet.seen` | `{ id }` |
| `tweet.reorder` | `{ tweets }` |

**Note**: Client uses separate `useRealtime()` hook per event type (v0.3.0 API).

## Common Tasks

**Add a new component:**
1. Create in `/components`
2. Use PascalCase filename
3. Use Radix UI primitives for accessibility

**Add an API endpoint:**
1. Create route in `/app/api/...`
2. Return `{ success, error? }` JSON
3. Use proper HTTP status codes

**Modify tweet logic:**
1. Update service in `lib/tweet-service.ts`
2. Storage changes go in `lib/tweet-storage.ts`
3. Emit realtime events via `lib/tweet-realtime.ts`

**Test API locally:**
```bash
curl -X POST http://localhost:3000/api/tweets \
  -H "Content-Type: application/json" \
  -d '{"url":"https://twitter.com/user/status/ID","secret":"your-secret"}'
```

## Important Notes

- Auto-syncs with v0.app: https://v0.app/chat/g3irQjK6slk
- Deployed on Vercel (auto-sync from production branch)
- Biome handles most formatting automatically - run `pnpm lint` before committing
- React 19: Use ref as prop (no `forwardRef`)
- Next.js: Use Server Components for async data fetching
