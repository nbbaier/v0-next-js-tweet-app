# Plan 006: Consolidate the realtime hook to one subscription (investigate first)

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- hooks/use-realtime-tweets.ts lib/realtime.ts components/filterable-tweet-feed.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition. (Note: plan 005 removes the
> `tweet.reorder` block from this hook — that exact diff is expected and fine.)

## Status

- **Priority**: P3
- **Effort**: M
- **Risk**: MED (library behavior must be confirmed before changing anything)
- **Depends on**: plans/003-verification-baseline.md (typecheck gate); coordinate with plans/005 (reorder removal touches the same file)
- **Category**: tech-debt / perf
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

`hooks/use-realtime-tweets.ts` calls `useRealtime()` **six times** — once per
event type (`tweet.added`, `tweet.removed`, `tweet.updated`, `tweet.reorder`,
`tweet.saved`, `tweet.seen`), each with `channels: ["tweets"]` and a
single-element `events` array. If each call opens its own SSE connection (the
likely behavior — confirm in Phase A), every visitor holds 6 concurrent
connections to `/api/realtime`, each a Vercel function invocation with
`maxDuration = 300`. That's 6× the function-hours and 6× the reconnection
churn for zero functional benefit. Additionally, connection state is derived
only from the `tweet.added` subscription (`:128`), and the returned
`reconnect()`/`disconnect()` functions are no-op console.log stubs
(`:152-161`) — dead API surface that misleads callers.

AGENTS.md:75 explains the pattern as a constraint of the old "v0.3.0 API";
the installed library is `@upstash/realtime@^1.0.3` (package.json:15), where
the `events` parameter is already an array — strongly suggesting one
subscription can carry all events now.

## Current state

- `hooks/use-realtime-tweets.ts` (163 lines) — the whole file is the target:
  - `:27-42` — `useRealtime<RealtimeEvents, "tweet.added">({ enabled, channels: ["tweets"], events: ["tweet.added"], onData: ... })`, captures `status` as `statusAdded`.
  - `:45-126` — five more structurally identical calls (removed, updated, reorder, saved, seen), statuses discarded.
  - Handler logic per event (must be preserved exactly):
    - added: prepend if new, replace if id exists (`:34-39`)
    - removed: filter by id (`:51`)
    - updated: shallow-merge `{ ...t, ...tweet }` by id (`:64-66`)
    - reorder: reorder by id list (`:78-83`) — plan 005 deletes this; skip if already gone
    - saved: set `saved` flag by `tweetId` (`:95-99`)
    - seen: set `seen` flag by `tweetId` (`:115-119`)
  - `:128` — `const isConnected = statusAdded === "connected";`
  - `:130-142` — status effect calling `onConnected`/`onDisconnected`/`onError`.
  - `:144-146` — `useEffect` resetting state from `initialTweets`.
  - `:152-161` — no-op `reconnect`/`disconnect` stubs.
- Consumer: `components/filterable-tweet-feed.tsx` — run
  `grep -n "useRealtimeTweets\|reconnect\|disconnect\|isConnected" components/*.tsx hooks/*.ts`
  to enumerate exactly which returned fields are consumed before changing the
  hook's return shape.
- `lib/realtime.ts` — schema and `RealtimeEvents` type (`InferRealtimeEvents`).
  Server publishes via `realtime.channel("tweets").emit(...)`
  (`lib/tweet-realtime.ts`).
- The library source is inspectable locally:
  `node_modules/@upstash/realtime/` (check `package.json` `exports`, the
  `./client` entry, and its `.d.ts` for the `useRealtime` options/return types).

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Lint      | `pnpm check`             | exit 0              |
| Dev server | `pnpm dev`              | :3000 (needs `.env.local`) |
| Tests     | `pnpm test`              | all pass (parser/cleanup suites unaffected) |

## Scope

**In scope**:
- `hooks/use-realtime-tweets.ts`
- `AGENTS.md` line 75 (the stale "separate hook per event type (v0.3.0 API)" note)
- `components/filterable-tweet-feed.tsx` ONLY if it calls the removed
  `reconnect`/`disconnect` stubs (adjust the call sites)

**Out of scope (do NOT touch)**:
- `lib/realtime.ts`, `lib/tweet-realtime.ts`, `app/api/realtime/route.ts` —
  server-side realtime is fine as-is.
- Event payload shapes / the schema — both ends depend on them.
- Optimistic-update logic inside `filterable-tweet-feed.tsx`.

## Git workflow

- Branch: `advisor/006-consolidate-realtime-hook`
- Commits: one for the investigation note (if Phase A says stop, commit nothing), one for the refactor
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Phase A — Investigate (no code changes)

#### Step A1: Read the library's client API

Read `node_modules/@upstash/realtime/package.json` (exports map) and the
type declarations for the `./client` entry. Answer in writing:

1. Does one `useRealtime` call with `events: ["tweet.added", "tweet.removed", ...]`
   (or an `events` omitted = all events?) deliver all matching events to
   `onData`? What does the `onData` payload look like — does it carry the
   event name (e.g. `data.event`) so a handler can switch on it?
2. Does each `useRealtime` call open its own `EventSource`/fetch-stream, or is
   there a shared connection manager (module-level singleton) that
   deduplicates by channel?
3. What does the hook return besides `status`? Is there a real
   `reconnect`-like capability?

#### Step A2: Empirically count connections

Run `pnpm dev`, open the app, and in browser devtools → Network, filter for
`realtime`. Count open streaming connections from one tab at `53981c5`'s
behavior (expected: 6 if no dedup, 1 if the library dedups).

**Decision gate**: 
- If the library already deduplicates connections AND the per-event hooks are
  merely cosmetic → the refactor is optional; reduce scope to: delete the
  no-op `reconnect`/`disconnect` stubs, derive status as today, update
  AGENTS.md. Report this.
- If `onData` cannot distinguish events in a multi-event subscription and
  there's no per-event handler map → STOP and report (refactor not cleanly
  possible on 1.0.3).
- Otherwise proceed to Phase B.

### Phase B — Refactor

#### Step B1: One subscription, one handler

Rewrite the six calls as a single `useRealtime` call subscribing to all
events on `channels: ["tweets"]`, dispatching in `onData` on the event name to
the same six (five, post-plan-005) state updates listed in Current state —
preserved verbatim. Use the actual API discovered in A1 (do not guess
generics; the existing file shows the typed pattern
`useRealtime<RealtimeEvents, "...">`).

`isConnected` now derives from the single subscription's `status`. Keep the
`onConnected`/`onDisconnected`/`onError` effect (`:130-142`) and the
`initialTweets` reset effect (`:144-146`) unchanged.

#### Step B2: Remove the dead stubs

Drop `reconnect` and `disconnect` from the return object **after** checking
consumers (grep from Current state). If `filterable-tweet-feed.tsx` references
them, remove those references too (they were no-ops; nothing changes
behaviorally). If the library exposes a real reconnect, you may wire it
through instead of deleting — only if it's a one-liner.

**Verify**: `pnpm typecheck` → exit 0; `pnpm check` → exit 0.

#### Step B3: Verify behavior end-to-end

With `pnpm dev` and two browser tabs:
1. Network tab shows exactly **1** open realtime stream per tab.
2. Add a tweet (with the API secret) in tab 1 → it appears in tab 2 without reload.
3. Toggle seen and saved in tab 1 → tab 2 reflects both.
4. Delete a tweet in tab 1 → it disappears in tab 2.

Update `AGENTS.md:75` to describe the consolidated hook.

**Verify**: all four behaviors observed; note each in your report.

## Test plan

No unit tests for the hook in this plan (no jsdom infra; deferred per plan
003's maintenance notes). The end-to-end checklist in B3 is the acceptance
test — report results explicitly. Existing `pnpm test` suites must stay green.

## Done criteria

- [ ] `grep -c "useRealtime(" hooks/use-realtime-tweets.ts` → 1 (Phase B) or documented decision to keep N (Phase A gate)
- [ ] `grep -n "Reconnect requested\|Disconnect requested" hooks/use-realtime-tweets.ts` → 0 matches
- [ ] `pnpm typecheck` and `pnpm check` exit 0
- [ ] B3 checklist all observed (or Phase A early-exit documented)
- [ ] AGENTS.md:75 note updated
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- Phase A finds that multi-event subscriptions can't dispatch per-event
  (decision gate above).
- Any B3 behavior fails after one debugging attempt — realtime regressions
  are worse than 6 connections; revert and report findings.
- `.env.local` is unavailable so neither A2 nor B3 can run — this plan cannot
  be verified headlessly; report instead of merging unverified.
- `filterable-tweet-feed.tsx` consumes `reconnect`/`disconnect` for actual
  control flow (not just dead imports).

## Maintenance notes

- If plan 005 hasn't landed when this runs, the reorder handler is the sixth
  event — fold its removal into B1 only if 005 is marked REJECTED; otherwise
  preserve it and let 005 delete it.
- Future event types should be added to the single dispatch switch, the zod
  schema (`lib/realtime.ts`), and a publisher (`lib/tweet-realtime.ts`) —
  all three, or you recreate the orphaned-event problem plan 005 fixed.
- Reviewers: scrutinize the `onData` dispatch typing — a mis-narrowed payload
  type can silently drop fields (e.g. `saved` vs `seen` payloads both being
  `{tweetId, boolean}` shapes).
