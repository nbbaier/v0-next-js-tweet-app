/**
 * Tweet storage layer - Manages persistent storage of tweet IDs in Redis
 */

import { redis } from "./redis";
import {
	publishTweetAdded,
	publishTweetRemoved,
	publishTweetSeen,
	publishTweetUpdated,
} from "./tweet-realtime";
import type { TweetData } from "./tweet-service";

const TWEETS_LIST_KEY = "tweets:list";
const TWEET_METADATA_PREFIX = "tweet:meta:";

export interface Poster {
	name: string;
	submittedAt: number; // Unix timestamp when this poster submitted the tweet
}

export interface TweetMetadata {
	id: string;
	submittedAt: number; // Unix timestamp of first submission
	posters: Poster[]; // Array of all users who submitted this tweet
	url: string;
	seen?: boolean; // Optional: marks tweet as seen/minimized
}

/**
 * Adds a tweet ID to the persistent storage or adds a poster to an existing tweet
 * @param tweetId - The tweet ID to store
 * @param submittedBy - Optional identifier for who submitted it
 * @returns The metadata object created or updated
 */
export async function addTweetToStorage(
	tweetId: string,
	submittedBy?: string,
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
					`[Storage] Added poster ${posterName} to existing tweet ${tweetId}`,
				);

				// Publish real-time update
				const updatedTweetData: TweetData = {
					id: tweetId,
					submittedBy: updatedMetadata.posters.map((p) => p.name),
					seen: updatedMetadata.seen,
				};
				await publishTweetUpdated(updatedTweetData);

				return updatedMetadata;
			}

			console.log(
				`[Storage] Poster ${posterName} already exists for tweet ${tweetId}`,
			);
			return existingMetadata;
		}

		// New tweet, create metadata
		const metadata: TweetMetadata = {
			id: tweetId,
			submittedAt: timestamp,
			posters: submittedBy
				? [{ name: submittedBy, submittedAt: timestamp }]
				: [],
			url: `https://twitter.com/i/status/${tweetId}`,
		};

		// Add to sorted set (score = timestamp for chronological ordering)
		await redis.zadd(TWEETS_LIST_KEY, {
			score: timestamp,
			member: tweetId,
		});

		// Store metadata separately
		await redis.set(`${TWEET_METADATA_PREFIX}${tweetId}`, metadata);

		console.log(`[Storage] Added new tweet ${tweetId}`);

		// Publish real-time update
		const tweetData: TweetData = {
			id: tweetId,
			submittedBy: metadata.posters.map((p) => p.name),
			seen: metadata.seen,
		};
		console.log(
			`[Storage] About to publish tweet:added for ${tweetId}`,
			tweetData,
		);
		await publishTweetAdded(tweetData);
		console.log(`[Storage] Completed publishing tweet:added for ${tweetId}`);

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
	submittedAt: number;
	submittedBy?: string;
	url: string;
	seen?: boolean;
}

/**
 * Normalizes legacy metadata to the new format
 */
function normalizeTweetMetadata(
	metadata: TweetMetadata | LegacyTweetMetadata,
): TweetMetadata {
	// Check if it's legacy format (has submittedBy instead of posters)
	if ("submittedBy" in metadata && !("posters" in metadata)) {
		const legacy = metadata as LegacyTweetMetadata;
		return {
			id: legacy.id,
			submittedAt: legacy.submittedAt,
			posters: legacy.submittedBy
				? [{ name: legacy.submittedBy, submittedAt: legacy.submittedAt }]
				: [],
			url: legacy.url,
			seen: legacy.seen,
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
	tweetId: string,
): Promise<TweetMetadata | null> {
	try {
		const metadata = await redis.get(`${TWEET_METADATA_PREFIX}${tweetId}`);
		if (!metadata) return null;

		// Normalize to handle both old and new formats
		const normalized = normalizeTweetMetadata(
			metadata as TweetMetadata | LegacyTweetMetadata,
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
			error,
		);
		return null;
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
	seen: boolean,
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
			`[Storage] Updated seen status for tweet ${tweetId} to ${seen}`,
		);

		// Publish real-time update
		await publishTweetSeen(tweetId, seen);

		return updatedMetadata;
	} catch (error) {
		console.error(
			`[Storage ERROR] Failed to update seen status for ${tweetId}:`,
			error,
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
	tweetId: string,
): Promise<boolean> {
	try {
		// Remove from sorted set
		const removed = await redis.zrem(TWEETS_LIST_KEY, tweetId);

		// Remove metadata
		await redis.del(`${TWEET_METADATA_PREFIX}${tweetId}`);

		console.log(`[Storage] Removed tweet ${tweetId}`);

		// Publish real-time update
		if (removed > 0) {
			await publishTweetRemoved(tweetId);
		}

		return removed > 0;
	} catch (error) {
		console.error(`[Storage ERROR] Failed to remove tweet ${tweetId}:`, error);
		throw error;
	}
}

/**
 * Checks if a tweet ID already exists in storage
 * @param tweetId - The tweet ID to check
 * @returns True if exists, false otherwise
 */
export async function tweetExistsInStorage(tweetId: string): Promise<boolean> {
	try {
		const score = await redis.zscore(TWEETS_LIST_KEY, tweetId);
		return score !== null;
	} catch (error) {
		console.error(
			`[Storage ERROR] Failed to check existence of ${tweetId}:`,
			error,
		);
		return false;
	}
}

/**
 * Gets the total count of stored tweets
 * @returns Number of tweets in storage
 */
export async function getTweetCount(): Promise<number> {
	try {
		const count = await redis.zcard(TWEETS_LIST_KEY);
		return count;
	} catch (error) {
		console.error("[Storage ERROR] Failed to get tweet count:", error);
		return 0;
	}
}
