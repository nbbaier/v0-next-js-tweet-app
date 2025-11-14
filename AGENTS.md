# AGENTS.md

## Commands

-  Dev: `pnpm dev`
-  Build: `pnpm build` (runs type check + Next.js build)
-  Lint: `pnpm lint` (ESLint) or `biome check` (Biome linter/formatter)
-  Format: `biome format --write .`
-  Start: `pnpm start` (production server)
-  Test API: `curl -X POST http://localhost:3000/api/tweets -H "Content-Type: application/json" -d '{"url":"https://twitter.com/user/status/ID","secret":"your-secret"}'`

## Architecture

-  **Framework**: Next.js 16.0.0 (App Router), React 19.2.0, TypeScript 5.x
-  **Structure**: `/app` (routes + API routes), `/components` (React components), `/lib` (utilities/services), `/hooks` (custom hooks)
-  **Database**: Upstash Redis (sorted set storage via `lib/tweet-storage.ts`, caching via `lib/tweet-cache.ts`)
-  **Realtime**: Upstash Realtime with SSE (`/api/realtime`), schema in `lib/realtime.ts`, client hook `hooks/use-realtime-tweets.ts`
-  **Key Services**: Tweet service (`lib/tweet-service.ts`), realtime events (`lib/tweet-realtime.ts`), config (`lib/tweet-config.ts`)
-  **API Endpoints**: `/api/tweets` (POST/GET), `/api/tweets/[id]` (DELETE/PATCH), `/api/realtime` (SSE)

## Environment Variables

-  `UPSTASH_KV_KV_REST_API_URL` - Upstash Redis URL (required)
-  `UPSTASH_KV_KV_REST_API_TOKEN` - Upstash Redis token (required)
-  `TWEET_API_SECRET` - API secret for auth (generate with `openssl rand -base64 32`)

## Code Style

-  **Formatting**: Biome with tabs (indentStyle: "tab"), double quotes
-  **Imports**: Path alias `@/*` for root imports; organize imports automatically
-  **TypeScript**: Strict mode enabled; use type annotations, avoid `any`
-  **Components**: Functional components with TypeScript; use Radix UI for accessible primitives
-  **Styling**: Tailwind CSS 4.x with utility classes; dark mode via `next-themes`; use `cn()` helper from `lib/utils.ts`
-  **Naming**: PascalCase for components, camelCase for functions/variables, kebab-case for files
-  **Error Handling**: Return JSON responses with `{ success: boolean, error?: string }` format; use proper HTTP status codes

## Realtime Events

-  Events emitted via `channel.emit("tweet.added", { tweet })` format (dot-separated paths)
-  Client uses separate `useRealtime` hook per event type (v0.3.0 API requirement)
-  Channel name: `"tweets"` (global feed shared by all clients)
-  Event types: `tweet.added`, `tweet.updated`, `tweet.removed`, `tweet.seen`, `tweet.reorder`
