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
	content?: Tweet; // The actual tweet content from react-tweet
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

		// If cached data has content, use it
		// Otherwise we might want to fetch content
		let content = cached.content;
		if (!content) {
			try {
				const tweet = await getTweet(tweetId);
				if (tweet) {
					content = tweet;
					// Update cache asynchronously
					setCachedTweet(tweetId, { ...cached, content: tweet });
				}
			} catch (e) {
				console.error(`Failed to fetch tweet content for ${tweetId}`, e);
			}
		}

		if (metadata) {
			return {
				...cached,
				submittedBy: metadata.posters.map((p) => p.name),
				seen: metadata.seen,
				content,
			};
		}
		return { ...cached, content };
	}

	// Fetch metadata from storage
	const metadata = await getTweetMetadata(tweetId);

	// Fetch tweet content
	let content: Tweet | undefined;
	try {
		const tweet = await getTweet(tweetId);
		if (tweet) {
			content = tweet;
		}
	} catch (e) {
		console.error(`Failed to fetch tweet content for ${tweetId}`, e);
	}

	const tweetData: TweetData = {
		id: tweetId,
		submittedBy: metadata?.posters.map((p) => p.name) || [],
		seen: metadata?.seen,
		content,
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
					seen: metadata.seen,
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
				seen: metadata?.seen,
				content: cached?.content, // Might be undefined
			};
			results.push(placeholder);

			// Schedule fetch
			contentFetches.push(
				getTweet(id).catch((e) => {
					console.error(`Failed to fetch tweet ${id}`, e);
					return undefined;
				}),
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
