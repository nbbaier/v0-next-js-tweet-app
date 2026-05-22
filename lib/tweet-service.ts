/**
 * Tweet data service
 * Handles fetching and caching logic with clean separation
 */

import { fetchTweet, type QuotedTweet, type Tweet } from "react-tweet/api";
import { getCachedTweets, setCachedTweet } from "./tweet-cache";
import { getTweetMetadatas, removeTweetFromStorage } from "./tweet-storage";

export interface TweetData {
  content?: Tweet; // The actual tweet content from react-tweet
  id: string;
  saved?: boolean; // Whether this tweet is in the saved/pinned list
  savedAt?: number; // Unix timestamp of when tweet was first saved
  seen?: boolean;
  submittedBy: string[]; // Array of poster names
}

function normalizeTweetBase<T extends QuotedTweet | Tweet>(tweet: T): T {
  const entities = tweet.entities ?? {};

  return {
    ...tweet,
    display_text_range: tweet.display_text_range ?? [0, tweet.text.length],
    entities: {
      ...entities,
      hashtags: entities.hashtags ?? [],
      media: entities.media,
      symbols: entities.symbols ?? [],
      urls: entities.urls ?? [],
      user_mentions: entities.user_mentions ?? [],
    },
  };
}

function normalizeTweetContent(tweet: Tweet): Tweet {
  return {
    ...normalizeTweetBase(tweet),
    quoted_tweet: tweet.quoted_tweet
      ? normalizeTweetBase(tweet.quoted_tweet)
      : undefined,
  };
}

async function fetchTweetContent(tweetId: string): Promise<Tweet | undefined> {
  const result = await fetchTweet(tweetId);

  if (result.tombstone || result.notFound) {
    console.error(
      `[TweetService] Tweet ${tweetId} is unavailable; removing it from storage.`
    );
    await removeTweetFromStorage(tweetId);
    return;
  }

  return result.data ? normalizeTweetContent(result.data) : undefined;
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
      const content = normalizeTweetContent(cached.content);
      if (metadata) {
        results.push({
          ...cached,
          content,
          submittedBy: metadata.posters.map((p) => p.name),
          savedAt: metadata.submittedAt,
          seen: metadata.seen,
          saved: metadata.saved,
        });
      } else {
        results.push({ ...cached, content });
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
        fetchTweetContent(id).catch((e): undefined => {
          console.error(`Failed to fetch tweet ${id}`, e);
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
      }
    }
  }

  // Wait for any cache updates to complete
  if (updates.length > 0) {
    await Promise.all(updates);
  }

  return results.filter((tweet) => tweet.content);
}
