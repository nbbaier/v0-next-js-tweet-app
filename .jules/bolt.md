## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2024-05-22 - [Optimized Tweet Re-renders]
**Learning:** `TweetWithActions` was re-rendering excessively when the parent feed updated (e.g., when toggling "seen" status on a sibling tweet), causing visible jank.
**Action:** Wrapped `TweetWithActions` in `React.memo` to ensure it only re-renders when its own props change. Verified with Playwright logs that irrelevant updates no longer trigger renders.
