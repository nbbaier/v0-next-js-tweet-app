/**
 * React hook for real-time tweet updates via SSE
 */

"use client";

import { useEffect, useState, useCallback, useRef } from "react";
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
	const [isConnected, setIsConnected] = useState(false);
	const eventSourceRef = useRef<EventSource | null>(null);
	const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const reconnectAttemptsRef = useRef(0);

	const handleTweetAdded = useCallback((tweet: TweetData) => {
		setTweets((prev) => {
			// Check if tweet already exists
			if (prev.some((t) => t.id === tweet.id)) {
				// Update existing tweet
				return prev.map((t) => (t.id === tweet.id ? tweet : t));
			}
			// Add new tweet to the beginning (newest first)
			return [tweet, ...prev];
		});
	}, []);

	const handleTweetRemoved = useCallback((tweetId: string) => {
		setTweets((prev) => prev.filter((t) => t.id !== tweetId));
	}, []);

	const handleTweetUpdated = useCallback((tweet: TweetData) => {
		setTweets((prev) =>
			prev.map((t) => (t.id === tweet.id ? { ...t, ...tweet } : t)),
		);
	}, []);

	const handleReorder = useCallback((tweetIds: string[]) => {
		setTweets((prev) => {
			const tweetMap = new Map(prev.map((t) => [t.id, t]));
			return tweetIds
				.map((id) => tweetMap.get(id))
				.filter((t): t is TweetData => t !== undefined);
		});
	}, []);

	const connect = useCallback(() => {
		if (!enabled || eventSourceRef.current) {
			return;
		}

		try {
			console.log("[Realtime] Connecting to tweet stream...");
			const eventSource = new EventSource("/api/tweets/stream");
			eventSourceRef.current = eventSource;

			eventSource.addEventListener("connected", () => {
				console.log("[Realtime] Connected to tweet stream");
				setIsConnected(true);
				reconnectAttemptsRef.current = 0;
				onConnected?.();
			});

			eventSource.addEventListener("tweet:added", (event) => {
				const tweet = JSON.parse(event.data) as TweetData;
				console.log("[Realtime] Tweet added:", tweet.id);
				handleTweetAdded(tweet);
			});

			eventSource.addEventListener("tweet:removed", (event) => {
				const { id } = JSON.parse(event.data);
				console.log("[Realtime] Tweet removed:", id);
				handleTweetRemoved(id);
			});

			eventSource.addEventListener("tweet:updated", (event) => {
				const tweet = JSON.parse(event.data) as TweetData;
				console.log("[Realtime] Tweet updated:", tweet.id);
				handleTweetUpdated(tweet);
			});

			eventSource.addEventListener("tweet:reorder", (event) => {
				const { tweetIds } = JSON.parse(event.data);
				console.log("[Realtime] Tweets reordered");
				handleReorder(tweetIds);
			});

			eventSource.addEventListener("error", (event) => {
				const data = (event as MessageEvent).data;
				if (data) {
					try {
						const error = JSON.parse(data);
						console.error("[Realtime] Stream error:", error.message);
						onError?.(new Error(error.message));
					} catch {
						// Ignore parse errors
					}
				}
			});

			eventSource.onerror = () => {
				console.error("[Realtime] Connection error");
				setIsConnected(false);
				onDisconnected?.();

				// Clean up
				eventSource.close();
				eventSourceRef.current = null;

				// Attempt to reconnect with exponential backoff
				const maxAttempts = 5;
				const backoffMs = Math.min(
					1000 * 2 ** reconnectAttemptsRef.current,
					30000,
				);

				if (reconnectAttemptsRef.current < maxAttempts) {
					reconnectAttemptsRef.current++;
					console.log(
						`[Realtime] Reconnecting in ${backoffMs}ms (attempt ${reconnectAttemptsRef.current}/${maxAttempts})`,
					);

					reconnectTimeoutRef.current = setTimeout(() => {
						connect();
					}, backoffMs);
				} else {
					console.error("[Realtime] Max reconnection attempts reached");
					onError?.(new Error("Failed to connect to real-time updates"));
				}
			};
		} catch (error) {
			console.error("[Realtime] Failed to create EventSource:", error);
			setIsConnected(false);
			onError?.(
				error instanceof Error ? error : new Error("Connection failed"),
			);
		}
	}, [
		enabled,
		handleTweetAdded,
		handleTweetRemoved,
		handleTweetUpdated,
		handleReorder,
		onError,
		onConnected,
		onDisconnected,
	]);

	const disconnect = useCallback(() => {
		if (reconnectTimeoutRef.current) {
			clearTimeout(reconnectTimeoutRef.current);
			reconnectTimeoutRef.current = null;
		}

		if (eventSourceRef.current) {
			console.log("[Realtime] Disconnecting from tweet stream");
			eventSourceRef.current.close();
			eventSourceRef.current = null;
			setIsConnected(false);
			onDisconnected?.();
		}
	}, [onDisconnected]);

	// Connect/disconnect based on enabled state
	useEffect(() => {
		if (enabled) {
			connect();
		} else {
			disconnect();
		}

		return () => {
			disconnect();
		};
	}, [enabled, connect, disconnect]);

	// Update tweets when initialTweets changes (e.g., from router.refresh())
	useEffect(() => {
		setTweets(initialTweets);
	}, [initialTweets]);

	return {
		tweets,
		isConnected,
		reconnect: connect,
		disconnect,
	};
}
