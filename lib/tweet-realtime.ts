import { realtime } from "./realtime";
import type { TweetData } from "./tweet-service";

const TWEETS_CHANNEL = "tweets";

type RealtimeChannel = ReturnType<typeof realtime.channel>;
type TweetChannel = RealtimeChannel & {
	tweet: {
		added: { emit: (data: { tweet: TweetData }) => Promise<void> };
		updated: { emit: (data: { tweet: TweetData }) => Promise<void> };
		removed: { emit: (data: { id: string }) => Promise<void> };
		reorder: { emit: (data: { tweetIds: string[] }) => Promise<void> };
		seen: { emit: (data: { tweetId: string; seen: boolean }) => Promise<void> };
	};
};

const getTweetChannel = (): TweetChannel => {
	return realtime.channel(TWEETS_CHANNEL) as unknown as TweetChannel;
};

/**
 * Helper function to publish a tweet added event
 */
export async function publishTweetAdded(tweet: TweetData): Promise<void> {
	try {
		await getTweetChannel().tweet.added.emit({ tweet });
		console.log(`[Realtime] Published tweet:added for ${tweet.id}`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:added:", error);
	}
}

/**
 * Helper function to publish a tweet updated event
 */
export async function publishTweetUpdated(tweet: TweetData): Promise<void> {
	try {
		await getTweetChannel().tweet.updated.emit({ tweet });
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
		await getTweetChannel().tweet.removed.emit({ id: tweetId });
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
		await getTweetChannel().tweet.seen.emit({ tweetId, seen });
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
		await getTweetChannel().tweet.reorder.emit({ tweetIds });
		console.log(`[Realtime] Published tweet:reorder`);
	} catch (error) {
		console.error("[Realtime ERROR] Failed to publish tweet:reorder:", error);
	}
}
