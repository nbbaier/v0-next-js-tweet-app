# Plan 007: Add an authenticated JSON export of the full tweet collection

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- app/api lib/tweet-service.ts lib/tweet-storage.ts lib/tweet-config.ts app/page.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Plan 002's auth helper landing in
> `app/api` is an expected, required diff.)

## Status

- **Priority**: P3 (direction / feature)
- **Effort**: M
- **Risk**: LOW (read-only endpoint, additive)
- **Depends on**: plans/002-harden-api-auth.md (reuses `requireApiSecret`)
- **Category**: direction
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

The collection lives only in one Upstash Redis instance; the daily cleanup
cron **permanently deletes** seen tweets older than 3 days. There is no backup
or portability story. USAGE.md explicitly lists "Export functionality" as a
future feature. The read path for "everything" already exists and is exactly
what `app/page.tsx` does on every request — an export endpoint is a thin,
auth-gated wrapper over it. This delivers backup/portability at near-zero
risk and gives the maintainer a disaster-recovery option before any riskier
plan touches storage code.

## Current state

- The full-collection read path, `app/page.tsx:9-14` (copy this pattern):
  ```ts
  const [tweetIds, savedTweetIds] = await Promise.all([
    getTweetIds(),                    // from "@/lib/tweet-config"
    getSavedTweetIdsFromStorage(),    // from "@/lib/tweet-storage"
  ]);
  const allIds = [...new Set([...tweetIds, ...savedTweetIds])];
  const tweets = await fetchTweetsWithCache(allIds);   // from "@/lib/tweet-service"
  ```
- `fetchTweetsWithCache` returns `TweetData[]` (`lib/tweet-service.ts:10-17`):
  `{ id, content? (full react-tweet Tweet object), seen?, saved?, savedAt?, submittedBy: string[] }`,
  filtered to tweets that have content (`:145`). Note: plan 005 may have
  removed `savedAt`.
- Metadata richer than `TweetData` exists in storage:
  `getTweetMetadatas(ids)` (`lib/tweet-storage.ts:237`) returns
  `{ id, submittedAt, posters: {name, submittedAt}[], url, seen?, saved? }` —
  the export should include this (it's the part that can't be re-fetched from
  Twitter once deleted).
- Auth helper from plan 002: `lib/api-auth.ts` → `requireApiSecret(request)`
  returns `NextResponse | null`. **This plan must not proceed if that file
  doesn't exist** (see STOP conditions).
- Route conventions: see `app/api/tweets/route.ts` — `NextRequest`/
  `NextResponse`, try/catch with `console.error("[API ERROR] ...")` and
  `{ error }` + status on failure. Match it.
- Existing route registration is purely file-based: a new
  `app/api/tweets/export/route.ts` is automatically served at
  `/api/tweets/export`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm check`             | exit 0              |
| Tests     | `pnpm test`              | all pass            |
| Dev server | `pnpm dev`              | :3000 (needs `.env.local`) |

## Scope

**In scope** (create/modify only):
- `app/api/tweets/export/route.ts` (create)
- `USAGE.md` (document the endpoint; replace the "future feature" mention)

**Out of scope (do NOT touch)**:
- Any UI component — a download button in `TweetFeedHeader` is a nice
  follow-up but explicitly deferred; curl/browser-with-header suffices for
  backup purposes.
- CSV format — JSON only. CSV of nested tweet content is lossy and invites
  format-design debates; defer until someone actually needs it.
- Import (the reverse operation) — separate design discussion.
- `lib/tweet-service.ts`, `lib/tweet-storage.ts` — read-only consumption.

## Git workflow

- Branch: `advisor/007-export-endpoint`
- One commit, e.g. `feat: add authenticated JSON export endpoint`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the route

`app/api/tweets/export/route.ts`, GET handler:

1. `const authError = requireApiSecret(request); if (authError) return authError;`
2. Gather IDs exactly like `app/page.tsx:9-13` (both sorted sets, de-duplicated).
3. Fetch both layers in parallel: `fetchTweetsWithCache(allIds)` and
   `getTweetMetadatas(allIds)`.
4. Build the export document:
   ```ts
   {
     exportedAt: new Date().toISOString(),
     count: allIds.length,
     tweets: allIds.map((id) => ({
       id,
       metadata: metadataById.get(id) ?? null,   // submittedAt, posters, url, seen, saved
       content: contentById.get(id)?.content ?? null, // null for tombstoned/unfetchable tweets
     })),
   }
   ```
   Important: iterate over `allIds`, not over `fetchTweetsWithCache`'s return —
   that function drops tweets whose content fetch failed (`tweet-service.ts:145`),
   and an export must include them (their metadata is the irreplaceable part).
5. Return `NextResponse.json(doc, { headers: { "Content-Disposition": `attachment; filename="tweets-export-${yyyymmdd}.json"` } })`.
6. Wrap in try/catch matching the repo's error convention.

**Verify**: `pnpm typecheck` → exit 0; `pnpm check` → exit 0.

### Step 2: Runtime verification (needs `.env.local`)

With `pnpm dev`:

- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/tweets/export` → `401`
- `curl -s localhost:3000/api/tweets/export -H "x-api-secret: <value from .env.local — never write the value into any file or report>" | head -c 400`
  → JSON starting with `{"exportedAt":...` and a `tweets` array whose entries
  have `id`, `metadata`, `content`.
- Confirm the response includes a tweet count matching the live feed, and that
  the `Content-Disposition` header is present
  (`curl -sI ... | grep -i content-disposition`).

If `.env.local` is unavailable, skip and report.

### Step 3: Document it

In `USAGE.md`: find the future-features mention of export
(`grep -n -i "export" USAGE.md`) and replace/extend with a short "Backing up
your collection" section: the endpoint, the required `x-api-secret` header,
and one example curl (placeholder `$TWEET_API_SECRET`, never a real value).

**Verify**: `grep -n "api/tweets/export" USAGE.md` → at least 1 match.

## Test plan

If vitest (plan 003) is present: no route-level test is required for this plan
(route testing infra for `NextRequest` against modules that import the Upstash
client at module scope needs heavier mocking than this feature warrants —
explicitly deferred). The curl checks in Step 2 are the acceptance gate.

## Done criteria

- [ ] `app/api/tweets/export/route.ts` exists; GET returns 401 without secret, JSON document with it (Step 2, or noted unverifiable)
- [ ] Export iterates `allIds` (grep the file for `allIds.map`) — not the content-filtered array
- [ ] `pnpm typecheck`, `pnpm check`, `pnpm test` all exit 0
- [ ] USAGE.md documents the endpoint
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `lib/api-auth.ts` / `requireApiSecret` does not exist — plan 002 has not
  landed. Do NOT hand-roll a second auth implementation; report instead.
- The export response exceeds ~4 MB on the maintainer's real data (Vercel
  response-size limits loom) — report; the fix (streaming or pagination) is a
  design decision, not an improvisation.
- `fetchTweetsWithCache`'s signature or filtering behavior differs from the
  Current state excerpt.

## Maintenance notes

- This endpoint triggers content fetches for any uncached tweet (same as the
  home page) — on a huge collection it is slow but correct. If it becomes a
  problem, export metadata-only via `getTweetMetadatas` and make content
  optional (`?content=false`).
- Natural follow-ups, deliberately deferred: a UI download button (gated on a
  stored secret), an import endpoint to restore from an export, and scheduled
  exports to blob storage. The export document's shape is the contract an
  importer would consume — change it only additively.
- Reviewers: confirm the auth helper is reused (no second comparison
  implementation) and no secret value appears in code, docs, or logs.
