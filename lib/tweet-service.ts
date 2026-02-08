/**
 * Tweet data service
 * Handles fetching and caching logic with clean separation
 */

import { getTweet, type Tweet } from "react-tweet/api";
import { getCachedTweets, setCachedTweet } from "./tweet-cache";
import { getTweetMetadatas } from "./tweet-storage";

export interface TweetData {
  id: string;
  submittedBy: string[]; // Array of poster names
  savedAt?: number; // Unix timestamp of when tweet was first saved
  seen?: boolean;
  saved?: boolean; // Whether this tweet is in the saved/pinned list
  content?: Tweet; // The actual tweet content from react-tweet
}

/**
 * Fetch multiple tweets with caching
 */
export async function fetchTweetsWithCache(
  tweetIds: string[]
): Promise<TweetData[]> {
  // Optimization: Use bulk fetch for cache and metadata to reduce Redis round-trips
  // This reduces 2N calls to 2 calls (+ writes on miss)

  // 1. Bulk get cache
  const cachedTweets = await getCachedTweets(tweetIds);
  // 2. Bulk get metadata
  const metadatas = await getTweetMetadatas(tweetIds);

  const updates: Promise<void>[] = [];
  const results: TweetData[] = [];
  const contentFetches: Promise<Tweet | undefined>[] = [];
  const contentFetchIndices: number[] = [];

  // Prepare data and identify missing content
  for (let i = 0; i < tweetIds.length; i++) {
    const id = tweetIds[i];
    const cached = cachedTweets[i];
    const metadata = metadatas[i];

    if (cached?.content) {
      // Full cache hit (metadata + content)
      if (metadata) {
        results.push({
          ...cached,
          submittedBy: metadata.posters.map((p) => p.name),
          savedAt: metadata.submittedAt,
          seen: metadata.seen,
          saved: metadata.saved,
        });
      } else {
        results.push(cached);
      }
    } else {
      // Missing content or full miss
      // We need to fetch content
      // We'll insert a placeholder and fill it later
      const placeholder: TweetData = {
        id,
        submittedBy: metadata?.posters.map((p) => p.name) || [],
        savedAt: metadata?.submittedAt,
        seen: metadata?.seen,
        saved: metadata?.saved,
        content: cached?.content, // Might be undefined
      };
      results.push(placeholder);

      // Schedule fetch
      contentFetches.push(
        getTweet(id).catch((e) => {
          console.error(`Failed to fetch tweet ${id}`, e);
          return undefined;
        })
      );
      contentFetchIndices.push(i);
    }
  }

  // Fetch missing content in parallel
  if (contentFetches.length > 0) {
    const fetchedContents = await Promise.all(contentFetches);

    for (let i = 0; i < fetchedContents.length; i++) {
      const content = fetchedContents[i];
      const originalIndex = contentFetchIndices[i];
      const tweetData = results[originalIndex];

      if (content) {
        tweetData.content = content;
        // Update cache with new content
        updates.push(setCachedTweet(tweetData.id, tweetData));
      } else if (!tweetData.content && cachedTweets[originalIndex]) {
        // If we failed to fetch content but had cached data (without content), keep it?
        // Actually we already set content from cached if available.
        // If we have no content at all, we still return the item, client might fail or fetch itself?
        // But we are removing client fetch.
        // If server fetch fails, content is undefined.
      }
    }
  }

  // Wait for any cache updates to complete
  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return results;
}
