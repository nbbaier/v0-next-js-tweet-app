## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2024-05-24 - [React Memo on List Items]
**Learning:** In real-time lists where items are updated individually (e.g. via SSE events), the parent list re-renders frequently. Without `React.memo`, every child component re-renders even if its props are unchanged.
**Action:** Wrapped `TweetWithActions` in `React.memo`. Since `useRealtimeTweets` preserves object references for unchanged tweets and callbacks are stable, this effectively prevents unnecessary re-renders for the majority of the list during updates.
