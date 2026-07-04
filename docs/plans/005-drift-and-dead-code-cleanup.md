# Plan 005: Remove dead code and reconcile docs with reality

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- lib/tweet-cache.ts lib/tweet-storage.ts lib/tweet-config.ts lib/realtime.ts lib/tweet-service.ts hooks/use-realtime-tweets.ts package.json AGENTS.md README.md MIGRATION-PLAN.md`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: M (many small independent items)
- **Risk**: LOW
- **Depends on**: plans/003-verification-baseline.md preferred first (typecheck+tests gate each item); item 5c conflicts with plan 006 — see Scope.
- **Category**: tech-debt / docs
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

The repo carries visible drift that misleads both humans and AI agents:
AGENTS.md documents commands that don't exist (`pnpm lint`) and claims the
build type-checks (it doesn't, until plan 003); README still says Radix UI a
full migration after Base UI landed; MIGRATION-PLAN.md describes finished work
as pending; and the lib layer contains dead code — an unreachable
dev-tweets fallback, a realtime event with a subscriber but no publisher,
commented-out functions, a duplicate Redis client, and a mislabeled `savedAt`
field. None of these is individually serious; together they make every future
change (human or agent) start from wrong premises.

## Current state

Each item below was verified at `53981c5`:

1. **Duplicate Redis client** — `lib/redis.ts:14-17` exports the singleton;
   `lib/tweet-cache.ts:8-22` re-validates the same env vars and constructs its
   own `new Redis({...})` instead of importing the singleton.
2. **Commented-out dead code** — `lib/tweet-cache.ts:26-43`
   (`getCachedTweet`), `lib/tweet-storage.ts:375-386` (`tweetExistsInStorage`),
   `lib/tweet-storage.ts:392-400` (`getTweetCount`). All fully commented, no
   callers.
3. **`tweet.reorder` event: subscriber with no publisher** —
   `lib/realtime.ts:23-25` defines the event in the schema;
   `hooks/use-realtime-tweets.ts:71-86` subscribes; `lib/tweet-realtime.ts`
   contains NO `publishTweetReorder` (verified: publishers exist only for
   added/updated/removed/seen/saved). AGENTS.md:73 documents the event.
4. **Unreachable dev-tweets fallback** — `lib/tweet-config.ts:23-27` returns
   `DEVELOPMENT_TWEET_IDS` in a `catch`, but the only call inside the `try`
   is `getTweetIdsFromStorage()`, which itself catches all errors and returns
   `[]` (`lib/tweet-storage.ts:153-156`). The fallback can never trigger.
5. **`savedAt` mislabel** — `lib/tweet-service.ts:92` and `:106` set
   `savedAt: metadata.submittedAt`. The field name says "when saved", the
   value is "when submitted".
6. **`postcss-load-config` in prod dependencies** — `package.json:24`. The
   only reference in the repo is a JSDoc type annotation in
   `postcss.config.mjs:1`; nothing imports it at runtime.
7. **Doc drift**:
   - `AGENTS.md:10` documents `pnpm lint` (doesn't exist; real commands:
     `pnpm check` / `pnpm fix`; plan 003 adds `typecheck` and `test`).
   - `AGENTS.md:8` claims "`pnpm build` = Type check + Next.js build" (false
     until plan 003 lands; true after).
   - `AGENTS.md:15` versions stale (says Next 16.0.0 / React 19.2.0 / TS 5.x;
     installed: next 16.2.5+, react 19.2.6, typescript 6.0.3).
   - `AGENTS.md:73` documents `tweet.reorder` (remove together with item 3);
     `AGENTS.md:75` says "Client uses separate `useRealtime()` hook per event
     type (v0.3.0 API)" — stale; installed `@upstash/realtime` is `^1.0.3`
     (plan 006 may change the hook; phrase the doc to match whatever is true
     when you edit).
   - `README.md:21` says "Radix UI"; the codebase migrated to Base UI
     (commits `25b77cd`…`848738a`; `package.json:13` has `@base-ui/react`).
   - `MIGRATION-PLAN.md` (repo root) describes the Radix→Base migration as
     pending; `grep -rn "asChild" components/ --include="*.tsx"` → verify 0
     matches in app components, then the plan is complete.
8. **Tracked junk files** — check with `git ls-files | grep -E "\.DS_Store|tsbuildinfo"`;
   `.DS_Store` files exist in `app/`, `components/`, `lib/` and
   `tsconfig.tsbuildinfo` (300 KB) sits at root. `.gitignore` covers
   `*.tsbuildinfo` but NOT `.DS_Store`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck` (or `pnpm exec tsc --noEmit` if plan 003 not landed) | exit 0 |
| Tests     | `pnpm test` (if plan 003 landed) | all pass    |
| Lint      | `pnpm check`             | exit 0              |
| Build     | `pnpm build`             | exit 0 (needs `.env.local`) |

## Scope

**In scope**:
- `lib/tweet-cache.ts`, `lib/tweet-storage.ts`, `lib/tweet-config.ts`,
  `lib/realtime.ts`, `lib/tweet-service.ts`, `hooks/use-realtime-tweets.ts`
  (the reorder subscriber block ONLY)
- `package.json`, `pnpm-lock.yaml` (postcss-load-config move)
- `AGENTS.md`, `README.md`, `MIGRATION-PLAN.md`, `.gitignore`
- Untracking junk files if tracked (`git rm --cached`)

**Out of scope (do NOT touch)**:
- `lib/development-tweets.ts` and `components/tweet-feed.tsx` — tweet-feed.tsx
  imports the dev IDs for an opt-in toggle. Whether tweet-feed.tsx itself is
  still used is a separate question: run
  `grep -rn "tweet-feed\b\|TweetFeed\b" app/ components/ --include="*.tsx" | grep -v tweet-feed-header | grep -v filterable`
  and **report** what you find; do not delete components in this plan.
- `hooks/use-realtime-tweets.ts` beyond removing the reorder block — plan 006
  restructures this hook. **If plan 006 is already DONE, check whether the
  reorder subscription still exists before changing anything here.**
- `pnpm-workspace.yaml` — has an uncommitted local change in the maintainer's
  tree; also leave the `sharp: false` rule alone (harmless, and sharp may
  appear as a transitive optional dep).
- `next.config.mjs`, CI files — plan 003's territory.

## Git workflow

- Branch: `advisor/005-drift-and-dead-code-cleanup`
- Commit per item or per logical group (`chore:`/`docs:` prefixes match repo history)
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Single Redis client

In `lib/tweet-cache.ts`: delete lines 8-22 (env validation + local `new Redis`)
and replace with `import { redis } from "./redis";`. Keep the `Redis` type
import only if still needed (it won't be). Also delete the commented-out
`getCachedTweet` block (`:26-43`).

**Verify**: `pnpm exec tsc --noEmit` → exit 0; `grep -n "new Redis" lib/tweet-cache.ts` → 0 matches.

### Step 2: Delete commented-out storage functions

Remove `lib/tweet-storage.ts:370-400` (the commented `tweetExistsInStorage`
and `getTweetCount` blocks including their JSDoc headers).

**Verify**: `grep -cn "^// export async function" lib/tweet-storage.ts` → 0.

### Step 3: Remove the orphaned `tweet.reorder` event

- `lib/realtime.ts`: delete the `reorder:` entry (`:23-25`) from the schema.
- `hooks/use-realtime-tweets.ts`: delete the "Tweet reorder handler" block (`:71-86`).
- `AGENTS.md:73`: delete the `tweet.reorder` row from the events table.

**Verify**: `grep -rn "reorder" lib/ hooks/ components/ app/ AGENTS.md` → 0 matches; `pnpm exec tsc --noEmit` → exit 0.

### Step 4: Remove the unreachable dev-tweets fallback

In `lib/tweet-config.ts`: remove the `DEVELOPMENT_TWEET_IDS` import and the
catch-fallback so the function is an honest pass-through (keep the catch if
you keep a log line, but return `[]`, matching what actually happens today).
Add one comment noting that storage already swallows errors. Do NOT delete
`lib/development-tweets.ts` (still imported by `components/tweet-feed.tsx`).

**Verify**: `grep -n "DEVELOPMENT_TWEET_IDS" lib/tweet-config.ts` → 0 matches; `pnpm exec tsc --noEmit` → exit 0.

### Step 5: Fix the `savedAt` mislabel

First check usage: `grep -rn "savedAt" --include="*.ts" --include="*.tsx" app/ components/ hooks/ lib/`.
At plan time the only occurrences are the type definition
(`lib/tweet-service.ts:14`), and the two assignments (`:92`, `:106`).
If nothing else consumes it: **delete the `savedAt` field** from the
`TweetData` interface and both assignments (a field whose value is a lie is
worse than no field). If a consumer exists (drift since plan time), STOP.

**Verify**: `grep -rn "savedAt" app/ components/ hooks/ lib/` → 0 matches; `pnpm exec tsc --noEmit` → exit 0.

### Step 6: Move `postcss-load-config` to devDependencies

Move the entry from `dependencies` to `devDependencies` in `package.json`
(keep it: `postcss.config.mjs:1` uses its type in JSDoc), run `pnpm install`.

**Verify**: `pnpm build` → exit 0 (needs `.env.local`; skip with a note if absent, rely on `pnpm exec tsc --noEmit` + `pnpm dev` smoke).

### Step 7: Reconcile docs

- `AGENTS.md` commands table: replace `pnpm lint` row with `pnpm check`
  (Biome/Ultracite lint) and `pnpm fix`; if plan 003 landed, add `pnpm test`
  and `pnpm typecheck` rows and keep the build description "Type check +
  Next.js build"; if 003 has NOT landed, change the build row to "Next.js
  build (type checking currently disabled via next.config.mjs)".
- `AGENTS.md:15`: loosen versions to "Next.js 16.x, React 19.x, TypeScript 6.x".
- `AGENTS.md:75`: update or remove the v0.3.0 note to match the current hook.
- `README.md:21`: "Radix UI" → "Base UI".
- `MIGRATION-PLAN.md`: run `grep -rn "asChild" components/ --include="*.tsx"`;
  if 0 matches, replace the file's status section with a one-line "Status:
  COMPLETE (migration merged in PR #43/#44)" header at top, or delete the file
  (preferred — git history preserves it). Deleting is authorized.

**Verify**: `grep -n "pnpm lint" AGENTS.md` → 0 matches; `grep -n "Radix" README.md` → 0 matches.

### Step 8: Untrack junk files

```
git ls-files | grep -E "\.DS_Store|tsconfig\.tsbuildinfo"
```
For each tracked match: `git rm --cached <file>`. Add `.DS_Store` to
`.gitignore` (one line, anywhere in the file). Do not delete the files from
disk.

**Verify**: re-run the `git ls-files` grep → 0 matches.

## Test plan

If plan 003 landed: `pnpm test` must stay green after every step (steps 1–5
touch lib code that the cleanup/parser tests import indirectly). No new tests
required — every change is deletion or docs.

## Done criteria

- [ ] All step-level greps return their expected counts
- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm check` exits 0
- [ ] `pnpm test` exits 0 (if tests exist)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] Report includes the tweet-feed.tsx usage findings (Out-of-scope note)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `savedAt` has a consumer (step 5).
- Removing the schema's `reorder` entry breaks types in a file not listed here
  (would indicate an unseen subscriber).
- Plan 006 landed first and `hooks/use-realtime-tweets.ts` no longer matches
  the step-3 excerpt — re-check whether reorder still exists; if the hook was
  rewritten without it, skip step 3's hook edit.
- `pnpm install` after the dependency move changes anything beyond
  `postcss-load-config`'s placement in the lockfile.

## Maintenance notes

- AGENTS.md is consumed by AI agents (CLAUDE.md points at it) — wrong commands
  there directly cause failed agent runs; keep it in sync when scripts change.
- The dev-tweets toggle in `components/tweet-feed.tsx` and the possibly-unused
  component itself are a follow-up decision for the maintainer (report from
  the Out-of-scope check feeds it).
- Reviewers: step 5 (savedAt removal) is the only change with any behavioral
  surface — confirm the field truly had no consumer in the diff.
