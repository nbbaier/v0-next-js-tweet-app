# Plan 004: Eliminate the N+1 Redis round-trips in tweet cleanup

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- lib/tweet-cleanup.ts lib/tweet-storage.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P2
- **Effort**: S
- **Risk**: LOW (logic is characterization-tested by plan 003 before this runs)
- **Depends on**: plans/003-verification-baseline.md (provides the tests that protect this refactor)
- **Category**: perf
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

`cleanupOldTweets()` and `getExpiredTweets()` both loop over every stored tweet
ID and call `getTweetMetadata(tweetId)` one at a time — one Upstash REST
round-trip per tweet (~50–100 ms each). With a few hundred tweets the daily
cron spends tens of seconds doing serial network calls, pushing toward the
route's execution limits as the collection grows. A bulk variant,
`getTweetMetadatas(tweetIds)` (single `mget`), **already exists** in
`lib/tweet-storage.ts:237-296` and is used by the page's fetch path. This plan
switches cleanup to it: N+1 → 1 read call (plus one delete call per actually
expired tweet).

## Current state

- `lib/tweet-cleanup.ts:48-50` — the N+1 in `cleanupOldTweets()`:
  ```ts
  for (const tweetId of tweetIds) {
    try {
      const metadata = await getTweetMetadata(tweetId);
  ```
  Deletion rule (`:58-62`): `metadata.submittedAt < cutoffTime && metadata.seen === true && metadata.saved !== true`.
  Per-tweet failures are collected into `result.errors` (`:77-86`), never thrown.
  `null` metadata → `console.warn` + `continue` (`:52-55`).
- `lib/tweet-cleanup.ts:118-119` — same N+1 in `getExpiredTweets()`.
- `lib/tweet-storage.ts:237-296` — `getTweetMetadatas(tweetIds: string[]): Promise<(TweetMetadata | null)[]>`:
  returns results **positionally aligned** with the input array, normalizes
  legacy entries (and writes migrations back), returns all-nulls array on a
  bulk error. Empty input → `[]`.
- `lib/tweet-cleanup.ts:7-11` — current imports: `getTweetIdsFromStorage`,
  `getTweetMetadata`, `removeTweetFromStorage` from `"./tweet-storage"`.
- Tests (from plan 003): `lib/tweet-cleanup.test.ts` mocks the storage module
  and already stubs `getTweetMetadatas` for this refactor.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm typecheck`         | exit 0              |
| Tests     | `pnpm test`              | all pass            |
| Lint      | `pnpm check`             | exit 0              |

## Scope

**In scope** (the only files you should modify):
- `lib/tweet-cleanup.ts`
- `lib/tweet-cleanup.test.ts` (update mocks/cases to the bulk call)

**Out of scope** (do NOT touch):
- `lib/tweet-storage.ts` — `getTweetMetadatas` is used as-is. In particular,
  do not batch `removeTweetFromStorage` (each removal also publishes a
  realtime event; batching changes event semantics).
- `app/api/tweets/cleanup/route.ts` — the route's contract is unchanged.
- The deletion rule itself (3-day constant, seen/saved conditions) — plan 007's
  sibling ideas (configurable retention) are explicitly out of scope here.

## Git workflow

- Branch: `advisor/004-cleanup-bulk-metadata`
- One commit, e.g. `perf: bulk-fetch metadata in tweet cleanup to remove N+1`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Refactor `cleanupOldTweets()`

Replace the per-tweet `getTweetMetadata` call with one upfront bulk fetch:

```ts
const metadatas = await getTweetMetadatas(tweetIds);

for (let i = 0; i < tweetIds.length; i++) {
  const tweetId = tweetIds[i];
  const metadata = metadatas[i];
  try {
    if (!metadata) {
      console.warn(`[Cleanup] No metadata found for tweet ${tweetId}`);
      continue;
    }
    // ... existing rule and removeTweetFromStorage call, unchanged
  } catch (error) {
    // ... existing per-tweet error collection, unchanged
  }
}
```

Update the import at `:7-11` (`getTweetMetadata` → `getTweetMetadatas`; keep
the others). Preserve all existing log lines and the `CleanupResult` shape
exactly — the route spreads it into the response.

**Verify**: `pnpm typecheck` → exit 0.

### Step 2: Refactor `getExpiredTweets()`

Same transformation for the loop at `:118-135`: one `getTweetMetadatas` call,
then a synchronous filter/map preserving the returned object shape
(`{ id, submittedAt, ageInDays, seen }`).

**Verify**: `pnpm typecheck` → exit 0.
**Verify**: `grep -n "getTweetMetadata(" lib/tweet-cleanup.ts` → no matches
(only `getTweetMetadatas(` remains).

### Step 3: Update tests

In `lib/tweet-cleanup.test.ts`, point the metadata stubs at
`getTweetMetadatas` (resolve a positionally aligned array) instead of
per-id `getTweetMetadata` stubs. All seven behavioral cases from plan 003 must
still pass unchanged — they describe behavior, not implementation. Add one new
case: bulk fetch returns all `null` (the storage layer's bulk-error fallback)
→ no deletions, no error entries, warning per tweet.

**Verify**: `pnpm test` → all pass. `pnpm check` → exit 0.

## Test plan

Covered in Step 3 — the plan-003 characterization suite is the regression net;
one new case for the bulk-error fallback.

## Done criteria

- [ ] `grep -n "getTweetMetadata(" lib/tweet-cleanup.ts` → 0 matches
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0; all prior cleanup cases pass plus the new bulk-error case
- [ ] `pnpm check` exits 0
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `lib/tweet-cleanup.test.ts` does not exist (plan 003 hasn't landed) — this
  plan depends on it; do not refactor untested deletion logic.
- `getTweetMetadatas`'s signature or positional-alignment contract in
  `lib/tweet-storage.ts:237-296` differs from the excerpt above.
- Any pre-existing test fails in a way that requires changing the *behavioral
  expectation* (not just the mock plumbing).

## Maintenance notes

- If the collection grows past ~10k tweets, a single `mget` of every key may
  hit Upstash request-size limits — chunk the bulk fetch (e.g. 500 IDs per
  `mget`) at that point.
- `removeTweetFromStorage` is still one call per expired tweet (4 Redis ops +
  a realtime publish each). Fine at current scale; revisit only if cleanup
  routinely deletes hundreds per run.
- Reviewers: confirm log output and `CleanupResult` shape are byte-compatible —
  the cron's observability relies on those logs.
