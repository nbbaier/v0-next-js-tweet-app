import { realtime } from "./realtime";
import type { TweetData } from "./tweet-service";

const TWEETS_CHANNEL = "tweets";

/**
 * Helper function to publish a tweet added event
 */
export async function publishTweetAdded(tweet: TweetData): Promise<void> {
	try {
		const channel = realtime.channel(TWEETS_CHANNEL) as any;

		if (channel.emit && typeof channel.emit === "function") {
			console.log(`[Realtime] Trying channel.emit('tweet.added', ...)`);
			await channel.emit("tweet.added", { tweet });
		} else if (channel.tweet?.added?.emit) {
			console.log(`[Realtime] Trying channel.tweet.added.emit(...)`);
			await channel.tweet.added.emit({ tweet });
		} else {
			throw new Error(
				`Channel doesn't have expected emit methods. Keys: ${Object.keys(channel).join(", ")}`,
			);
		}

		console.log(
			`[Realtime] Successfully published tweet:added for ${tweet.id}`,
		);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:added:", error);
		console.error(
			"[Realtime ERROR] Error details:",
			error instanceof Error ? error.stack : error,
		);
		throw error;
	}
}

/**
 * Helper function to publish a tweet updated event
 */
export async function publishTweetUpdated(tweet: TweetData): Promise<void> {
	try {
		const channel = realtime.channel(TWEETS_CHANNEL) as any;
		await channel.emit("tweet.updated", { tweet });
		console.log(`[Realtime] Published tweet:updated for ${tweet.id}`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:updated:", error);
	}
}

/**
 * Helper function to publish a tweet removed event
 */
export async function publishTweetRemoved(tweetId: string): Promise<void> {
	try {
		const channel = realtime.channel(TWEETS_CHANNEL) as any;
		await channel.emit("tweet.removed", { id: tweetId });
		console.log(`[Realtime] Published tweet:removed for ${tweetId}`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:removed:", error);
	}
}

/**
 * Helper function to publish a tweet seen status change event
 */
export async function publishTweetSeen(
	tweetId: string,
	seen: boolean,
): Promise<void> {
	try {
		const channel = realtime.channel(TWEETS_CHANNEL) as any;
		await channel.emit("tweet.seen", { tweetId, seen });
		console.log(`[Realtime] Published tweet:seen for ${tweetId}`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:seen:", error);
	}
}

/**
 * Helper function to publish a tweet reorder event
 */
export async function publishTweetReorder(tweetIds: string[]): Promise<void> {
	try {
		const channel = realtime.channel(TWEETS_CHANNEL) as any;
		await channel.emit("tweet.reorder", { tweetIds });
		console.log(`[Realtime] Published tweet:reorder`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:reorder:", error);
	}
}
