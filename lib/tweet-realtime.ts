/**
 * Real-time tweet updates using Upstash Redis Pub/Sub
 */

import { Redis } from "@upstash/redis";

if (
	!process.env.UPSTASH_KV_KV_REST_API_URL ||
	!process.env.UPSTASH_KV_KV_REST_API_TOKEN
) {
	throw new Error(
		"UPSTASH_KV_KV_REST_API_URL and UPSTASH_KV_KV_REST_API_TOKEN must be set",
	);
}

const redis = new Redis({
	url: process.env.UPSTASH_KV_KV_REST_API_URL,
	token: process.env.UPSTASH_KV_KV_REST_API_TOKEN,
});

// Channel for real-time tweet updates
const TWEET_UPDATES_CHANNEL = "tweets:updates";

// Event types
export type TweetEventType =
	| "tweet:added"
	| "tweet:updated"
	| "tweet:removed"
	| "tweet:seen";

export interface TweetEvent {
	type: TweetEventType;
	tweetId: string;
	timestamp: number;
	data?: Record<string, unknown>;
}

/**
 * Publishes a tweet update event to the Redis Pub/Sub channel
 * @param event - The tweet event to publish
 */
export async function publishTweetUpdate(event: TweetEvent): Promise<void> {
	try {
		await redis.publish(TWEET_UPDATES_CHANNEL, JSON.stringify(event));
		console.log(`[Realtime] Published event: ${event.type} for ${event.tweetId}`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish event:", error);
		// Don't throw - real-time is not critical for app functionality
	}
}

/**
 * Helper function to publish a tweet added event
 */
export async function publishTweetAdded(tweetId: string, data?: Record<string, unknown>): Promise<void> {
	await publishTweetUpdate({
		type: "tweet:added",
		tweetId,
		timestamp: Date.now(),
		data,
	});
}

/**
 * Helper function to publish a tweet updated event
 */
export async function publishTweetUpdated(tweetId: string, data?: Record<string, unknown>): Promise<void> {
	await publishTweetUpdate({
		type: "tweet:updated",
		tweetId,
		timestamp: Date.now(),
		data,
	});
}

/**
 * Helper function to publish a tweet removed event
 */
export async function publishTweetRemoved(tweetId: string): Promise<void> {
	await publishTweetUpdate({
		type: "tweet:removed",
		tweetId,
		timestamp: Date.now(),
	});
}

/**
 * Helper function to publish a tweet seen status change event
 */
export async function publishTweetSeen(tweetId: string, seen: boolean): Promise<void> {
	await publishTweetUpdate({
		type: "tweet:seen",
		tweetId,
		timestamp: Date.now(),
		data: { seen },
	});
}
