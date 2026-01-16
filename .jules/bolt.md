## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2026-01-15 - [React.memo for Heavy Feed Items]
**Learning:** `TweetWithActions` wraps `react-tweet`'s `Tweet` component which is expensive to render. Unmemoized re-renders (caused by parent state updates like filtering) were causing performance issues.
**Action:** Wrapped `TweetWithActions` in `React.memo`. Since `useRealtimeTweets` preserves object references for unchanged tweets, this effectively prevents re-renders.
