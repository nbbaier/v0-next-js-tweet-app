/**
 * Tweet data service
 * Handles fetching and caching logic with clean separation
 */

import { getCachedTweet, getCachedTweets, setCachedTweet } from "./tweet-cache";
import { getTweetMetadata, getTweetMetadatas } from "./tweet-storage";

export interface TweetData {
	id: string;
	submittedBy: string[]; // Array of poster names
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
				submittedBy: metadata.posters.map((p) => p.name),
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
		submittedBy: metadata?.posters.map((p) => p.name) || [],
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
	// Optimization: Use bulk fetch for cache and metadata to reduce Redis round-trips
	// This reduces 2N calls to 2 calls (+ writes on miss)

	// 1. Bulk get cache
	const cachedTweets = await getCachedTweets(tweetIds);
	// 2. Bulk get metadata
	const metadatas = await getTweetMetadatas(tweetIds);

	const updates: Promise<void>[] = [];
	const results: TweetData[] = [];

	for (let i = 0; i < tweetIds.length; i++) {
		const id = tweetIds[i];
		const cached = cachedTweets[i];
		const metadata = metadatas[i];

		if (cached) {
			if (metadata) {
				results.push({
					...cached,
					submittedBy: metadata.posters.map((p) => p.name),
					seen: metadata.seen,
				});
			} else {
				results.push(cached);
			}
			continue;
		}

		// Cache miss
		const tweetData: TweetData = {
			id,
			submittedBy: metadata?.posters.map((p) => p.name) || [],
			seen: metadata?.seen,
		};

		updates.push(setCachedTweet(id, tweetData));
		results.push(tweetData);
	}

	// Wait for any cache updates to complete
	if (updates.length > 0) {
		await Promise.all(updates);
	}

	return results;
}
