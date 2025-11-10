/**
 * Tweet storage layer - Manages persistent storage of tweet IDs in Redis
 */

import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_KV_KV_REST_API_URL!,
  token: process.env.UPSTASH_KV_KV_REST_API_TOKEN!,
})

const TWEETS_LIST_KEY = "tweets:list"
const TWEET_METADATA_PREFIX = "tweet:meta:"

export interface TweetMetadata {
  id: string
  submittedAt: number // Unix timestamp
  submittedBy?: string // Optional: "user1" or "user2"
  url: string
}

/**
 * Adds a tweet ID to the persistent storage
 * @param tweetId - The tweet ID to store
 * @param submittedBy - Optional identifier for who submitted it
 * @returns The metadata object created
 */
export async function addTweetToStorage(
  tweetId: string,
  submittedBy?: string,
): Promise<TweetMetadata> {
  const timestamp = Date.now()
  const metadata: TweetMetadata = {
    id: tweetId,
    submittedAt: timestamp,
    submittedBy,
    url: `https://twitter.com/i/status/${tweetId}`,
  }

  try {
    // Add to sorted set (score = timestamp for chronological ordering)
    await redis.zadd(TWEETS_LIST_KEY, {
      score: timestamp,
      member: tweetId,
    })

    // Store metadata separately
    await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, metadata)

    console.log(`[Storage] Added tweet ${tweetId}`)
    return metadata
  } catch (error) {
    console.error(`[Storage ERROR] Failed to add tweet ${tweetId}:`, error)
    throw error
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
    })

    console.log(`[Storage] Retrieved ${tweetIds.length} tweet IDs`)
    return tweetIds as string[]
  } catch (error) {
    console.error("[Storage ERROR] Failed to get tweet IDs:", error)
    return []
  }
}

/**
 * Retrieves metadata for a specific tweet
 * @param tweetId - The tweet ID
 * @returns Metadata object or null if not found
 */
export async function getTweetMetadata(
  tweetId: string,
): Promise<TweetMetadata | null> {
  try {
    const metadata = await redis.get(`${TWEET_METADATA_PREFIX}${tweetId}`)
    return metadata as TweetMetadata | null
  } catch (error) {
    console.error(
      `[Storage ERROR] Failed to get metadata for ${tweetId}:`,
      error,
    )
    return null
  }
}

/**
 * Removes a tweet from storage
 * @param tweetId - The tweet ID to remove
 * @returns True if removed, false if not found
 */
export async function removeTweetFromStorage(
  tweetId: string,
): Promise<boolean> {
  try {
    // Remove from sorted set
    const removed = await redis.zrem(TWEETS_LIST_KEY, tweetId)

    // Remove metadata
    await redis.del(`${TWEET_METADATA_PREFIX}${tweetId}`)

    console.log(`[Storage] Removed tweet ${tweetId}`)
    return removed > 0
  } catch (error) {
    console.error(`[Storage ERROR] Failed to remove tweet ${tweetId}:`, error)
    throw error
  }
}

/**
 * Checks if a tweet ID already exists in storage
 * @param tweetId - The tweet ID to check
 * @returns True if exists, false otherwise
 */
export async function tweetExistsInStorage(tweetId: string): Promise<boolean> {
  try {
    const score = await redis.zscore(TWEETS_LIST_KEY, tweetId)
    return score !== null
  } catch (error) {
    console.error(
      `[Storage ERROR] Failed to check existence of ${tweetId}:`,
      error,
    )
    return false
  }
}

/**
 * Gets the total count of stored tweets
 * @returns Number of tweets in storage
 */
export async function getTweetCount(): Promise<number> {
  try {
    const count = await redis.zcard(TWEETS_LIST_KEY)
    return count
  } catch (error) {
    console.error("[Storage ERROR] Failed to get tweet count:", error)
    return 0
  }
}
