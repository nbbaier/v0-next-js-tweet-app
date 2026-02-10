/**
 * Tweet caching service - Upstash KV implementation
 */

import { redis } from "./redis";
import type { TweetData } from "./tweet-service";

const CACHE_TTL = 3600; // 1 hour in seconds

export async function getCachedTweet(
	tweetId: string,
): Promise<TweetData | null> {
	try {
		const cached = await redis.get<TweetData>(`tweet:${tweetId}`);

		if (cached) {
			// console.log(`[Cache HIT] Tweet ${tweetId}`);
			return cached;
		}

		console.log(`[Cache MISS] Tweet ${tweetId}`);
		return null;
	} catch (error) {
		console.error(`[Cache ERROR] Failed to get tweet ${tweetId}:`, error);
		return null;
	}
}

export async function getCachedTweets(
	tweetIds: string[],
): Promise<(TweetData | null)[]> {
	if (tweetIds.length === 0) {
		return [];
	}

	try {
		const keys = tweetIds.map((id) => `tweet:${id}`);
		const cached = await redis.mget<TweetData[]>(...keys);

		// Log hit/miss stats? Maybe too noisy for bulk.
		return cached;
	} catch (error) {
		console.error(`[Cache ERROR] Failed to mget tweets:`, error);
		return new Array(tweetIds.length).fill(null);
	}
}

export async function setCachedTweet(
	tweetId: string,
	data: TweetData,
): Promise<void> {
	try {
		await redis.set(`tweet:${tweetId}`, data, { ex: CACHE_TTL });
		// console.log(`[Cache SET] Tweet ${tweetId}`);
	} catch (error) {
		console.error(`[Cache ERROR] Failed to set tweet ${tweetId}:`, error);
	}
}
