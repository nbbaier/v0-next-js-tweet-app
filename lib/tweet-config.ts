/**
 * Tweet configuration
 * Fetches tweet IDs from Redis storage
 */

import { getTweetIdsFromStorage } from "./tweet-storage";

/**
 * Get tweet IDs from Redis storage
 * Returns empty array if storage is empty or unavailable
 * (getTweetIdsFromStorage already catches Redis errors and returns [])
 */
export async function getTweetIds(): Promise<string[]> {
  const tweetIds = await getTweetIdsFromStorage();

  if (tweetIds.length === 0) {
    console.log("[Config] No tweets in storage");
  }

  return tweetIds;
}
