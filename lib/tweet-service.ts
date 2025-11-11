/**
 * Tweet data service
 * Handles fetching and caching logic with clean separation
 */

import { getCachedTweet, setCachedTweet } from "./tweet-cache";
import { getTweetMetadata } from "./tweet-storage";

export interface TweetData {
	id: string;
	submittedBy: string;
	seen?: boolean;
	// Add other tweet metadata as needed
}

/**
 * Fetch tweet data with caching
 * Checks cache first, then fetches from API if needed
 */
export async function fetchTweetWithCache(tweetId: string): Promise<TweetData> {
	// Check cache first
	const cached = await getCachedTweet(tweetId);
	if (cached) {
		// Also fetch fresh metadata to ensure seen status is up to date
		const metadata = await getTweetMetadata(tweetId);
		if (metadata) {
			return {
				...cached,
				submittedBy: metadata.submittedBy || "Unknown",
				seen: metadata.seen,
			};
		}
		return cached;
	}

	// Fetch metadata from storage
	const metadata = await getTweetMetadata(tweetId);

	// Simulate API fetch (react-tweet handles actual fetching)
	// In production, you might fetch additional metadata here
	const tweetData: TweetData = {
		id: tweetId,
		submittedBy: metadata?.submittedBy || "Unknown",
		seen: metadata?.seen,
	};

	// Store in cache
	await setCachedTweet(tweetId, tweetData);

	return tweetData;
}

/**
 * Fetch multiple tweets with caching
 */
export async function fetchTweetsWithCache(
	tweetIds: string[],
): Promise<TweetData[]> {
	const tweets = await Promise.all(
		tweetIds.map((id) => fetchTweetWithCache(id)),
	);

	return tweets;
}
