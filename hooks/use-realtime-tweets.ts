/**
 * React hook for real-time tweet updates via Upstash Realtime
 */

"use client";

import { useRealtime } from "@upstash/realtime/client";
import { useCallback, useEffect, useState } from "react";
import type {
	TweetAddedEvent,
	TweetRemovedEvent,
	TweetReorderEvent,
	TweetSeenEvent,
	TweetUpdatedEvent,
} from "@/lib/realtime";
import type { TweetData } from "@/lib/tweet-service";

interface UseRealtimeTweetsOptions {
	enabled?: boolean;
	onError?: (error: Error) => void;
	onConnected?: () => void;
	onDisconnected?: () => void;
}

export function useRealtimeTweets(
	initialTweets: TweetData[],
	options: UseRealtimeTweetsOptions = {},
) {
	const { enabled = true, onError, onConnected, onDisconnected } = options;
	const [tweets, setTweets] = useState<TweetData[]>(initialTweets);

	const handleTweetAdded = useCallback((data: TweetAddedEvent) => {
		const tweet = data.tweet;
		setTweets((prev) => {
			if (prev.some((t) => t.id === tweet.id)) {
				return prev.map((t) => (t.id === tweet.id ? tweet : t));
			}
			return [tweet, ...prev];
		});
		console.log("[Realtime] Tweet added:", tweet.id);
	}, []);

	const handleTweetRemoved = useCallback((data: TweetRemovedEvent) => {
		setTweets((prev) => prev.filter((t) => t.id !== data.id));
		console.log("[Realtime] Tweet removed:", data.id);
	}, []);

	const handleTweetUpdated = useCallback((data: TweetUpdatedEvent) => {
		const tweet = data.tweet;
		setTweets((prev) =>
			prev.map((t) => (t.id === tweet.id ? { ...t, ...tweet } : t)),
		);
		console.log("[Realtime] Tweet updated:", tweet.id);
	}, []);

	const handleReorder = useCallback((data: TweetReorderEvent) => {
		setTweets((prev) => {
			const tweetMap = new Map(prev.map((t) => [t.id, t]));
			return data.tweetIds
				.map((id: string) => tweetMap.get(id))
				.filter((t): t is TweetData => t !== undefined);
		});
		console.log("[Realtime] Tweets reordered");
	}, []);

	const handleTweetSeen = useCallback((data: TweetSeenEvent) => {
		setTweets((prev) =>
			prev.map((t) => (t.id === data.tweetId ? { ...t, seen: data.seen } : t)),
		);
		console.log(
			"[Realtime] Tweet seen status updated:",
			data.tweetId,
			data.seen,
		);
	}, []);

	const { status } = useRealtime({
		enabled,
		channels: ["tweets"],
		events: {
			tweet: {
				added: handleTweetAdded,
				removed: handleTweetRemoved,
				updated: handleTweetUpdated,
				reorder: handleReorder,
				seen: handleTweetSeen,
			},
		},
	} as Parameters<typeof useRealtime>[0]);

	const isConnected = status === "connected";

	useEffect(() => {
		if (isConnected) {
			onConnected?.();
		} else if (status === "disconnected") {
			onDisconnected?.();
		} else if (status === "error") {
			onError?.(new Error("Realtime connection error"));
		}
	}, [status, isConnected, onConnected, onDisconnected, onError]);

	useEffect(() => {
		setTweets(initialTweets);
	}, [initialTweets]);

	return {
		tweets,
		isConnected,
		reconnect: () => {
			console.log(
				"[Realtime] Reconnect requested - handled automatically by useRealtime",
			);
		},
		disconnect: () => {
			console.log(
				"[Realtime] Disconnect requested - set enabled=false to disconnect",
			);
		},
	};
}
