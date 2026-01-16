## 2024-05-22 - [Bulk Redis Fetching]
**Learning:** Initial tweet fetching was doing 2N Redis calls (N cache checks + N metadata checks).
**Action:** Implemented `redis.mget` for both cache and metadata to reduce this to 2 calls total, significantly improving feed load time.

## 2024-05-23 - [Lazy Load Tweets]
**Learning:** Rendering a list of `Tweet` components (Client Component) triggers N network requests to the tweet API immediately on page load, causing network contention and blocking the main thread.
**Action:** Implemented lazy loading using `framer-motion`'s `useInView` hook in `TweetWithActions`. Tweets now only fetch when they approach the viewport (400px margin), significantly reducing initial load impact and distributing network requests.
