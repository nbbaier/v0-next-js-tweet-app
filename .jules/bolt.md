## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2025-05-23 - [React Memo for Tweet Items]
**Learning:** In a real-time feed, any update causes the parent list to re-render. Since `TweetWithActions` is expensive (contains `react-tweet`) and receives a new array reference for `submittedBy` on every parent render, strict reference equality caused unnecessary re-renders of all items.
**Action:** Wrapped `TweetWithActions` in `React.memo` with a custom comparison function that checks deep equality for `submittedBy` array content. This prevents re-rendering of unchanged tweets when other tweets update or the list is resorted.
