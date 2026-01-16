## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2024-05-24 - [Lazy Loading Tweets]
**Learning:** Rendering many `Tweet` components (from `react-tweet`) simultaneously causes significant network contention and main thread blocking, even with Next.js App Router.
**Action:** Implemented `LazyTweet` using `framer-motion`'s `useInView` to only fetch and render tweets when they are near the viewport (400px margin). This dramatically improves Time to Interactive (TTI) for long lists.
