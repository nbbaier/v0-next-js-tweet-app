/**
 * Tweet configuration
 * Fetches tweet IDs from Redis storage
 */

import { getTweetIdsFromStorage } from "./tweet-storage";

export const DEVELOPMENT_TWEET_IDS = [
	"1987941484176560364",
	"1987794603982938338",
	"1987940762143826419",
];

/**
 * Get tweet IDs from Redis storage
 * Falls back to development IDs if storage is empty or unavailable
 */
export async function getTweetIds(): Promise<string[]> {
	try {
		const tweetIds = await getTweetIdsFromStorage();

		// If storage is empty, return development IDs as fallback
		if (tweetIds.length === 0) {
			console.log("[Config] No tweets in storage, using development IDs");
			return DEVELOPMENT_TWEET_IDS;
		}

		return tweetIds;
	} catch (error) {
		console.error("[Config ERROR] Failed to fetch tweets from storage:", error);
		// Fallback to development IDs on error
		return DEVELOPMENT_TWEET_IDS;
	}
}
