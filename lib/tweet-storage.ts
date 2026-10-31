/**
 * Tweet storage layer - Manages persistent storage of tweet IDs in Redis
 */

import { redis } from "./redis";
import { publishTweetEvent } from "./tweet-realtime";
import type { TweetData } from "./tweet-service";

const TWEETS_LIST_KEY = "tweets:list";
const TWEETS_SAVED_KEY = "tweets:saved";
const TWEET_METADATA_PREFIX = "tweet:meta:";

interface Poster {
  name: string;
  submittedAt: number; // Unix timestamp when this poster submitted the tweet
}

interface TweetMetadata {
  id: string;
  posters: Poster[]; // Array of all users who submitted this tweet
  saved?: boolean; // Optional: marks tweet as saved/pinned (excluded from cleanup)
  seen?: boolean; // Optional: marks tweet as seen/minimized
  submittedAt: number; // Unix timestamp of first submission
  url: string;
}

/**
 * Adds a tweet ID to the persistent storage or adds a poster to an existing tweet
 * @param tweetId - The tweet ID to store
 * @param submittedBy - Optional identifier for who submitted it
 * @returns The metadata object created or updated
 */
export async function addTweetToStorage(
  tweetId: string,
  submittedBy?: string
): Promise<TweetMetadata> {
  const timestamp = Date.now();

  try {
    // Check if tweet already exists
    const existingMetadata = await getTweetMetadata(tweetId);

    if (existingMetadata) {
      // Tweet exists, add the new poster if not already in the list
      const posterName = submittedBy || "Unknown";
      const existingPosterNames = existingMetadata.posters.map((p) => p.name);

      if (!existingPosterNames.includes(posterName)) {
        const updatedMetadata: TweetMetadata = {
          ...existingMetadata,
          posters: [
            ...existingMetadata.posters,
            { name: posterName, submittedAt: timestamp },
          ],
        };

        await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, updatedMetadata);
        console.log(
          `[Storage] Added poster ${posterName} to existing tweet ${tweetId}`
        );

        // Publish real-time update
        const updatedTweetData: TweetData = {
          id: tweetId,
          seen: updatedMetadata.seen,
          submittedBy: updatedMetadata.posters.map((p) => p.name),
        };
        await publishTweetEvent("tweet.updated", { tweet: updatedTweetData });

        return updatedMetadata;
      }

      console.log(
        `[Storage] Poster ${posterName} already exists for tweet ${tweetId}`
      );
      return existingMetadata;
    }

    // New tweet, create metadata
    const metadata: TweetMetadata = {
      id: tweetId,
      posters: submittedBy
        ? [{ name: submittedBy, submittedAt: timestamp }]
        : [],
      submittedAt: timestamp,
      url: `https://twitter.com/i/status/${tweetId}`,
    };

    // Add to sorted set (score = timestamp for chronological ordering)
    await redis.zadd(TWEETS_LIST_KEY, {
      member: tweetId,
      score: timestamp,
    });

    // Store metadata separately
    await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, metadata);

    console.log(`[Storage] Added new tweet ${tweetId}`);

    // Publish real-time update
    const tweetData: TweetData = {
      id: tweetId,
      seen: metadata.seen,
      submittedBy: metadata.posters.map((p) => p.name),
    };
    await publishTweetEvent("tweet.added", { tweet: tweetData });

    return metadata;
  } catch (error) {
    console.error(`[Storage ERROR] Failed to add tweet ${tweetId}:`, error);
    throw error;
  }
}

/**
 * Retrieves all tweet IDs from storage, ordered by submission time (newest first)
 * @returns Array of tweet IDs
 */
export async function getTweetIdsFromStorage(): Promise<string[]> {
  try {
    // Get all tweet IDs from sorted set, newest first (reverse order)
    const tweetIds = await redis.zrange(TWEETS_LIST_KEY, 0, -1, {
      rev: true,
    });

    console.log(`[Storage] Retrieved ${tweetIds.length} tweet IDs`);
    return tweetIds as string[];
  } catch (error) {
    console.error("[Storage ERROR] Failed to get tweet IDs:", error);
    return [];
  }
}

/**
 * Legacy metadata format for backwards compatibility
 */
interface LegacyTweetMetadata {
  id: string;
  seen?: boolean;
  submittedAt: number;
  submittedBy?: string;
  url: string;
}

/**
 * Normalizes legacy metadata to the new format
 */
function normalizeTweetMetadata(
  metadata: TweetMetadata | LegacyTweetMetadata
): TweetMetadata {
  // Check if it's legacy format (has submittedBy instead of posters)
  if ("submittedBy" in metadata && !("posters" in metadata)) {
    const legacy = metadata as LegacyTweetMetadata;
    return {
      id: legacy.id,
      posters: legacy.submittedBy
        ? [{ name: legacy.submittedBy, submittedAt: legacy.submittedAt }]
        : [],
      seen: legacy.seen,
      submittedAt: legacy.submittedAt,
      url: legacy.url,
    };
  }
  return metadata as TweetMetadata;
}

/**
 * Retrieves metadata for a specific tweet
 * @param tweetId - The tweet ID
 * @returns Metadata object or null if not found
 */
export async function getTweetMetadata(
  tweetId: string
): Promise<TweetMetadata | null> {
  try {
    const metadata = await redis.get(`${TWEET_METADATA_PREFIX}${tweetId}`);
    if (!metadata) {
      return null;
    }

    // Normalize to handle both old and new formats
    const normalized = normalizeTweetMetadata(
      metadata as TweetMetadata | LegacyTweetMetadata
    );

    // If we normalized from legacy format, update the stored version
    if (
      typeof metadata === "object" &&
      metadata !== null &&
      "submittedBy" in metadata &&
      !("posters" in metadata)
    ) {
      await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, normalized);
      console.log(`[Storage] Migrated legacy metadata for tweet ${tweetId}`);
    }

    return normalized;
  } catch (error) {
    console.error(
      `[Storage ERROR] Failed to get metadata for ${tweetId}:`,
      error
    );
    return null;
  }
}

/**
 * Retrieves metadata for multiple tweets
 * @param tweetIds - The tweet IDs
 * @returns Array of Metadata objects or null if not found
 */
export async function getTweetMetadataBatch(
  tweetIds: string[]
): Promise<(TweetMetadata | null)[]> {
  if (tweetIds.length === 0) {
    return [];
  }

  try {
    const keys = tweetIds.map((id) => `${TWEET_METADATA_PREFIX}${id}`);
    const batch = await redis.mget<
      (TweetMetadata | LegacyTweetMetadata | null)[]
    >(...keys);

    // Normalize and potentially migrate legacy ones.
    const results = await Promise.all(
      batch.map(async (metadata, index) => {
        if (!metadata) {
          return null;
        }

        // Normalize to handle both old and new formats
        const normalized = normalizeTweetMetadata(
          metadata as TweetMetadata | LegacyTweetMetadata
        );

        // If we normalized from legacy format, update the stored version
        if (
          typeof metadata === "object" &&
          metadata !== null &&
          "submittedBy" in metadata &&
          !("posters" in metadata)
        ) {
          // We fire and forget this update to keep reads fast, or we could await it.
          // Since this is a "read" optimization, we can just fire it.
          // But for safety let's await it since it's a migration.
          try {
            await redis.set(
              `${TWEET_METADATA_PREFIX}${tweetIds[index]}`,
              normalized
            );
            console.log(
              `[Storage] Migrated legacy metadata for tweet ${tweetIds[index]}`
            );
          } catch (e) {
            console.error(
              `[Storage] Failed to migrate legacy metadata for tweet ${tweetIds[index]}`,
              e
            );
          }
        }
        return normalized;
      })
    );

    return results;
  } catch (error) {
    console.error("[Storage ERROR] Failed to get metadata batch:", error);
    return new Array(tweetIds.length).fill(null);
  }
}

/**
 * Updates the seen status for a tweet
 * @param tweetId - The tweet ID
 * @param seen - The seen status to set
 * @returns Updated metadata or null if not found
 */
export async function updateTweetSeen(
  tweetId: string,
  seen: boolean
): Promise<TweetMetadata | null> {
  try {
    const metadata = await getTweetMetadata(tweetId);
    if (!metadata) {
      console.error(`[Storage ERROR] Tweet ${tweetId} not found`);
      return null;
    }

    const updatedMetadata: TweetMetadata = {
      ...metadata,
      seen,
    };

    await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, updatedMetadata);
    console.log(
      `[Storage] Updated seen status for tweet ${tweetId} to ${seen}`
    );

    // Publish real-time update
    await publishTweetEvent("tweet.seen", { seen, tweetId });

    return updatedMetadata;
  } catch (error) {
    console.error(
      `[Storage ERROR] Failed to update seen status for ${tweetId}:`,
      error
    );
    return null;
  }
}

/**
 * Removes a tweet from storage
 * @param tweetId - The tweet ID to remove
 * @returns True if removed, false if not found
 */
export async function removeTweetFromStorage(
  tweetId: string
): Promise<boolean> {
  try {
    // Remove from sorted set
    const removed = await redis.zrem(TWEETS_LIST_KEY, tweetId);

    // Remove from saved set too
    await redis.zrem(TWEETS_SAVED_KEY, tweetId);

    // Remove metadata
    await redis.del(`${TWEET_METADATA_PREFIX}${tweetId}`);

    console.log(`[Storage] Removed tweet ${tweetId}`);

    // Publish real-time update
    if (removed > 0) {
      await publishTweetEvent("tweet.removed", { id: tweetId });
    }

    return removed > 0;
  } catch (error) {
    console.error(`[Storage ERROR] Failed to remove tweet ${tweetId}:`, error);
    throw error;
  }
}

/**
 * Updates the saved status for a tweet
 * Saved tweets are added to a separate sorted set and excluded from cleanup
 * @param tweetId - The tweet ID
 * @param saved - The saved status to set
 * @returns Updated metadata or null if not found
 */
export async function updateTweetSaved(
  tweetId: string,
  saved: boolean
): Promise<TweetMetadata | null> {
  try {
    const metadata = await getTweetMetadata(tweetId);
    if (!metadata) {
      console.error(`[Storage ERROR] Tweet ${tweetId} not found`);
      return null;
    }

    const updatedMetadata: TweetMetadata = {
      ...metadata,
      saved,
    };

    await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, updatedMetadata);

    if (saved) {
      // Add to saved sorted set
      await redis.zadd(TWEETS_SAVED_KEY, {
        member: tweetId,
        score: Date.now(),
      });
    } else {
      // Remove from saved sorted set
      await redis.zrem(TWEETS_SAVED_KEY, tweetId);
    }

    console.log(
      `[Storage] Updated saved status for tweet ${tweetId} to ${saved}`
    );

    // Publish real-time update
    await publishTweetEvent("tweet.saved", { saved, tweetId });

    return updatedMetadata;
  } catch (error) {
    console.error(
      `[Storage ERROR] Failed to update saved status for ${tweetId}:`,
      error
    );
    return null;
  }
}

/**
 * Retrieves all saved tweet IDs from storage, ordered by save time (newest first)
 * @returns Array of saved tweet IDs
 */
export async function getSavedTweetIdsFromStorage(): Promise<string[]> {
  try {
    const tweetIds = await redis.zrange(TWEETS_SAVED_KEY, 0, -1, {
      rev: true,
    });

    console.log(`[Storage] Retrieved ${tweetIds.length} saved tweet IDs`);
    return tweetIds as string[];
  } catch (error) {
    console.error("[Storage ERROR] Failed to get saved tweet IDs:", error);
    return [];
  }
}
