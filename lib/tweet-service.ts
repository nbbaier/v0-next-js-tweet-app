/**
 * Tweet data service
 * Handles fetching and caching logic with clean separation
 */

import { getTweet, type Tweet } from "react-tweet/api";
import { getCachedTweet, getCachedTweets, setCachedTweet } from "./tweet-cache";
import { getTweetMetadata, getTweetMetadatas } from "./tweet-storage";

export interface TweetData {
	id: string;
	submittedBy: string[]; // Array of poster names
	seen?: boolean;
	content?: Tweet;
	// Add other tweet metadata as needed
}

/**
 * Fetch tweet data with caching
 * Checks cache first, then fetches from API if needed
 */
export async function fetchTweetWithCache(tweetId: string): Promise<TweetData> {
	// Check cache first
	const cached = await getCachedTweet(tweetId);
	if (cached?.content) {
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

	// Fetch content
	let content: Tweet | undefined;
	try {
		content = await getTweet(tweetId);
	} catch (e) {
		console.error(`Failed to fetch tweet ${tweetId}`, e);
	}

	const tweetData: TweetData = {
		id: tweetId,
		submittedBy: metadata?.posters.map((p) => p.name) || [],
		seen: metadata?.seen,
		content,
	};

	// Store in cache
	// Only cache if we got content? Or cache null content?
	// If fetch failed, maybe don't cache content so we retry?
	// But we might want to cache metadata.
	// Let's cache what we have.
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
	const missIndices: number[] = [];
	const contentFetches: Promise<Tweet | undefined>[] = [];

	for (let i = 0; i < tweetIds.length; i++) {
		const cached = cachedTweets[i];

		if (cached?.content) {
			// Cache hit with content
			const metadata = metadatas[i];

			if (metadata) {
				results[i] = {
					...cached,
					submittedBy: metadata.posters.map((p) => p.name),
					seen: metadata.seen,
				};
			} else {
				results[i] = cached;
			}
		} else {
			// Cache miss or partial miss (missing content)
			missIndices.push(i);
			contentFetches.push(
				getTweet(tweetIds[i]).catch((e) => {
					console.error(`Failed to fetch tweet ${tweetIds[i]}`, e);
					return undefined;
				}),
			);
			// Placeholder for now
			results[i] = null as any;
		}
	}

	// Process misses
	if (missIndices.length > 0) {
		const contents = await Promise.all(contentFetches);

		for (let j = 0; j < missIndices.length; j++) {
			const i = missIndices[j];
			const id = tweetIds[i];
			const content = contents[j];
			const metadata = metadatas[i];
			const cached = cachedTweets[i];

			// Construct tweet data
			// If cached existed but no content, merge.
			let tweetData: TweetData;

			if (cached) {
				tweetData = {
					...cached,
					submittedBy: metadata
						? metadata.posters.map((p) => p.name)
						: cached.submittedBy,
					seen: metadata ? metadata.seen : cached.seen,
					content,
				};
			} else {
				tweetData = {
					id,
					submittedBy: metadata?.posters.map((p) => p.name) || [],
					seen: metadata?.seen,
					content,
				};
			}

			results[i] = tweetData;
			updates.push(setCachedTweet(id, tweetData));
		}
	}

	// Wait for any cache updates to complete
	if (updates.length > 0) {
		await Promise.all(updates);
	}

	return results;
}
