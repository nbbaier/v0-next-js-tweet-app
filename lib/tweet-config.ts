/**
 * Tweet configuration
 * Fetches tweet IDs from Redis storage
 */

import { DEVELOPMENT_TWEET_IDS } from "./development-tweets";
import { getTweetIdsFromStorage } from "./tweet-storage";

/**
 * Get tweet IDs from Redis storage
 * Returns empty array if storage is empty
 * Falls back to development IDs only on error (e.g., Redis unavailable)
 */
export async function getTweetIds(): Promise<string[]> {
	try {
		const tweetIds = await getTweetIdsFromStorage();

		if (tweetIds.length === 0) {
			console.log("[Config] No tweets in storage");
		}

		return tweetIds;
	} catch (error) {
		console.error("[Config ERROR] Failed to fetch tweets from storage:", error);
		// Fallback to development IDs only on error (e.g., Redis down)
		return DEVELOPMENT_TWEET_IDS;
	}
}
