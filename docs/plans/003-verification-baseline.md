# Plan 003: Establish a verification baseline — type-gated builds, vitest, and CI

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- next.config.mjs package.json lib/tweet-parser.ts lib/tweet-cleanup.ts`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW
- **Depends on**: none
- **Category**: tests / dx
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

This repo currently has **zero automated verification**: no tests, no test
runner, no CI (`.github` was deleted in commit `3d9f911`), and the production
build deliberately skips type checking (`next.config.mjs` sets
`typescript.ignoreBuildErrors: true`). Every other improvement plan in this
directory is riskier to execute than it should be because nothing catches
regressions. `pnpm exec tsc --noEmit` passes today at `53981c5`, so turning
type-gating back on costs nothing. The two highest-value test targets are pure
or near-pure logic: `lib/tweet-parser.ts` (input validation for every
submitted tweet) and `lib/tweet-cleanup.ts` (the logic that **deletes user
data** on a daily cron — currently changeable with no safety net).

## Current state

- `next.config.mjs` (entire file, 9 lines):
  ```js
  const nextConfig = {
    typescript: {
      ignoreBuildErrors: true,
    },
    images: {
      unoptimized: true,
    },
  };
  ```
- `package.json:5-10` scripts: `build`, `dev`, `start`, `check` (`ultracite check`), `fix` (`ultracite fix`). No `test`, no `typecheck`, no `lint`.
- No vitest/jest anywhere in `devDependencies`. No `*.test.ts` files exist.
- `lib/tweet-parser.ts` — two pure exported functions:
  - `parseTweetUrl(input: string): {id, url} | null` — matches
    `twitter.com/<user>/status/<digits>`, `x.com/...`, `mobile.twitter.com/...`
    (all case-insensitive, via regex on the *trimmed* input, substring match —
    query strings and `https://` prefixes are fine), or a raw all-digits string
    (`/^(\d+)$/`). Returns canonical url `https://twitter.com/i/status/<id>`.
  - `isValidTweetId(id: string): boolean` — `/^\d{15,19}$/`.
- `lib/tweet-cleanup.ts` — `cleanupOldTweets()` and `getExpiredTweets()`;
  both import `getTweetIdsFromStorage`, `getTweetMetadata`,
  `removeTweetFromStorage` from `./tweet-storage` (which talks to Upstash
  Redis — must be mocked). Deletion rule (`:58-62`): delete iff
  `metadata.submittedAt < now - 3 days && metadata.seen === true && metadata.saved !== true`.
  Errors per tweet are collected into `result.errors`, not thrown (`:77-86`).
- `tsconfig.json` paths: `"@/*": ["./*"]` — vitest needs the same alias.
- Repo conventions: TypeScript strict, Biome (Ultracite preset) with tabs and
  double quotes — run `pnpm fix` on new files. Package manager is pnpm.
- `pnpm-workspace.yaml` (committed) sets `minimumReleaseAge: 10080` (7 days):
  installing brand-new package versions can be refused; vitest stable releases
  are typically older than that.
- **CI build caveat**: `lib/redis.ts:3-12` throws at module load if
  `UPSTASH_KV_KV_REST_API_URL`/`UPSTASH_KV_KV_REST_API_TOKEN` are unset, and
  `app/page.tsx` (a server component) transitively imports it, so `next build`
  in CI needs dummy values for those env vars. The storage/cache layers catch
  network errors and return empty results, so a build against dummy values
  succeeds.

## Commands you will need

| Purpose   | Command                          | Expected on success |
|-----------|----------------------------------|---------------------|
| Install   | `pnpm install`                   | exit 0              |
| Add dev dep | `pnpm add -D vitest`           | exit 0              |
| Typecheck | `pnpm typecheck` (added in step 2) | exit 0            |
| Tests     | `pnpm test`     (added in step 2) | all pass           |
| Lint      | `pnpm check`                     | exit 0              |
| Build     | `pnpm build`                     | exit 0 (needs `.env.local` locally) |

## Scope

**In scope** (the only files you should modify/create):
- `next.config.mjs` (remove `typescript.ignoreBuildErrors`)
- `package.json` (scripts + vitest devDependency), `pnpm-lock.yaml`
- `vitest.config.ts` (create)
- `lib/tweet-parser.test.ts` (create)
- `lib/tweet-cleanup.test.ts` (create)
- `.github/workflows/ci.yml` (create)

**Out of scope** (do NOT touch):
- The implementation of `lib/tweet-parser.ts` and `lib/tweet-cleanup.ts` —
  these are **characterization tests**: they document behavior as-is. If a
  test reveals a behavior that looks like a bug, write the test to match
  current behavior and flag it in your report; do not fix it here.
  (Exception: plan 004 will refactor cleanup — if 004 already landed, test
  the bulk-fetch version it produced.)
- React components / hooks — component testing infra (jsdom, testing-library)
  is deliberately deferred; keep this plan to node-environment unit tests.
- `AGENTS.md` — plan 005 reconciles docs (including documenting these new scripts).

## Git workflow

- Branch: `advisor/003-verification-baseline`
- Commit per step; message style e.g. `test: add vitest with tweet-parser and cleanup characterization tests`, `ci: add lint/typecheck/test/build workflow`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Re-enable type-gated builds

Remove the `typescript: { ignoreBuildErrors: true }` block from
`next.config.mjs`, leaving the `images` block intact.

**Verify**: `pnpm exec tsc --noEmit` → exit 0 (it passes at plan time; if it
fails, see STOP conditions).
**Verify**: `pnpm build` → exit 0 (skip with a note if `.env.local` absent).

### Step 2: Add vitest and scripts

`pnpm add -D vitest`, then add to `package.json` scripts:

```json
"test": "vitest run",
"test:watch": "vitest",
"typecheck": "tsc --noEmit"
```

Create `vitest.config.ts`:

```ts
import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, ".") },
  },
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
  },
});
```

**Verify**: `pnpm test` → exit 0 with "no test files found" treated as
acceptable only until step 3 (`vitest run --passWithNoTests` if needed for the
intermediate check, but do not leave `--passWithNoTests` in the script).

### Step 3: Characterization tests for tweet-parser

Create `lib/tweet-parser.test.ts` with `import { describe, expect, it } from "vitest"`.
Cover at minimum:

- `parseTweetUrl`:
  - `https://twitter.com/user/status/1234567890123456789` → id extracted, url `https://twitter.com/i/status/1234567890123456789`
  - `https://x.com/user/status/1234567890123456789` → same id
  - `https://mobile.twitter.com/user/status/1234567890123456789` → same id
  - URL with query string `...?s=20` → still parses (substring regex)
  - uppercase host `https://X.com/...` → parses (case-insensitive flag)
  - raw ID `"1234567890123456789"` → parses
  - leading/trailing whitespace around a raw ID → parses (input is trimmed)
  - `"not a url"`, `""`, `https://example.com/status/123` (expect: document
    actual behavior — note `example.com/status/123` does NOT match any host
    pattern and the raw-ID pattern requires the *entire* string to be digits,
    so → null)
- `isValidTweetId`: 14 digits → false; 15 digits → true; 19 digits → true;
  20 digits → false; digits with letters → false; empty → false.

**Verify**: `pnpm test` → all pass.

### Step 4: Characterization tests for tweet-cleanup

Create `lib/tweet-cleanup.test.ts`. Mock the storage module:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/tweet-storage", () => ({
  getTweetIdsFromStorage: vi.fn(),
  getTweetMetadata: vi.fn(),
  getTweetMetadatas: vi.fn(),   // present so the mock survives plan 004's refactor
  removeTweetFromStorage: vi.fn(),
}));
```

(Import the mocked functions and the module under test *after* `vi.mock`;
use `vi.mocked(...)` for typing. Note `tweet-cleanup.ts` imports from
`"./tweet-storage"` — vitest resolves `@/lib/tweet-storage` to the same file
via the alias, but verify the mock is actually applied; if not, mock the
relative specifier `"./tweet-storage"` instead.)

Cases for `cleanupOldTweets()` (use `vi.useFakeTimers()` +
`vi.setSystemTime` or compute timestamps relative to `Date.now()`):

1. Tweet older than 3 days, `seen: true`, `saved` undefined → removed; counted
   in `deletedCount` and `deletedTweetIds`.
2. Tweet older than 3 days, `seen: true`, `saved: true` → NOT removed.
3. Tweet older than 3 days, unseen → NOT removed.
4. Tweet newer than 3 days, `seen: true` → NOT removed.
5. Metadata `null` for an ID → skipped, no removal, no error entry.
6. `removeTweetFromStorage` throws for one tweet → that tweet lands in
   `result.errors` with its id; other tweets still processed.
7. Empty storage → `{ deletedCount: 0, deletedTweetIds: [], errors: [] }`.

Add 2–3 analogous cases for `getExpiredTweets()` (returns only old+seen+unsaved,
with `ageInDays` populated).

**Verify**: `pnpm test` → all pass (expect ~16+ tests total across both files).
**Verify**: `pnpm check` → exit 0 (run `pnpm fix` first).

### Step 5: CI workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI
on:
  push:
    branches: [main]
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm check
      - run: pnpm typecheck
      - run: pnpm test
      - run: pnpm build
        env:
          UPSTASH_KV_KV_REST_API_URL: https://example.invalid
          UPSTASH_KV_KV_REST_API_TOKEN: ci-dummy-token
          TWEET_API_SECRET: ci-dummy-secret
```

Note: `pnpm/action-setup@v4` reads the pnpm version from `package.json`'s
`packageManager` field if present; this repo has none, so pin one:
`with: { version: 10 }` (or the major the maintainer uses).

**Verify locally** (CI itself can't run here): `pnpm check && pnpm typecheck && pnpm test` → all exit 0, and
`UPSTASH_KV_KV_REST_API_URL=https://example.invalid UPSTASH_KV_KV_REST_API_TOKEN=x TWEET_API_SECRET=x pnpm build`
→ exit 0 (this simulates the CI env-var setup; it overrides nothing if
`.env.local` exists — to truly simulate, you may temporarily rename
`.env.local`, run the build, and restore it; restore it either way).

## Test plan

This plan *is* the test plan. New files: `lib/tweet-parser.test.ts`
(~10 cases), `lib/tweet-cleanup.test.ts` (~9 cases), as specified in steps 3–4.

## Done criteria

- [ ] `grep -n "ignoreBuildErrors" next.config.mjs` → no matches
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test` exits 0 with ≥ 16 passing tests and no skipped placeholder
- [ ] `pnpm check` exits 0
- [ ] `.github/workflows/ci.yml` exists and includes check, typecheck, test, build jobs/steps
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- `tsc --noEmit` fails after removing `ignoreBuildErrors` (it passes at
  `53981c5`; a failure means the codebase drifted — do not "fix" type errors
  inside this plan).
- `pnpm add -D vitest` is refused by `minimumReleaseAge` or pulls a major
  you can't verify (report the version conflict).
- The vitest mock of `tweet-storage` doesn't intercept (cleanup tests hit
  real network / throw about Upstash env vars) after trying both the aliased
  and relative mock specifiers.
- `pnpm build` with dummy env vars fails for reasons other than env (e.g. a
  prerender error) — report the exact error; the CI build step may need
  `--experimental-build-mode` adjustments only the maintainer should approve.

## Maintenance notes

- Plan 004 (cleanup N+1 refactor) must keep `lib/tweet-cleanup.test.ts` green —
  these tests are its safety net; the mock already exports `getTweetMetadatas`
  for that purpose.
- Plan 002, if it lands after this, should add `lib/api-auth.test.ts` using
  these files as the structural pattern.
- Deferred: component/hook tests (needs jsdom environment + testing-library);
  E2E (Playwright); coverage thresholds. Add once unit testing is habitual.
- Reviewers: check the CI workflow's pnpm version pin matches local, and that
  dummy env vars never leak into deployed environments (they're CI-only).
