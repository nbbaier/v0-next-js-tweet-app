# Plan 002: Make every mutating API route require the secret, timing-safely, with validated bodies

> **Executor instructions**: Follow this plan step by step. Run every
> verification command and confirm the expected result before moving to the
> next step. If anything in the "STOP conditions" section occurs, stop and
> report — do not improvise. When done, update the status row for this plan
> in `plans/README.md` — unless a reviewer dispatched you and told you they
> maintain the index.
>
> **Drift check (run first)**: `git diff --stat 53981c5..HEAD -- app/api lib/tweet-parser.ts components/filterable-tweet-feed.tsx components/tweet-with-actions.tsx components/tweet-submit-form.tsx`
> If any in-scope file changed since this plan was written, compare the
> "Current state" excerpts against the live code before proceeding; on a
> mismatch, treat it as a STOP condition.

## Status

- **Priority**: P1
- **Effort**: M
- **Risk**: LOW–MED (one deliberate behavior change: anonymous visitors can no longer toggle seen/saved)
- **Depends on**: none (003's tests strengthen verification if already landed)
- **Category**: security
- **Planned at**: commit `53981c5`, 2026-06-11

## Why this matters

Auth across the four API routes is inconsistent and has two real holes:

1. **PATCH `/api/tweets/[id]` requires no secret at all.** Anyone on the
   internet can set `seen`/`saved` on any tweet. Because the daily Vercel cron
   (`vercel.json` → `/api/tweets/cleanup`) deletes tweets that are
   `seen === true`, older than 3 days, and not `saved`, an anonymous attacker
   can mark every tweet seen (and un-save saved ones) and cause **mass deletion
   of the collection within 3 days** — a data-loss vector with no credentials.
2. **GET `/api/tweets` fails open**: `if (apiSecret && authHeader !== apiSecret)`
   means a deployment with `TWEET_API_SECRET` unset serves all tweet IDs
   unauthenticated, while POST/DELETE fail closed (500) in the same situation.

Additionally, secret comparisons use plain `!==` (timing side-channel), POST
takes the secret in the JSON body while DELETE takes an `x-api-secret` header
(two conventions), and no request body is schema-validated even though `zod`
is already a dependency (`package.json:29`). This plan centralizes auth in one
timing-safe helper, makes all routes fail closed, requires the secret on
PATCH, and validates bodies with zod.

**Product decision already made (do not relitigate):** this is a personal app;
everyone who legitimately toggles seen/saved already has the shared secret
stored in the browser (`localStorage["tweet_api_secret"]`, managed by
`components/api-secret-dialog.tsx`). Requiring the secret on PATCH is the
intended behavior change. The client must send it (Step 4).

## Current state

Files and their roles:

- `app/api/tweets/route.ts` — POST (add tweet) + GET (list IDs).
  - POST `:22-35`: fails closed if env missing, then `if (!secret || secret !== apiSecret)` — secret read from **JSON body** (`:19`).
  - POST `:18-19`: `const { url, secret, submittedBy } = body` — no validation of `submittedBy` (type/length unchecked, flows into Redis and realtime payloads).
  - GET `:84-92`:
    ```ts
    const apiSecret = process.env.TWEET_API_SECRET;
    const authHeader = request.headers.get("x-api-secret");
    if (apiSecret && authHeader !== apiSecret) {   // <-- fails OPEN when env unset
    ```
- `app/api/tweets/[id]/route.ts` — DELETE + PATCH.
  - DELETE `:28-42`: fails closed, header `x-api-secret`, plain `!==`.
  - PATCH `:80-148`: **no auth check whatsoever**; body parsed at `:96-97` (`const { seen, saved } = body`), validated only as "at least one boolean" (`:99`).
- `app/api/tweets/cleanup/route.ts` — GET + DELETE cleanup.
  - `isAuthorized()` `:15-32`: accepts `Bearer ${CRON_SECRET}` (Vercel cron) or `x-api-secret`; both plain `===`. Keep the dual-mode logic, make comparisons timing-safe.
- Client call sites (all must keep working):
  - `components/tweet-submit-form.tsx:108-115` — POST with `secret` in JSON body.
  - `components/filterable-tweet-feed.tsx:163-167` — PATCH `{seen}` with **no secret header**.
  - `components/filterable-tweet-feed.tsx:255-259` — PATCH `{saved}` with **no secret header**.
  - `components/filterable-tweet-feed.tsx:190` and `:210-213` — DELETE reads `localStorage.getItem("tweet_api_secret")` and sends `x-api-secret`.
  - `components/tweet-with-actions.tsx:83` — also reads the stored secret for its delete path. Run `grep -n 'fetch(`/api/tweets' components/*.tsx` to enumerate every call site before editing; update any PATCH call you find, not just the two listed.
- Repo conventions: API responses are `{ success: boolean, ... }` on success and
  `{ error: string }` with proper status on failure (see any route above —
  match it). TypeScript strict; Biome formatting via `pnpm fix`.

## Commands you will need

| Purpose   | Command                  | Expected on success |
|-----------|--------------------------|---------------------|
| Typecheck | `pnpm exec tsc --noEmit` | exit 0              |
| Lint/format | `pnpm check` (check) / `pnpm fix` (write) | exit 0 after fix |
| Dev server (manual verification) | `pnpm dev` | serves on :3000 (needs `.env.local`) |
| Tests (only if plan 003 already landed) | `pnpm test` | all pass |

## Scope

**In scope** (the only files you should modify/create):
- `lib/api-auth.ts` (create)
- `app/api/tweets/route.ts`
- `app/api/tweets/[id]/route.ts`
- `app/api/tweets/cleanup/route.ts`
- `components/filterable-tweet-feed.tsx` (add secret header to the two PATCH calls only)
- `components/tweet-with-actions.tsx` (only if it contains a PATCH call site)
- `lib/api-auth.test.ts` (create, only if vitest is already set up by plan 003)

**Out of scope** (do NOT touch):
- `app/api/realtime/route.ts` — the SSE feed is deliberately public (the home
  page itself is public); do not add auth there.
- The localStorage storage of the secret itself — known, accepted trade-off.
- `lib/tweet-storage.ts`, `lib/tweet-service.ts` — no storage changes here.
- Response shapes of existing successful requests — clients depend on them.

## Git workflow

- Branch: `advisor/002-harden-api-auth`
- Commit per step; message style: conventional-ish, e.g. `fix: require API secret on PATCH and fail closed on GET`
- Do NOT push or open a PR unless the operator instructed it.

## Steps

### Step 1: Create the shared auth helper

Create `lib/api-auth.ts`:

```ts
import { createHash, timingSafeEqual } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";

/**
 * Timing-safe string comparison. Hashing first equalizes lengths so
 * timingSafeEqual never throws and length is not observable.
 */
export function secretsMatch(provided: string, expected: string): boolean {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * Validates the request's API secret (x-api-secret header, with optional
 * fallback value e.g. from a request body). Fails closed when the env var
 * is missing. Returns null when authorized, otherwise the error response.
 */
export function requireApiSecret(
  request: NextRequest,
  bodySecret?: unknown
): NextResponse | null {
  const apiSecret = process.env.TWEET_API_SECRET;
  if (!apiSecret) {
    return NextResponse.json(
      { error: "API secret not configured on server" },
      { status: 500 }
    );
  }
  const provided =
    request.headers.get("x-api-secret") ??
    (typeof bodySecret === "string" ? bodySecret : null);
  if (!provided || !secretsMatch(provided, apiSecret)) {
    return NextResponse.json(
      { error: "Invalid or missing API secret" },
      { status: 401 }
    );
  }
  return null;
}
```

**Verify**: `pnpm exec tsc --noEmit` → exit 0.

### Step 2: Apply the helper to all four routes

- `app/api/tweets/route.ts` POST: replace lines 21-35 with
  `const authError = requireApiSecret(request, body.secret); if (authError) return authError;`
  (keep reading `body` first; the body still carries `secret` for back-compat
  with the existing submit form).
- `app/api/tweets/route.ts` GET: replace the fail-open block (`:83-92`) with
  `const authError = requireApiSecret(request); if (authError) return authError;`
  GET now fails closed — this is intended (the endpoint is documented as
  testing/debugging only; the public page does not use it).
- `app/api/tweets/[id]/route.ts` DELETE: replace lines 27-42 with the helper.
- `app/api/tweets/[id]/route.ts` PATCH: add the helper call immediately after
  the tweet-ID validation (after `:93`), passing `body.secret` as fallback:
  parse the body first, then auth, then validate fields.
- `app/api/tweets/cleanup/route.ts`: rewrite `isAuthorized()` to use
  `secretsMatch` for both the `Bearer ${CRON_SECRET}` comparison (compare the
  full header string against the full expected string) and the `x-api-secret`
  comparison. Keep the dual cron/API acceptance and the existing
  return-boolean shape.

**Verify**: `pnpm exec tsc --noEmit` → exit 0.
**Verify**: `grep -rn "secret !== apiSecret\|authHeader !== apiSecret\|=== apiSecret\|=== \`Bearer" app/api/` → no matches.

### Step 3: Validate request bodies with zod

In `app/api/tweets/route.ts`, define at module level:

```ts
import { z } from "zod";

const postBodySchema = z.object({
  url: z.string().min(1).max(500),
  secret: z.string().optional(),
  submittedBy: z.string().trim().max(50).optional(),
});
```

Parse with `postBodySchema.safeParse(await request.json())`; on failure return
`{ error: "Invalid request body" }` with status 400. Keep the existing
`parseTweetUrl` call as the URL semantic check (zod only guards shape/size).

In `app/api/tweets/[id]/route.ts` PATCH, similarly:

```ts
const patchBodySchema = z
  .object({
    seen: z.boolean().optional(),
    saved: z.boolean().optional(),
    secret: z.string().optional(),
  })
  .refine((b) => typeof b.seen === "boolean" || typeof b.saved === "boolean", {
    message: "Must provide 'seen' (boolean) or 'saved' (boolean).",
  });
```

This preserves the existing 400 semantics (`:99-106`). Note: zod v4 is
installed (`zod@^4.4.3`) — `z.string().trim()` and `.refine` work as in v3.

**Verify**: `pnpm exec tsc --noEmit` → exit 0.

### Step 4: Send the secret from the client PATCH calls

In `components/filterable-tweet-feed.tsx`, both PATCH fetches (`:163-167` seen,
`:255-259` saved) must include the stored secret. The file already shows the
pattern at the DELETE site (`:190`, `:210-213`). Apply the same:

```ts
const storedSecret =
  typeof window !== "undefined"
    ? localStorage.getItem("tweet_api_secret")
    : null;
const response = await fetch(`/api/tweets/${tweetId}`, {
  method: "PATCH",
  headers: {
    "Content-Type": "application/json",
    ...(storedSecret ? { "x-api-secret": storedSecret } : {}),
  },
  body: JSON.stringify({ seen: !currentSeenStatus }),
});
```

The existing catch blocks already roll back the optimistic update and surface
the server's `error` message on 401 — keep them. Run
``grep -n 'fetch(`/api/tweets' components/*.tsx`` and apply the same header to
any other PATCH call site (check `components/tweet-with-actions.tsx`).

**Verify**: `pnpm exec tsc --noEmit` → exit 0, `pnpm check` → exit 0 (run `pnpm fix` first if needed).

### Step 5: Manual runtime verification (requires `.env.local`)

Start `pnpm dev`, then:

- `curl -s -o /dev/null -w "%{http_code}" -X PATCH localhost:3000/api/tweets/1234567890123456789 -H 'Content-Type: application/json' -d '{"seen":true}'` → `401`
- Same request plus `-H "x-api-secret: $TWEET_API_SECRET"` (value from `.env.local` — never paste the value into any file or report) → `404` (valid-format unknown ID) — proves auth passes and lookup runs.
- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/tweets` → `401`.
- In the browser with the secret saved via the key dialog: toggling seen/saved still works.

If `.env.local` is unavailable in your environment, skip this step and say so
in your report.

## Test plan

Only if plan 003 (vitest) has already landed: create `lib/api-auth.test.ts`
covering `secretsMatch` (equal strings → true; different same-length → false;
different lengths → false, no throw) and `requireApiSecret` behavior with env
set/unset (use `vi.stubEnv("TWEET_API_SECRET", ...)`; construct a
`NextRequest` via `new NextRequest("http://test", { headers: ... })`). Model
structure after the tests added in plan 003. Otherwise note "tests deferred to
plan 003" in your report.

## Done criteria

- [ ] `pnpm exec tsc --noEmit` exits 0
- [ ] `pnpm check` exits 0
- [ ] `grep -rn "!== apiSecret" app/` → no matches
- [ ] `grep -n "requireApiSecret\|secretsMatch" app/api/tweets/route.ts app/api/tweets/\[id\]/route.ts app/api/tweets/cleanup/route.ts` → all three files match
- [ ] PATCH without secret returns 401 (Step 5, or noted as unverifiable)
- [ ] No files outside the in-scope list modified (`git status`)
- [ ] `plans/README.md` status row updated

## STOP conditions

Stop and report back (do not improvise) if:

- You find a PATCH/POST caller that has no access to the stored secret
  (e.g. an automated seen-marking path that fires for anonymous visitors —
  search for callers of `/api/tweets/` with method PATCH outside the listed
  components). That would mean requiring auth on PATCH breaks intended UX,
  and the maintainer must choose between this plan and that feature.
- `node:crypto` imports fail at build time (would mean a route is being
  compiled for the Edge runtime; none declare `runtime = "edge"` today).
- The code at the cited lines doesn't match the excerpts above.

## Maintenance notes

- Reviewers should scrutinize: the cleanup route still accepting Vercel cron's
  `Authorization: Bearer` header (deployment breaks silently if this is lost),
  and that POST still honors the body `secret` (the submit form depends on it).
- Future work that interacts: plan 007 (export endpoint) should reuse
  `requireApiSecret`. If the app ever adds Edge runtime routes, `node:crypto`
  must be replaced with Web Crypto.
- Deferred deliberately: rate limiting on auth failures; moving the client
  secret out of localStorage (accepted risk for a personal app).
